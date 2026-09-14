// 场景：从同一远程源重新拉取当前曲的音源 / 封面 / 歌词，并强制落盘到本地库。
import type { WorkspaceAppHostApi } from "@getagnx/app-sdk";
import { type DemoTrack, useMusicDemoStore } from "../store";
import {
  downloadAndPersistTrackBundle,
  isMusicLocalPersistedUri,
  type MusicDownloadBundleReport,
} from "./download-bundle";
import { isDeferredBrowserProviderId } from "./provider-catalog";
import { fetchMusicLyrics, resolveMusicPlayable } from "./service";
import { lyricsLikelyBelongToTrack } from "./txqq-provider";

export interface RefreshTrackResourcesReport {
  trackId: string;
  playableUpdated: boolean;
  coverUpdated: boolean;
  lyricsUpdated: boolean;
  persistedLocal: boolean;
  message: string;
}

function isStockBrowserProvider(providerId: string | undefined): boolean {
  return isDeferredBrowserProviderId(providerId);
}

function buildMessage(input: {
  audioSaved: boolean;
  coverSaved: boolean;
  lyricsSaved: boolean;
}): string {
  const parts: string[] = [];
  if (input.audioSaved) {
    parts.push("音源");
  }
  if (input.coverSaved) {
    parts.push("封面");
  }
  if (input.lyricsSaved) {
    parts.push("歌词");
  }
  if (parts.length === 0) {
    return "已尝试更新，但未能落盘任何文件";
  }
  return `已更新并保存到本地：${parts.join(" · ")}`;
}

type ResourcePatch = Partial<
  Pick<DemoTrack, "sourceUri" | "sourceKind" | "title" | "artist" | "coverUri" | "lyrics">
>;

async function applyLyricsPatchForRemote(
  track: DemoTrack,
  patch: ResourcePatch,
  providerId: string,
): Promise<boolean> {
  if (isStockBrowserProvider(providerId)) {
    if (!track.lyrics?.trim()) {
      return false;
    }
    // 素材站无歌词：清掉误配歌词，避免落盘脏文件
    patch.lyrics = null;
    return true;
  }
  const lyrics = await fetchMusicLyrics(track.remoteRef!).catch(() => null);
  const text = lyrics?.text?.trim() ?? "";
  const titleForCheck = (patch.title ?? track.title).trim();
  if (text && lyricsLikelyBelongToTrack(text, titleForCheck)) {
    patch.lyrics = text;
    return true;
  }
  // 更新资源必须三件套对齐：拉不到或校验失败就清空旧词，禁止音源已换歌词仍是上一首
  patch.lyrics = null;
  return Boolean(track.lyrics?.trim()) || Boolean(text);
}

async function buildRemoteResourcePatch(track: DemoTrack): Promise<{
  patch: ResourcePatch;
  playableUpdated: boolean;
  coverUpdated: boolean;
  lyricsUpdated: boolean;
}> {
  if (!track.remoteRef) {
    throw new Error("当前曲目没有远程来源，无法同源更新（本地上传请重新导入）");
  }
  const resolved = await resolveMusicPlayable(track.remoteRef);
  if (!resolved?.url?.trim()) {
    throw new Error("未能从源站重新解析到可播地址");
  }
  // 身份锁定：更新资源只换音源/封面/歌词，禁止用解析元数据改写歌名艺人（防串歌）
  if (
    resolved.remoteId &&
    track.remoteRef.remoteId &&
    resolved.remoteId !== track.remoteRef.remoteId
  ) {
    throw new Error("源站返回了另一首歌的资源，已中止更新（请重试或换源）");
  }
  const patch: ResourcePatch = {
    sourceUri: resolved.url.trim(),
    sourceKind: "cloud",
  };
  let coverUpdated = false;
  if (resolved.coverUrl?.trim()) {
    patch.coverUri = resolved.coverUrl.trim();
    coverUpdated = true;
  }
  const lyricsUpdated = await applyLyricsPatchForRemote(track, patch, track.remoteRef.providerId);
  return { patch, playableUpdated: true, coverUpdated, lyricsUpdated };
}

function summarizeBundle(bundle: MusicDownloadBundleReport): {
  audioSaved: boolean;
  coverSaved: boolean;
  lyricsSaved: boolean;
} {
  return {
    audioSaved: isMusicLocalPersistedUri(bundle.sourceUri) && bundle.sourceByteSize > 0,
    coverSaved: isMusicLocalPersistedUri(bundle.coverUri),
    lyricsSaved: isMusicLocalPersistedUri(bundle.lyricsUri) || Boolean(bundle.lyrics?.trim()),
  };
}

/**
 * 同源刷新：**必定**把音源 / 封面 / 歌词（有则）重新下载写入本地库。
 * 仅更新内存 URL 不算完成——更新资源 = 重新拉取并保存。
 */
export async function refreshTrackResourcesAndMaybePersist(
  hostApi: WorkspaceAppHostApi,
  trackId: string,
  _options?: { persistLocal?: boolean },
): Promise<RefreshTrackResourcesReport> {
  const track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error("曲目不存在");
  }

  const built = await buildRemoteResourcePatch(track);
  useMusicDemoStore.getState().updateTrack(trackId, built.patch);

  const latest = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  const bundle = await downloadAndPersistTrackBundle(hostApi, trackId, {
    playableUrl:
      latest?.sourceUri && /^https?:\/\//i.test(latest.sourceUri) ? latest.sourceUri : null,
    force: true,
  });
  const saved = summarizeBundle(bundle);

  return {
    trackId,
    playableUpdated: built.playableUpdated && saved.audioSaved,
    coverUpdated: saved.coverSaved,
    lyricsUpdated: saved.lyricsSaved,
    persistedLocal: true,
    message: buildMessage(saved),
  };
}
