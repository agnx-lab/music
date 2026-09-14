// 场景：karaoke 预计算 clip 缓存 — 无 DOM 环境下校验档位数与端点约定。
import { describe, expect, it } from "vitest";
import { KARAOKE_CLIP_STEPS } from "./music-lyrics-karaoke";

describe("karaoke precompute contract", () => {
  it("uses fixed step count for play-time O(1) lookup", () => {
    expect(KARAOKE_CLIP_STEPS).toBe(12);
    // 播放热路径：step ∈ [0, STEPS]，缓存长度 STEPS+1
    const cacheLen = KARAOKE_CLIP_STEPS + 1;
    expect(cacheLen).toBe(13);
    const step = Math.round(0.5 * KARAOKE_CLIP_STEPS);
    expect(step).toBe(6);
  });
});
