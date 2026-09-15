// 场景：跨模块请求「下一拍自动 play」（侧栏删歌后切下一首等）；打开播放器是否强制起播。
let pendingAutoPlayTrackId: string | null = null;

export function requestTrackAutoPlay(trackId: string): void {
  const normalized = trackId.trim();
  pendingAutoPlayTrackId = normalized.length > 0 ? normalized : null;
}

export function clearPendingTrackAutoPlay(): void {
  pendingAutoPlayTrackId = null;
}

export function takePendingAutoPlayTrackId(expectedTrackId: string): boolean {
  if (!pendingAutoPlayTrackId || pendingAutoPlayTrackId !== expectedTrackId) {
    return false;
  }
  pendingAutoPlayTrackId = null;
  return true;
}

export function peekPendingAutoPlayTrackId(): string | null {
  return pendingAutoPlayTrackId;
}

/** 纯打开播放器不强制起播；仅明确点播或当前本就要播时才挂 autoplay。 */
export function shouldRequestAutoPlayOnOpenPlayer(input: {
  explicitAutoPlay?: boolean;
  wantsPlaying: boolean;
}): boolean {
  return input.explicitAutoPlay === true || Boolean(input.wantsPlaying);
}

/**
 * 同曲重挂载/ hard-load 前的恢复进度：取 store 与单例 currentTime 的较大值。
 * 切曲或 nowPlaying 不匹配时归零。
 */
export function resolveMusicResumePositionSec(input: {
  switchingTrack: boolean;
  nowPlayingMatches: boolean;
  storePositionSec: number;
  audioCurrentTimeSec: number;
}): number {
  if (input.switchingTrack || !input.nowPlayingMatches) {
    return 0;
  }
  const storeSec =
    typeof input.storePositionSec === "number" && Number.isFinite(input.storePositionSec)
      ? Math.max(0, Math.floor(input.storePositionSec))
      : 0;
  const liveSec =
    typeof input.audioCurrentTimeSec === "number" && Number.isFinite(input.audioCurrentTimeSec)
      ? Math.max(0, Math.floor(input.audioCurrentTimeSec))
      : 0;
  return Math.max(storeSec, liveSec);
}
