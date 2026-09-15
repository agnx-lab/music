// 场景：播放会话同步快照 — 同曲合并进度/意图；硬刷新可读 localStorage。
import { describe, expect, it } from "vitest";
import {
  buildMusicPlaybackSessionSnapshot,
  normalizeMusicPlaybackSessionSnapshot,
  resolveMusicPlaybackSessionMerge,
  resolveMusicPlaybackSessionWrite,
} from "./playback-session";

describe("buildMusicPlaybackSessionSnapshot", () => {
  it("takes the larger of store and live audio time", () => {
    expect(
      buildMusicPlaybackSessionSnapshot({
        nowPlayingId: "t1",
        wantsPlaying: true,
        playbackPositionSec: 40,
        audioCurrentTimeSec: 95.8,
        updatedAt: 1000,
      }),
    ).toEqual({
      nowPlayingId: "t1",
      wantsPlaying: true,
      playbackPositionSec: 95,
      updatedAt: 1000,
    });
  });
});

describe("normalizeMusicPlaybackSessionSnapshot", () => {
  it("rejects missing updatedAt", () => {
    expect(
      normalizeMusicPlaybackSessionSnapshot({
        nowPlayingId: "t1",
        wantsPlaying: true,
        playbackPositionSec: 10,
      }),
    ).toBeNull();
  });

  it("floors position", () => {
    expect(
      normalizeMusicPlaybackSessionSnapshot({
        nowPlayingId: "t1",
        wantsPlaying: false,
        playbackPositionSec: 12.9,
        updatedAt: 9,
      }),
    ).toEqual({
      nowPlayingId: "t1",
      wantsPlaying: false,
      playbackPositionSec: 12,
      updatedAt: 9,
    });
  });
});

describe("resolveMusicPlaybackSessionMerge", () => {
  it("does not apply when snapshot track differs from store", () => {
    expect(
      resolveMusicPlaybackSessionMerge({
        storeNowPlayingId: "t1",
        storeWantsPlaying: false,
        storePlaybackPositionSec: 10,
        snapshot: {
          nowPlayingId: "t2",
          wantsPlaying: true,
          playbackPositionSec: 99,
          updatedAt: 1,
        },
      }),
    ).toEqual({
      apply: false,
      playbackPositionSec: 10,
      wantsPlaying: false,
    });
  });

  it("merges higher progress and snapshot wantsPlaying on same track", () => {
    expect(
      resolveMusicPlaybackSessionMerge({
        storeNowPlayingId: "t1",
        storeWantsPlaying: true,
        storePlaybackPositionSec: 0,
        snapshot: {
          nowPlayingId: "t1",
          wantsPlaying: true,
          playbackPositionSec: 128,
          updatedAt: 2,
        },
      }),
    ).toEqual({
      apply: true,
      playbackPositionSec: 128,
      wantsPlaying: true,
    });
  });

  it("restores paused intent from snapshot even when store still wantsPlaying", () => {
    expect(
      resolveMusicPlaybackSessionMerge({
        storeNowPlayingId: "t1",
        storeWantsPlaying: true,
        storePlaybackPositionSec: 50,
        snapshot: {
          nowPlayingId: "t1",
          wantsPlaying: false,
          playbackPositionSec: 50,
          updatedAt: 3,
        },
      }),
    ).toEqual({
      apply: true,
      playbackPositionSec: 50,
      wantsPlaying: false,
    });
  });
});

describe("resolveMusicPlaybackSessionWrite", () => {
  it("skips write when nowPlayingId is empty (do not clobber)", () => {
    expect(
      resolveMusicPlaybackSessionWrite({
        nowPlayingId: null,
        wantsPlaying: false,
        playbackPositionSec: 0,
        existing: {
          nowPlayingId: "t1",
          wantsPlaying: true,
          playbackPositionSec: 40,
          updatedAt: 1,
        },
        updatedAt: 2,
      }),
    ).toBeNull();
  });

  it("does not downgrade position on same track", () => {
    expect(
      resolveMusicPlaybackSessionWrite({
        nowPlayingId: "t1",
        wantsPlaying: true,
        playbackPositionSec: 0,
        livePlaying: false,
        existing: {
          nowPlayingId: "t1",
          wantsPlaying: true,
          playbackPositionSec: 88,
          updatedAt: 1,
        },
        updatedAt: 2,
      }),
    ).toEqual({
      nowPlayingId: "t1",
      wantsPlaying: true,
      playbackPositionSec: 88,
      updatedAt: 2,
    });
  });

  it("keeps paused intent when progress is real", () => {
    expect(
      resolveMusicPlaybackSessionWrite({
        nowPlayingId: "t1",
        wantsPlaying: false,
        playbackPositionSec: 50,
        livePlaying: false,
        existing: {
          nowPlayingId: "t1",
          wantsPlaying: true,
          playbackPositionSec: 40,
          updatedAt: 1,
        },
        updatedAt: 2,
      }),
    ).toEqual({
      nowPlayingId: "t1",
      wantsPlaying: false,
      playbackPositionSec: 50,
      updatedAt: 2,
    });
  });
});
