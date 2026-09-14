// 场景：播放进度外部时钟 — 节流后只通知订阅方，避免 MusicPlayer 整树因 timeupdate 重渲染。

import { MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS, shouldCommitPlaybackUiTime } from "./playback-ui-clock";

let timeSec = 0;
let pendingTimeSec = 0;
let lastCommitMs = 0;
let trailingTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getPlaybackUiTime(): number {
  return timeSec;
}

export function subscribePlaybackUiTime(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commitTime(next: number, nowMs: number): void {
  if (trailingTimer) {
    clearTimeout(trailingTimer);
    trailingTimer = null;
  }
  lastCommitMs = nowMs;
  if (timeSec === next) {
    return;
  }
  timeSec = next;
  emit();
}

/**
 * 把 audio 时间发布到 UI 时钟（带 8Hz 节流 + trailing）。
 * force：seek / 切歌 / 显式同步。
 */
export function publishPlaybackUiTime(time: number, force = false): void {
  pendingTimeSec = time;
  const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  const decision = shouldCommitPlaybackUiTime({
    nowMs,
    lastCommitMs,
    force,
    minIntervalMs: MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS,
  });
  if (decision.commit) {
    commitTime(time, nowMs);
    return;
  }
  if (trailingTimer) {
    return;
  }
  trailingTimer = setTimeout(() => {
    trailingTimer = null;
    commitTime(pendingTimeSec, typeof performance !== "undefined" ? performance.now() : Date.now());
  }, MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS);
}

/** 测试/切歌：重置时钟。 */
export function resetPlaybackUiTime(time = 0, notify = true): void {
  pendingTimeSec = time;
  if (trailingTimer) {
    clearTimeout(trailingTimer);
    trailingTimer = null;
  }
  lastCommitMs = 0;
  if (timeSec === time) {
    return;
  }
  timeSec = time;
  if (notify) {
    emit();
  }
}
