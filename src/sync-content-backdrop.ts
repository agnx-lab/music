// 场景：Music 把当前曲封面推到宿主中间区内容背景 — 不依赖播放器 Tab 是否挂载。
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import { MUSIC_APP_ID } from "./music-ids";
import { resolveMusicCoverBackdropImageUri } from "./resolve-cover-backdrop-uri";
import { useMusicDemoStore } from "./store";

/** 按 store 当前「封面背景」开关与 nowPlaying 同步宿主 content backdrop。 */
export async function syncMusicContentBackdropToHost(
  hostApi: WorkspaceAppHostApi,
  options?: { displayUri?: string | null },
): Promise<void> {
  const sourceId = MUSIC_APP_ID;
  const state = useMusicDemoStore.getState();
  if (!state.coverBackdropEnabled) {
    hostApi.ui.clearContentBackdrop(sourceId);
    return;
  }
  const trackId = state.nowPlayingId;
  const track = trackId ? state.getTrack(trackId) : null;
  if (!track) {
    return;
  }
  const imageUri = await resolveMusicCoverBackdropImageUri({
    hostApi,
    coverUri: track.coverUri,
    displayUri: options?.displayUri,
  });
  if (!imageUri) {
    return;
  }
  // 异步回来时曲目/开关可能已变
  const latest = useMusicDemoStore.getState();
  if (!latest.coverBackdropEnabled || latest.nowPlayingId !== trackId) {
    return;
  }
  const imageOpacity = state.coverBackdropOpacity;
  // 封面越清晰时略减暗罩，避免糊成灰雾；仍保留可读性底。
  const overlayOpacity = Math.min(0.5, Math.max(0.08, 0.48 - imageOpacity * 0.4));
  hostApi.ui.setContentBackdrop({
    sourceId,
    imageUri,
    blurRadius: state.coverBackdropBlur,
    imageOpacity,
    overlayOpacity,
    includeTabBar: state.coverBackdropIncludeTabBar,
    sourceLabel: track.title?.trim() || undefined,
  });
}
