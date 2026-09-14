// 场景：冷启动续播纯决策 — 不碰 Audio，供 runtime 与单测共用。

export function shouldRestoreMusicPlaybackAfterColdStart(state: {
  wantsPlaying: boolean;
  nowPlayingId: string | null;
  tracks: ReadonlyArray<{ id: string; sourceUri?: string | null }>;
}): { trackId: string; sourceUri: string } | null {
  if (!state.wantsPlaying || !state.nowPlayingId) {
    return null;
  }
  const track = state.tracks.find((item) => item.id === state.nowPlayingId);
  const sourceUri = track?.sourceUri?.trim() ?? "";
  if (!sourceUri) {
    return null;
  }
  return { trackId: state.nowPlayingId, sourceUri };
}
