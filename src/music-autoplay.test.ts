// 场景：打开播放器是否强制 autoplay；同曲恢复进度取 store 与 audio 较大值。
import { afterEach, describe, expect, it } from "vitest";
import {
  clearPendingTrackAutoPlay,
  peekPendingAutoPlayTrackId,
  requestTrackAutoPlay,
  resolveMusicResumePositionSec,
  shouldRequestAutoPlayOnOpenPlayer,
  takePendingAutoPlayTrackId,
} from "./music-autoplay";

describe("shouldRequestAutoPlayOnOpenPlayer", () => {
  it("does not force play when merely opening the player while paused", () => {
    expect(
      shouldRequestAutoPlayOnOpenPlayer({
        wantsPlaying: false,
      }),
    ).toBe(false);
  });

  it("requests autoplay when wantsPlaying is still true", () => {
    expect(
      shouldRequestAutoPlayOnOpenPlayer({
        wantsPlaying: true,
      }),
    ).toBe(true);
  });

  it("requests autoplay on explicit play intent (upload / list item)", () => {
    expect(
      shouldRequestAutoPlayOnOpenPlayer({
        explicitAutoPlay: true,
        wantsPlaying: false,
      }),
    ).toBe(true);
  });
});

describe("resolveMusicResumePositionSec", () => {
  it("returns 0 when switching tracks", () => {
    expect(
      resolveMusicResumePositionSec({
        switchingTrack: true,
        nowPlayingMatches: true,
        storePositionSec: 120,
        audioCurrentTimeSec: 130,
      }),
    ).toBe(0);
  });

  it("prefers the larger of store and live audio time on same-track remount", () => {
    expect(
      resolveMusicResumePositionSec({
        switchingTrack: false,
        nowPlayingMatches: true,
        storePositionSec: 40,
        audioCurrentTimeSec: 95.8,
      }),
    ).toBe(95);
  });

  it("keeps store progress when audio was already zeroed before seek", () => {
    expect(
      resolveMusicResumePositionSec({
        switchingTrack: false,
        nowPlayingMatches: true,
        storePositionSec: 128,
        audioCurrentTimeSec: 0,
      }),
    ).toBe(128);
  });
});

describe("pending autoplay clear", () => {
  afterEach(() => {
    clearPendingTrackAutoPlay();
  });

  it("clears a stale pending flag so reopen-while-paused does not autoplay", () => {
    requestTrackAutoPlay("t1");
    expect(peekPendingAutoPlayTrackId()).toBe("t1");
    clearPendingTrackAutoPlay();
    expect(takePendingAutoPlayTrackId("t1")).toBe(false);
  });
});
