// 场景：播放列表滚动定位算法 — 无动画居中当前曲，边界夹紧。
import { describe, expect, it } from "vitest";
import { resolveQueueScrollOffset } from "./queue-scroll";

describe("resolveQueueScrollOffset", () => {
  it("returns 0 when content fits viewport", () => {
    expect(
      resolveQueueScrollOffset({
        rowY: 100,
        rowHeight: 56,
        viewportHeight: 400,
        contentHeight: 300,
      }),
    ).toBe(0);
  });

  it("centers the active row when possible", () => {
    expect(
      resolveQueueScrollOffset({
        rowY: 500,
        rowHeight: 56,
        viewportHeight: 400,
        contentHeight: 2000,
      }),
    ).toBe(328);
  });

  it("clamps to max scroll near the end", () => {
    expect(
      resolveQueueScrollOffset({
        rowY: 1900,
        rowHeight: 56,
        viewportHeight: 400,
        contentHeight: 2000,
      }),
    ).toBe(1600);
  });

  it("clamps to 0 near the start", () => {
    expect(
      resolveQueueScrollOffset({
        rowY: 10,
        rowHeight: 56,
        viewportHeight: 400,
        contentHeight: 2000,
      }),
    ).toBe(0);
  });
});
