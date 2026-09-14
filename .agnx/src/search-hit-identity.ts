// 场景：搜索命中与曲库条目身份匹配（下载重试去重、跨源同歌合并）。
import type { RemoteRef, SearchHitTrack } from "./resource/types";

export interface SearchHitIdentityTrack {
  id: string;
  title: string;
  artist: string;
  remoteRef?: RemoteRef | null;
}

function normalizeRemotePageUrl(pageUrl?: string | null): string {
  const raw = pageUrl?.trim() ?? "";
  if (!raw) {
    return "";
  }
  try {
    const url = new URL(raw);
    // 网易云等 hash 路由：真正的曲目 id 在 hash（如 #/song?id=123），清空 hash 会让所有歌变成同一 URL
    const hash = url.hash.replace(/^#/, "").trim();
    if (hash) {
      const pathAndQuery = `${url.origin}${url.pathname}${url.search}`.replace(/\/$/, "");
      return `${pathAndQuery}#${hash}`;
    }
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

/** 艺人占位视为空，避免「未知」阻断同歌去重。 */
export function normalizeArtistIdentityKey(artist: string | null | undefined): string {
  const raw = (artist ?? "").trim().toLowerCase();
  if (
    !raw ||
    raw === "未知" ||
    raw === "未知艺人" ||
    raw === "unknown" ||
    raw === "unknown artist"
  ) {
    return "";
  }
  return raw;
}

export function sameRemoteRef(left?: RemoteRef | null, right?: RemoteRef | null): boolean {
  if (!left || !right) {
    return false;
  }
  if (left.providerId !== right.providerId) {
    return false;
  }
  const leftId = left.remoteId?.trim() ?? "";
  const rightId = right.remoteId?.trim() ?? "";
  if (leftId && rightId && leftId === rightId) {
    return true;
  }
  // remoteId 都缺时才比 pageUrl；有任一 remoteId 时禁止用 pageUrl 兜底（避免误并）
  if (leftId || rightId) {
    return false;
  }
  const leftPage = normalizeRemotePageUrl(left.pageUrl);
  const rightPage = normalizeRemotePageUrl(right.pageUrl);
  return Boolean(leftPage && rightPage && leftPage === rightPage);
}

function sameRemotePageUrlLoose(left?: RemoteRef | null, right?: RemoteRef | null): boolean {
  if (!left || !right || left.providerId !== right.providerId) {
    return false;
  }
  const leftPage = normalizeRemotePageUrl(left.pageUrl);
  const rightPage = normalizeRemotePageUrl(right.pageUrl);
  return Boolean(leftPage && rightPage && leftPage === rightPage);
}

/**
 * 爱听镜像 remoteId 形如 `6uq:abc` / `78497:abc`：镜前缀不同但 songId 相同视为同一首。
 */
function sameAiguoMirrorSongId(left?: RemoteRef | null, right?: RemoteRef | null): boolean {
  if (!left || !right) {
    return false;
  }
  if (left.providerId !== "aiguo" || right.providerId !== "aiguo") {
    return false;
  }
  const leftSong = left.remoteId?.includes(":")
    ? left.remoteId.slice(left.remoteId.indexOf(":") + 1).trim()
    : "";
  const rightSong = right.remoteId?.includes(":")
    ? right.remoteId.slice(right.remoteId.indexOf(":") + 1).trim()
    : "";
  return Boolean(leftSong && rightSong && leftSong === rightSong);
}

function sameTitleArtistIdentity(
  track: SearchHitIdentityTrack,
  hit: SearchHitTrack,
  options?: { allowCrossProvider?: boolean },
): boolean {
  const title = hit.title.trim().toLowerCase();
  if (!title || track.title.trim().toLowerCase() !== title) {
    return false;
  }
  const hitArtist = normalizeArtistIdentityKey(hit.artist);
  const trackArtist = normalizeArtistIdentityKey(track.artist);
  // 艺人都空：只在同 provider（或曲库尚无 remoteRef）时靠歌名合并，降低误并
  if (!hitArtist || !trackArtist) {
    if (hitArtist !== trackArtist) {
      return false;
    }
    const trackProvider = track.remoteRef?.providerId;
    if (!trackProvider) {
      return true;
    }
    return trackProvider === hit.ref.providerId;
  }
  if (hitArtist !== trackArtist) {
    return false;
  }
  const trackProvider = track.remoteRef?.providerId;
  if (!trackProvider) {
    return true;
  }
  if (options?.allowCrossProvider !== false) {
    // 多源搜索同一首歌（网易/酷狗…）侧栏只显示歌名艺人，下载失败再点应更新而非再建
    return true;
  }
  return trackProvider === hit.ref.providerId;
}

/** 搜索命中 ↔ 曲库条目是否同一首歌（用于 upsert / 下载重试去重）。 */
export function sameSearchHitIdentity(track: SearchHitIdentityTrack, hit: SearchHitTrack): boolean {
  if (sameRemoteRef(track.remoteRef, hit.ref)) {
    return true;
  }
  if (hit.localTrackId != null && track.id === hit.localTrackId) {
    return true;
  }
  if (sameAiguoMirrorSongId(track.remoteRef, hit.ref)) {
    return true;
  }
  if (sameRemotePageUrlLoose(track.remoteRef, hit.ref)) {
    return true;
  }
  return sameTitleArtistIdentity(track, hit, { allowCrossProvider: true });
}

/** 「已下载」角标：允许与 upsert 同一套身份，避免重试时角标漏标又再建条目。 */
export function sameSearchHitForDownloadBadge(
  track: SearchHitIdentityTrack,
  hit: SearchHitTrack,
): boolean {
  return sameSearchHitIdentity(track, hit);
}
