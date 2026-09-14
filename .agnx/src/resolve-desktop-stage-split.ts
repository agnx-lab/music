// 场景：桌面播放器封面/歌词分栏 — 歌词宽时钉死封面列，窄时精确 1:2 像素宽。
/** 与历史 heroColumn 固定宽一致；宽歌词时不低于此 */
export const DESKTOP_COVER_COLUMN_PX = 320;

export type DesktopStageSplitMode = "fixed-cover" | "ratio-1-2";

export interface DesktopStageSplit {
  mode: DesktopStageSplitMode;
  coverWidthPx: number;
  lyricsWidthPx: number;
}

/**
 * 估算一行歌词内容宽（不必精确到像素；用于分栏决策）。
 * CJK 按 1em，其余按 ~0.55em。
 */
export function estimateLyricContentWidthPx(text: string, fontSizePx: number): number {
  const size = Math.max(1, fontSizePx);
  let width = 0;
  for (const ch of Array.from(text)) {
    if (/[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/.test(ch)) {
      width += size;
    } else if (/\s/.test(ch)) {
      width += size * 0.35;
    } else {
      width += size * 0.55;
    }
  }
  return width;
}

export function maxLyricContentWidthPx(
  units: ReadonlyArray<{ texts: readonly string[] }>,
  fontSizePx: number,
): number {
  let max = 0;
  for (const unit of units) {
    for (const text of unit.texts) {
      max = Math.max(max, estimateLyricContentWidthPx(text, fontSizePx));
    }
  }
  return max;
}

/**
 * 歌词偏宽：封面钉 DESKTOP_COVER_COLUMN_PX，余量全给歌词。
 * 歌词偏窄：封面:歌词 = 1:2（按舞台像素宽精确分配，避免 flex 被其它样式冲掉）。
 */
export function resolveDesktopStageSplit(input: {
  stageWidthPx: number;
  maxLyricContentWidthPx: number;
  /** 歌词栏左右 padding + 分割线等 */
  lyricsChromePadPx?: number;
  /** 舞台 gap（stageDesktop 列间距） */
  stageGapPx?: number;
}): DesktopStageSplit {
  const stage = Math.max(0, input.stageWidthPx);
  const pad = input.lyricsChromePadPx ?? 48;
  const gap = input.stageGapPx ?? 16;
  const lyricNeed = Math.max(0, input.maxLyricContentWidthPx);

  // onLayout 前：先按固定封面占位，避免 0 宽闪一下
  if (stage <= 0) {
    return {
      mode: "fixed-cover",
      coverWidthPx: DESKTOP_COVER_COLUMN_PX,
      lyricsWidthPx: DESKTOP_COVER_COLUMN_PX * 2,
    };
  }

  const usable = Math.max(0, stage - gap);

  if (usable < 560) {
    const coverWidthPx = Math.min(DESKTOP_COVER_COLUMN_PX, Math.floor(usable * 0.4));
    return {
      mode: "fixed-cover",
      coverWidthPx,
      lyricsWidthPx: Math.max(0, usable - coverWidthPx),
    };
  }

  const ratioCover = Math.floor(usable / 3);
  const ratioLyrics = usable - ratioCover;
  const lyricsInnerAtRatio = Math.max(0, ratioLyrics - pad);

  // 最长歌词行装不进 1:2 的歌词栏 → 钉封面，把宽度让给歌词
  if (lyricNeed > lyricsInnerAtRatio) {
    const coverWidthPx = Math.min(DESKTOP_COVER_COLUMN_PX, ratioCover);
    return {
      mode: "fixed-cover",
      coverWidthPx,
      lyricsWidthPx: Math.max(0, usable - coverWidthPx),
    };
  }

  return {
    mode: "ratio-1-2",
    coverWidthPx: ratioCover,
    lyricsWidthPx: ratioLyrics,
  };
}
