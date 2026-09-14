// 场景：跨模块请求「下一拍自动 play」（侧栏删歌后切下一首等）。
let pendingAutoPlayTrackId: string | null = null;

export function requestTrackAutoPlay(trackId: string): void {
  const normalized = trackId.trim();
  pendingAutoPlayTrackId = normalized.length > 0 ? normalized : null;
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
