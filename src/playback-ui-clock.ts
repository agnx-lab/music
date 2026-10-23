// 场景：播放进度 UI 提交节流 — timeupdate 很密，禁止每次都打进 React 整树重渲染。

/** UI 时钟 / 进度条 / 歌词进度：约 5Hz。跟唱够用，比 8Hz 更省 renderer。 */
export const MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS = 200;

export type PlaybackUiTimeCommitDecision =
  | { commit: false }
  | { commit: true; reason: "interval" | "force" | "trailing" };

/**
 * 决定是否把 audio 时间提交到 React state。
 * - force：seek / 切歌 / 显式同步，立即提交
 * - 否则距上次提交不足间隔则跳过（由调用方安排 trailing）
 */
export function shouldCommitPlaybackUiTime(input: {
  nowMs: number;
  lastCommitMs: number;
  force?: boolean;
  minIntervalMs?: number;
}): PlaybackUiTimeCommitDecision {
  if (input.force) {
    return { commit: true, reason: "force" };
  }
  const minInterval = input.minIntervalMs ?? MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS;
  if (input.nowMs - input.lastCommitMs >= minInterval) {
    return { commit: true, reason: "interval" };
  }
  return { commit: false };
}
