// 场景：冷启动续播决策 — wantsPlaying + nowPlaying + sourceUri 才 headless 起播。
import { describe, expect, it } from "vitest";
import { shouldRestoreMusicPlaybackAfterColdStart } from "./playback-cold-restore";

describe("shouldRestoreMusicPlaybackAfterColdStart", () => {
  it("returns null when not wantsPlaying", () => {
    expect(
      shouldRestoreMusicPlaybackAfterColdStart({
        wantsPlaying: false,
        nowPlayingId: "t1",
        tracks: [{ id: "t1", sourceUri: "https://example.com/a.mp3" }],
      }),
    ).toBeNull();
  });

  it("returns null without nowPlaying or source", () => {
    expect(
      shouldRestoreMusicPlaybackAfterColdStart({
        wantsPlaying: true,
        nowPlayingId: null,
        tracks: [{ id: "t1", sourceUri: "https://example.com/a.mp3" }],
      }),
    ).toBeNull();
    expect(
      shouldRestoreMusicPlaybackAfterColdStart({
        wantsPlaying: true,
        nowPlayingId: "t1",
        tracks: [{ id: "t1", sourceUri: "  " }],
      }),
    ).toBeNull();
  });

  it("returns target when wantsPlaying and track has uri", () => {
    expect(
      shouldRestoreMusicPlaybackAfterColdStart({
        wantsPlaying: true,
        nowPlayingId: "t1",
        tracks: [{ id: "t1", sourceUri: "https://example.com/a.mp3" }],
      }),
    ).toEqual({
      trackId: "t1",
      sourceUri: "https://example.com/a.mp3",
    });
  });
});
