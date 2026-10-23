// 场景：播放进度外部时钟单测 — 节流发布与订阅隔离。

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  getPlaybackUiTime,
  publishPlaybackUiTime,
  resetPlaybackUiTime,
  subscribePlaybackUiTime,
} from "./playback-ui-time-store";
import { MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS } from "./playback-ui-clock";

describe("playback-ui-time-store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPlaybackUiTime(0, false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throttles publishes and notifies listeners", () => {
    const spy = vi.fn();
    const unsub = subscribePlaybackUiTime(spy);
    publishPlaybackUiTime(1, true);
    expect(getPlaybackUiTime()).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);

    publishPlaybackUiTime(1.05);
    expect(getPlaybackUiTime()).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);

    // 清掉 trailing，再前进时间后应能直接按 interval 提交
    vi.advanceTimersByTime(MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS);
    expect(getPlaybackUiTime()).toBe(1.05);
    expect(spy).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS + 5);
    publishPlaybackUiTime(1.4);
    expect(getPlaybackUiTime()).toBe(1.4);
    expect(spy).toHaveBeenCalledTimes(3);
    unsub();
  });

  it("trailing flush commits latest pending time", () => {
    const spy = vi.fn();
    subscribePlaybackUiTime(spy);
    publishPlaybackUiTime(2, true);
    spy.mockClear();

    publishPlaybackUiTime(2.01);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS);
    expect(getPlaybackUiTime()).toBe(2.01);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
