// 场景：跨端音频焦点 — 仅互斥出声，不同步播放态。
import { describe, expect, it, beforeEach } from "vitest";
import {
  publishMusicPlaybackFocusClaim,
  resetMusicPlaybackLeaderForTests,
  setLocalPlaybackClientIdForTests,
  shouldHandleRemotePlaybackFocusClaim,
} from "./playback-leader";

describe("shouldHandleRemotePlaybackFocusClaim", () => {
  beforeEach(() => {
    resetMusicPlaybackLeaderForTests();
    setLocalPlaybackClientIdForTests("cid_local");
  });

  it("忽略本端或无 publisher", () => {
    expect(shouldHandleRemotePlaybackFocusClaim("cid_local")).toBe(false);
    expect(shouldHandleRemotePlaybackFocusClaim(undefined)).toBe(false);
    expect(shouldHandleRemotePlaybackFocusClaim("")).toBe(false);
  });

  it("远端 publisher 应触发本端让出", () => {
    expect(shouldHandleRemotePlaybackFocusClaim("cid_other")).toBe(true);
  });
});

describe("publishMusicPlaybackFocusClaim", () => {
  beforeEach(() => {
    resetMusicPlaybackLeaderForTests();
    setLocalPlaybackClientIdForTests("cid_local");
  });

  it("有 clientId 时 publish 焦点频道", async () => {
    const published: Array<{ channel: string; payload?: unknown }> = [];
    await publishMusicPlaybackFocusClaim({
      publish: (input) => {
        published.push({ channel: input.channel, payload: input.payload });
      },
      subscribe: () => () => {},
    });
    expect(published).toHaveLength(1);
    expect(published[0]?.channel).toBe("music-playback-focus");
    expect(published[0]?.payload).toEqual({ clientId: "cid_local" });
  });

  it("无 clientId 时不 publish", async () => {
    setLocalPlaybackClientIdForTests(null);
    let count = 0;
    await publishMusicPlaybackFocusClaim({
      publish: () => {
        count += 1;
      },
      subscribe: () => () => {},
    });
    expect(count).toBe(0);
  });
});
