// 场景：播放 UI 时钟 React 订阅 — 叶子组件用，父树不因进度跳动重渲染。

import { useRef, useSyncExternalStore } from "react";
import { activeLyricIndex, lyricLineProgress, quantizeLyricProgress } from "./lyrics";
import { getPlaybackUiTime, subscribePlaybackUiTime } from "./playback-ui-time-store";

export function usePlaybackUiTime(): number {
  return useSyncExternalStore(subscribePlaybackUiTime, getPlaybackUiTime, getPlaybackUiTime);
}

export interface LyricHighlightSnapshot {
  activeIndex: number;
  /** 已量化的行内进度 0..1，供 CSS 变量 / memo 比较 */
  progress: number;
  /** activeIndex + 量化 progress，未变则保持同一引用 */
  signature: string;
}

/**
 * 歌词高亮订阅：仅当 active 行或量化 progress 步进变化时才换 snapshot。
 * 不再按 litCount 逐字拆 React 树；Web 用 CSS clip 消化 progress。
 */
export function usePlaybackLyricHighlight(input: {
  units: readonly { timeSec: number; texts: readonly string[] }[];
  progressLines: readonly { timeSec: number; text?: string }[];
}): LyricHighlightSnapshot {
  const cacheRef = useRef<LyricHighlightSnapshot>({
    activeIndex: -1,
    progress: 0,
    signature: "-1",
  });
  const unitsRef = useRef(input.units);
  const progressLinesRef = useRef(input.progressLines);
  unitsRef.current = input.units;
  progressLinesRef.current = input.progressLines;

  return useSyncExternalStore(
    subscribePlaybackUiTime,
    () => {
      const time = getPlaybackUiTime();
      const units = unitsRef.current;
      const progressLines = progressLinesRef.current;
      const activeIndex = activeLyricIndex(units, time);
      const rawProgress = lyricLineProgress(progressLines, activeIndex, time);
      // 12 档足够跟唱；再高会增加当前行 commit 与字符 class 更新频率
      const progress = quantizeLyricProgress(rawProgress, 12);
      const signature = `${activeIndex}:${Math.round(progress * 12)}`;
      if (signature === cacheRef.current.signature) {
        return cacheRef.current;
      }
      const next: LyricHighlightSnapshot = { activeIndex, progress, signature };
      cacheRef.current = next;
      return next;
    },
    () => cacheRef.current,
  );
}
