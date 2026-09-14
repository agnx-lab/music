// 场景：简易 LRC / 纯文本歌词解析，供播放器滚动高亮；同戳多行收成双语组。

export interface LyricLine {
  timeSec: number;
  text: string;
}

/** 同一时间戳的一行或多行（常见：原文 + 译文）。 */
export interface LyricUnit {
  timeSec: number;
  texts: readonly string[];
}

const LRC_LINE_RE = /^\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\](.*)$/;
/** 部分 LRC 在行尾再挂结束时间：`歌词[01:20.80]`，展示前剥掉 */
const TRAILING_LRC_TIME_RE = /\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]\s*$/g;
/** 增强 LRC / 逐字时间戳：`The [01:28.17]most [01:28.50]amazing` — 展示前全部剥掉 */
const INLINE_LRC_TIME_RE = /\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]/g;

/** 同戳合并容差（秒）；双语 LRC 常为完全相同时间。 */
const BILINGUAL_TIME_EPSILON_SEC = 0.05;

function stripInlineLrcTimestamps(body: string): string {
  return body
    .replace(INLINE_LRC_TIME_RE, " ")
    .replace(TRAILING_LRC_TIME_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 源站常见「无歌词 / 纯音乐」占位，不当作可滚动歌词行。 */
const LYRIC_PLACEHOLDER_RE =
  /没有填词|暂无歌词|纯音乐|此歌曲为|instrumental|no\s*lyrics|lyrics?\s*not\s*found/i;

function isLyricPlaceholder(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }
  return LYRIC_PLACEHOLDER_RE.test(trimmed);
}

export function parseLyrics(raw: string | null | undefined): LyricLine[] {
  const text = raw?.trim();
  if (!text) {
    return [];
  }
  const lines = text.split(/\r?\n/);
  const timed: LyricLine[] = [];
  const plain: string[] = [];
  for (const line of lines) {
    const match = LRC_LINE_RE.exec(line.trim());
    if (!match) {
      const plainText = line.trim();
      if (plainText && !isLyricPlaceholder(plainText)) {
        plain.push(plainText);
      }
      continue;
    }
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const fraction = match[3] ?? "0";
    const millis = Number(fraction.padEnd(3, "0").slice(0, 3));
    const body = stripInlineLrcTimestamps(match[4] ?? "");
    if (isLyricPlaceholder(body)) {
      continue;
    }
    timed.push({
      timeSec: minutes * 60 + seconds + millis / 1000,
      text: body || " ",
    });
  }
  if (timed.length > 0) {
    return timed.sort((left, right) => left.timeSec - right.timeSec);
  }
  return plain.map((item, index) => ({ timeSec: index * 4, text: item }));
}

/**
 * 将相同（或极近）时间戳的连续行收成一组，供双语紧凑并列与同步高亮。
 * 单语 LRC 每组仍只有一行。
 */
export function groupLyricUnits(
  lines: readonly LyricLine[],
  epsilonSec: number = BILINGUAL_TIME_EPSILON_SEC,
): LyricUnit[] {
  const units: LyricUnit[] = [];
  for (const line of lines) {
    const last = units[units.length - 1];
    if (last && Math.abs(last.timeSec - line.timeSec) <= epsilonSec) {
      units[units.length - 1] = {
        timeSec: last.timeSec,
        texts: [...last.texts, line.text],
      };
      continue;
    }
    units.push({ timeSec: line.timeSec, texts: [line.text] });
  }
  return units;
}

export function activeLyricIndex(
  lines: readonly { timeSec: number }[],
  currentTime: number,
): number {
  if (lines.length === 0) {
    return -1;
  }
  let active = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    if (line.timeSec <= currentTime) {
      active = index;
    } else {
      break;
    }
  }
  return active;
}

/** 当前组内进度 0..1，用于逐字高亮（无逐字时间戳时按组起止插值）。 */
export function lyricLineProgress(
  lines: readonly { timeSec: number; text?: string }[],
  activeIndex: number,
  currentTime: number,
): number {
  if (activeIndex < 0 || activeIndex >= lines.length) {
    return 0;
  }
  const line = lines[activeIndex];
  if (!line) {
    return 0;
  }
  const next = lines[activeIndex + 1];
  const start = line.timeSec;
  const textLen = Array.from(line.text ?? "").length;
  // 末行：按字数估时长，并加一点尾留，避免刚唱完就切走
  const end = next ? next.timeSec : start + Math.max(4, textLen * 0.45);
  if (end <= start) {
    return 1;
  }
  const raw = (currentTime - start) / (end - start);
  // 在行窗前 78% 跑完逐字，后段保持全亮，避免「还没亮完就换行」
  const karaokeSpan = 0.78;
  return Math.min(1, Math.max(0, raw / karaokeSpan));
}

/** 根据行内进度计算应点亮的字符数（progress=1 时必定全亮）。 */
export function lyricLitCharCount(text: string, progress: number): number {
  const chars = Array.from(text);
  if (chars.length === 0) {
    return 0;
  }
  if (progress >= 1) {
    return chars.length;
  }
  if (progress <= 0) {
    return 0;
  }
  return Math.min(chars.length, Math.max(1, Math.ceil(chars.length * progress)));
}

/** 把 0..1 进度量化为步进，供 CSS 变量 / React memo 减少空转。 */
export function quantizeLyricProgress(progress: number, steps = 24): number {
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }
  const s = Math.max(1, Math.floor(steps));
  return Math.min(1, Math.max(0, Math.round(progress * s) / s));
}
