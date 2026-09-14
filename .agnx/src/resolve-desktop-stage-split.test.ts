// 场景：桌面封面/歌词分栏决策单测。
import { describe, expect, it } from "vitest";
import {
  DESKTOP_COVER_COLUMN_PX,
  estimateLyricContentWidthPx,
  maxLyricContentWidthPx,
  resolveDesktopStageSplit,
} from "./resolve-desktop-stage-split";

describe("resolveDesktopStageSplit", () => {
  it("keeps fixed cover when lyric lines are wide", () => {
    const wide = estimateLyricContentWidthPx(
      "这是一句非常非常长的中文歌词用来占满右侧栏位而且还要再加一段才算够宽再加更多字",
      24,
    );
    const split = resolveDesktopStageSplit({
      stageWidthPx: 900,
      maxLyricContentWidthPx: wide,
    });
    expect(split.mode).toBe("fixed-cover");
    expect(split.coverWidthPx).toBeLessThanOrEqual(DESKTOP_COVER_COLUMN_PX);
    expect(split.lyricsWidthPx).toBeGreaterThan(split.coverWidthPx);
  });

  it("uses exact 1:2 pixel widths when lyric lines are narrow", () => {
    const narrow = estimateLyricContentWidthPx("Just hollow light", 18);
    const split = resolveDesktopStageSplit({
      stageWidthPx: 1216,
      maxLyricContentWidthPx: narrow,
      stageGapPx: 16,
    });
    expect(split.mode).toBe("ratio-1-2");
    expect(split.coverWidthPx + split.lyricsWidthPx).toBe(1200);
    expect(split.lyricsWidthPx).toBe(split.coverWidthPx * 2);
  });

  it("maxLyricContentWidthPx takes the longest unit text", () => {
    expect(
      maxLyricContentWidthPx([{ texts: ["hi"] }, { texts: ["Just hollow light", "短"] }], 18),
    ).toBe(estimateLyricContentWidthPx("Just hollow light", 18));
  });
});
