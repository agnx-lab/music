// 场景：可播验证 — 候选挑选与 resolver 过滤单测。
import { describe, expect, it, vi } from "vitest";
import { pickPlayableVerifyCandidates, verifyPlayableTracks } from "./playable-filter";
import type { SearchHitTrack } from "./types";

function track(providerId: string, remoteId: string, title: string): SearchHitTrack {
  return {
    kind: "track",
    ref: { providerId, remoteId },
    title,
    artist: "测试",
  };
}

describe("playable-filter", () => {
  it("interleaves platforms when picking candidates", () => {
    const tracks = [
      track("netease", "1", "a"),
      track("netease", "2", "b"),
      track("qq", "3", "c"),
      track("kugou", "4", "d"),
    ];
    const picked = pickPlayableVerifyCandidates(tracks);
    expect(picked.map((item) => item.ref.providerId).slice(0, 3)).toEqual([
      "netease",
      "qq",
      "kugou",
    ]);
  });

  it("drops unplayable hits and attaches playableUrl", async () => {
    const resolve = vi.fn(async (ref: { providerId: string; remoteId: string }) => {
      if (ref.remoteId === "ok") {
        return { url: "https://cdn.example.com/ok.mp3" };
      }
      return null;
    });
    const { verified, candidateCount } = await verifyPlayableTracks(
      [track("qq", "ok", "可播"), track("qq", "bad", "不可播")],
      resolve,
    );
    expect(candidateCount).toBe(2);
    expect(verified).toHaveLength(1);
    expect(verified[0]?.playableUrl).toBe("https://cdn.example.com/ok.mp3");
  });
});
