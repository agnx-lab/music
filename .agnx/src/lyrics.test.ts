// 场景：LRC 解析 — 过滤「没有填词」等占位行；同戳双语行收组成组。
import { describe, expect, it } from "vitest";
import {
  groupLyricUnits,
  lyricLineProgress,
  lyricLitCharCount,
  parseLyrics,
  quantizeLyricProgress,
} from "./lyrics";

describe("parseLyrics", () => {
  it("filters instrumental / no-lyrics placeholder lines", () => {
    expect(parseLyrics("[00:00.00]此歌曲为没有填词的纯音乐")).toEqual([]);
    expect(parseLyrics("[00:00.00]此歌曲为没有填词的")).toEqual([]);
    expect(parseLyrics("[00:00.00]纯音乐")).toEqual([]);
    expect(parseLyrics("[00:00.00]Instrumental")).toEqual([]);
  });

  it("keeps real lyric lines and drops only placeholders", () => {
    expect(
      parseLyrics("[00:00.00]此歌曲为没有填词的\n[00:12.00]第一句歌词\n[00:20.00]第二句"),
    ).toEqual([
      { timeSec: 12, text: "第一句歌词" },
      { timeSec: 20, text: "第二句" },
    ]);
  });

  it("strips trailing end-time tags from lyric body", () => {
    expect(parseLyrics("[01:16.31]那画面太美我不敢看[01:20.80]")).toEqual([
      { timeSec: 76.31, text: "那画面太美我不敢看" },
    ]);
  });

  it("strips enhanced LRC word-level timestamps inside the line", () => {
    expect(
      parseLyrics(
        "[01:23.00]Glory [01:23.61]yeah\n[01:28.00]The [01:28.17]most [01:28.50]amazing [01:29.04]feeling",
      ),
    ).toEqual([
      { timeSec: 83, text: "Glory yeah" },
      { timeSec: 88, text: "The most amazing feeling" },
    ]);
  });
});

describe("groupLyricUnits", () => {
  it("keeps monolingual lines as single-text units", () => {
    expect(
      groupLyricUnits([
        { timeSec: 12, text: "hello" },
        { timeSec: 17, text: "world" },
      ]),
    ).toEqual([
      { timeSec: 12, texts: ["hello"] },
      { timeSec: 17, texts: ["world"] },
    ]);
  });

  it("merges same-timestamp bilingual pairs into one unit", () => {
    expect(
      groupLyricUnits([
        { timeSec: 12.03, text: "I am not code" },
        { timeSec: 12.03, text: "我不是代码" },
        { timeSec: 17.4, text: "I have a name" },
        { timeSec: 17.4, text: "我有名字" },
      ]),
    ).toEqual([
      { timeSec: 12.03, texts: ["I am not code", "我不是代码"] },
      { timeSec: 17.4, texts: ["I have a name", "我有名字"] },
    ]);
  });

  it("merges near-identical timestamps within epsilon", () => {
    expect(
      groupLyricUnits([
        { timeSec: 12.0, text: "en" },
        { timeSec: 12.03, text: "中" },
      ]),
    ).toEqual([{ timeSec: 12.0, texts: ["en", "中"] }]);
  });
});

describe("lyricLineProgress", () => {
  const lines = [
    { timeSec: 0, text: "一二三四" },
    { timeSec: 4, text: "五六七八" },
  ];

  it("returns 0 at line start", () => {
    expect(lyricLineProgress(lines, 0, 0)).toBe(0);
  });

  it("finishes karaoke before the next line timestamp", () => {
    // 行窗 4s，78% 处应已全亮，换行发生在 4s
    expect(lyricLineProgress(lines, 0, 4 * 0.78)).toBe(1);
    expect(lyricLineProgress(lines, 0, 3.5)).toBe(1);
  });

  it("interpolates within the karaoke span", () => {
    expect(lyricLineProgress(lines, 0, 4 * 0.39)).toBeCloseTo(0.5, 5);
  });

  it("uses next bilingual unit start as end (not the paired translation)", () => {
    const units = groupLyricUnits([
      { timeSec: 0, text: "hello world" },
      { timeSec: 0, text: "你好世界" },
      { timeSec: 4, text: "next" },
      { timeSec: 4, text: "下一句" },
    ]);
    expect(lyricLineProgress(units, 0, 4 * 0.39)).toBeCloseTo(0.5, 5);
    expect(lyricLineProgress(units, 0, 4 * 0.78)).toBe(1);
  });
});

describe("lyricLitCharCount", () => {
  it("lights all characters when progress is complete", () => {
    expect(lyricLitCharCount("一二三四", 1)).toBe(4);
  });

  it("uses ceil so the last glyph can light before line switch", () => {
    expect(lyricLitCharCount("一二三四", 0.9)).toBe(4);
    expect(lyricLitCharCount("一二三四", 0.1)).toBe(1);
  });
});

describe("quantizeLyricProgress", () => {
  it("clamps and steps", () => {
    expect(quantizeLyricProgress(-1, 24)).toBe(0);
    expect(quantizeLyricProgress(2, 24)).toBe(1);
    expect(quantizeLyricProgress(0.5, 24)).toBeCloseTo(0.5, 5);
    expect(quantizeLyricProgress(0.51, 10)).toBe(0.5);
    expect(quantizeLyricProgress(0.56, 10)).toBe(0.6);
  });
});
