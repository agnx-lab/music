// 场景：播放进度 UI 节流决策单测。
import { describe, expect, it } from "vitest";
import { shouldCommitPlaybackUiTime } from "./playback-ui-clock";

describe("shouldCommitPlaybackUiTime", () => {
  it("always commits when force", () => {
    expect(
      shouldCommitPlaybackUiTime({ nowMs: 10, lastCommitMs: 9, force: true, minIntervalMs: 125 }),
    ).toEqual({ commit: true, reason: "force" });
  });

  it("skips within interval and commits after", () => {
    expect(shouldCommitPlaybackUiTime({ nowMs: 100, lastCommitMs: 0, minIntervalMs: 125 })).toEqual(
      { commit: false },
    );
    expect(shouldCommitPlaybackUiTime({ nowMs: 130, lastCommitMs: 0, minIntervalMs: 125 })).toEqual(
      { commit: true, reason: "interval" },
    );
  });
});
