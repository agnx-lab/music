// 场景：listCollection 共用辅助 — 派生 ID 解析、艺人/专辑过滤、按名搜索拉合集。
/* oxlint-disable eslint(complexity) -- name-search 合集多页累加 */
import type {
  CollectionKind,
  ListCollectionPage,
  ListCollectionQuery,
  MusicResourceProvider,
  SearchHitTrack,
} from "./types";

/** 从 artist:Name / album:Title 解析展示名；否则用 query.title。 */
export function resolveCollectionListTitle(query: ListCollectionQuery): string {
  const explicit = query.title?.trim() ?? "";
  if (explicit) {
    return explicit;
  }
  const remoteId = query.ref.remoteId?.trim() ?? "";
  if (remoteId.startsWith("artist:")) {
    return remoteId.slice("artist:".length).trim();
  }
  if (remoteId.startsWith("album:")) {
    return remoteId.slice("album:".length).trim();
  }
  return remoteId;
}

export function isDerivedCollectionRemoteId(remoteId: string): boolean {
  return remoteId.startsWith("artist:") || remoteId.startsWith("album:");
}

/** 按合集 kind + 标题过滤曲目；艺人/专辑要求字段精确匹配（大小写不敏感）。 */
export function filterTracksForListCollection(
  tracks: readonly SearchHitTrack[],
  kind: CollectionKind,
  title: string,
): SearchHitTrack[] {
  const needle = title.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  if (kind === "artist") {
    return tracks.filter((track) => track.artist.trim().toLowerCase() === needle);
  }
  if (kind === "album") {
    return tracks.filter((track) => (track.album ?? "").trim().toLowerCase() === needle);
  }
  // 歌单无法从扁平搜索可靠还原从属关系
  return [];
}

/**
 * 名称型 listCollection 的宽松匹配：
 * - 艺人：artist 相等/包含，或 title 以「艺人 - 」开头
 * - 专辑：album 字段相等
 */
export function matchTracksForListCollection(
  tracks: readonly SearchHitTrack[],
  kind: CollectionKind,
  title: string,
): SearchHitTrack[] {
  const exact = filterTracksForListCollection(tracks, kind, title);
  if (exact.length > 0 || kind !== "artist") {
    return exact;
  }
  const needle = title.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return tracks.filter((track) => {
    const artist = track.artist.trim().toLowerCase();
    if (artist === needle || artist.includes(needle)) {
      return true;
    }
    const trackTitle = track.title.trim().toLowerCase();
    return trackTitle.startsWith(`${needle} -`) || trackTitle.startsWith(`${needle}-`);
  });
}

/**
 * 名称型 listCollection 通用实现：对该 provider 按 title 搜索若干页再过滤。
 * 适用于无独立合集 API 的源（txqq / aiguo / muzvox / audiocom / local）。
 */
export async function listCollectionByNameSearch(
  provider: Pick<MusicResourceProvider, "id" | "search">,
  query: ListCollectionQuery,
  options?: {
    maxPages?: number;
    pageLimit?: number;
    kinds?: readonly CollectionKind[];
  },
): Promise<ListCollectionPage | null> {
  const kinds = options?.kinds ?? (["artist", "album"] as const);
  if (!kinds.includes(query.kind)) {
    return null;
  }
  const title = resolveCollectionListTitle(query);
  if (!title) {
    return null;
  }
  const maxPages = Math.max(1, Math.min(options?.maxPages ?? 2, 5));
  const pageLimit = Math.max(8, Math.min(options?.pageLimit ?? 40, 80));
  const startPage = Math.max(1, Math.floor(query.page ?? 1));
  const collected: SearchHitTrack[] = [];
  const seen = new Set<string>();
  let hasMore = false;

  for (let offset = 0; offset < maxPages; offset += 1) {
    const pageNum = startPage + offset;
    let providerIds: string[] | undefined;
    if (provider.id === "txqq") {
      const sourceId = query.ref.providerId?.trim() ?? "";
      if (
        sourceId &&
        sourceId !== "txqq" &&
        sourceId !== "local" &&
        !sourceId.startsWith("artist:") &&
        !sourceId.startsWith("album:")
      ) {
        providerIds = [sourceId];
      }
    } else {
      providerIds = [provider.id];
    }
    const searchPage = await provider.search({
      text: title,
      scope: "track",
      limit: pageLimit,
      page: pageNum,
      providerIds,
    });
    for (const track of searchPage.tracks) {
      const key = `${track.ref.providerId}:${track.ref.remoteId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      collected.push(track);
    }
    hasMore = Boolean(searchPage.hasMore);
    if (!searchPage.hasMore || searchPage.tracks.length === 0) {
      break;
    }
  }

  let tracks = matchTracksForListCollection(collected, query.kind, title);
  if (tracks.length === 0 && query.kind === "artist" && collected.length > 0) {
    tracks = collected;
  }
  if (tracks.length === 0) {
    return null;
  }
  return {
    kind: query.kind,
    ref: {
      providerId: query.ref.providerId || provider.id,
      remoteId: query.ref.remoteId || `${query.kind}:${title}`,
    },
    title,
    tracks,
    page: startPage,
    hasMore,
  };
}
