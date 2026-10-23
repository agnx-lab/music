// 场景：歌词逐字高亮（Web 双层 clip-path + 预计算阅读序 path）— 播放热路径禁止布局测量。
// 首帧须先有 karaoke CSS + 内联色，避免 base/fill 继承浏览器默认黑。
import {
  createElement,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { usePlaybackUiTime } from "./use-playback-ui-time";

/** 独立 style 标签，绝不复用 agnx-music-lyrics-chrome-*（曾写坏全局样式的坑）。 */
const KARAOKE_STYLE_ID = "agnx-music-lyric-karaoke-v8";
const LEGACY_KARAOKE_STYLE_IDS = [
  "agnx-music-lyric-karaoke-v1",
  "agnx-music-lyric-karaoke-v2",
  "agnx-music-lyric-karaoke-v3",
  "agnx-music-lyric-karaoke-v4",
  "agnx-music-lyric-karaoke-v5",
  "agnx-music-lyric-karaoke-v6",
  "agnx-music-lyric-karaoke-v7",
] as const;

/** 预计算量化档：布局时生成 clip 缓存；播放只按下标取。 */
export const KARAOKE_CLIP_STEPS = 12;

const CLIP_HIDDEN = "inset(0 100% 0 0)";
const CLIP_FULL = "none";

interface KaraokeLayoutCache {
  text: string;
  hostWidth: number;
  fontKey: string;
  /** clipByStep[0..STEPS]：始终是阅读序矩形 path（禁止 host 横向 inset） */
  clipByStep: string[];
}

function ensureKaraokeCss(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(KARAOKE_STYLE_ID)) {
    return;
  }
  for (const legacyId of LEGACY_KARAOKE_STYLE_IDS) {
    document.getElementById(legacyId)?.remove();
  }
  const style = document.createElement("style");
  style.id = KARAOKE_STYLE_ID;
  style.textContent = `
.agnx-music-lyric-karaoke-host {
  position: relative;
  display: block;
  width: 100%;
  max-width: 100%;
  text-align: center;
  box-sizing: border-box;
  contain: layout style;
}
.agnx-music-lyric-karaoke-base,
.agnx-music-lyric-karaoke-fill {
  display: block;
  width: 100%;
  max-width: 100%;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
}
.agnx-music-lyric-karaoke-base {
  /* var 未就绪时勿掉进浏览器默认黑；组件还会内联 pendingColor 兜底 */
  color: var(--agnx-lyric-pending-color, rgba(255, 255, 255, 0.55));
  opacity: var(--agnx-lyric-pending-opacity, 0.4);
}
.agnx-music-lyric-karaoke-fill {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  color: var(--agnx-lyric-lit-color, #fff);
  pointer-events: none;
  will-change: clip-path;
  contain: paint;
}
.agnx-music-lyric-karaoke-host::selection,
.agnx-music-lyric-karaoke-base::selection,
.agnx-music-lyric-karaoke-fill::selection {
  color: #fff;
  background: rgba(59, 130, 246, 0.45);
}
`;
  document.head.appendChild(style);
}

/** 模块加载即注入，避免首帧 class 已挂但 stylesheet 还在 useEffect 之后。 */
ensureKaraokeCss();

/** 仅取 data/offset，避开 RN Text 与 DOM Text 名称冲突。 */
interface KaraokeDomText {
  data: string;
}

function firstTextNode(root: Node): (Node & KaraokeDomText) | null {
  if (typeof document === "undefined") {
    return null;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const node = walker.nextNode();
  if (!node || node.nodeType !== Node.TEXT_NODE) {
    return null;
  }
  return node as Node & KaraokeDomText;
}

/**
 * 把 Range 的 client rects 编成 clip-path path。
 * 多视觉行 = 多矩形，阅读序正确；禁止用 host 宽度横向 inset（短行会整行误亮）。
 */
function clipPathFromRects(host: HTMLElement, rects: DOMRect[]): string {
  if (rects.length === 0) {
    return CLIP_HIDDEN;
  }
  const hostRect = host.getBoundingClientRect();
  if (!(hostRect.width > 0) || !(hostRect.height > 0)) {
    return CLIP_HIDDEN;
  }
  const d = rects
    .map((rect) => {
      const x = Number((rect.left - hostRect.left).toFixed(2));
      const y = Number((rect.top - hostRect.top).toFixed(2));
      const w = Number(Math.max(0, rect.width).toFixed(2));
      const h = Number(Math.max(0, rect.height).toFixed(2));
      return `M${x} ${y}h${w}v${h}h${-w}z`;
    })
    .join("");
  return `path(evenodd, "${d}")`;
}

function measureRangeRects(textNode: Node & KaraokeDomText, endOffset: number): DOMRect[] {
  const range = document.createRange();
  try {
    range.setStart(textNode, 0);
    range.setEnd(textNode, endOffset);
  } catch {
    return [];
  }
  return Array.from(range.getClientRects()).filter((rect) => rect.width > 0.5 && rect.height > 0.5);
}

/**
 * 仅在布局变化时调用：按 STEPS 预计算 clip-path。
 * 播放阶段只按下标取字符串，禁止再 getClientRects。
 * 测量用 in-flow 的 base（比 absolute fill 排版更稳）。
 */
export function precomputeKaraokeClips(input: {
  host: HTMLElement;
  /** 与 fill 同文同字体的 in-flow 节点 */
  measureRoot: HTMLElement;
  text: string;
  steps?: number;
}): string[] {
  const steps = Math.max(1, input.steps ?? KARAOKE_CLIP_STEPS);
  const clips: string[] = Array.from({ length: steps + 1 }, () => CLIP_HIDDEN);
  clips[0] = CLIP_HIDDEN;
  clips[steps] = CLIP_FULL;

  const textNode = firstTextNode(input.measureRoot);
  if (!textNode || !input.text) {
    return clips;
  }

  const unitLen = textNode.data.length;
  if (unitLen <= 0) {
    return clips;
  }

  for (let step = 1; step < steps; step += 1) {
    const endOffset = Math.max(1, Math.min(unitLen, Math.round((step / steps) * unitLen)));
    const rects = measureRangeRects(textNode, endOffset);
    // 始终 path：单行 1 矩形、多行 N 矩形，都相对字形盒而不是 host 左缘横扫
    clips[step] = clipPathFromRects(input.host, rects);
  }
  return clips;
}

function fontKeyOf(props: {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle["fontWeight"];
  letterSpacing?: number;
}): string {
  return `${props.fontSize}|${props.lineHeight}|${props.fontWeight ?? ""}|${props.letterSpacing ?? ""}`;
}

function stepFromProgress(progress: number, steps: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(p * steps);
}

export function MusicSeekProgress(props: {
  duration: number;
  children: (progress: number, currentTime: number) => ReactNode;
}): ReactNode {
  const currentTime = usePlaybackUiTime();
  const progress = props.duration > 0 ? Math.min(1, currentTime / props.duration) : 0;
  return <>{props.children(progress, currentTime)}</>;
}

/**
 * Web 当前行逐字：底层暗色 + 上层强调色。
 * - 布局时预计算阅读序 clip 缓存（唯一测量窗口）
 * - 播放热路径：只切换缓存字符串（经 React style，避免被 style 覆盖清掉）
 * - 不高 CPU：无播放期 getClientRects / 无逐字 DOM
 */
export function MusicLyricKaraokeText(props: {
  text: string;
  /** 0..1 行内进度 */
  progress: number;
  litColor: string;
  pendingColor: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle["fontWeight"];
  letterSpacing?: number;
  opacity?: number;
  selectable?: boolean;
  testID?: string;
  onSeekProgress?: (progress: number) => void;
}): ReactNode {
  // 再保险：布局前确保 CSS 在（模块顶已调；HMR/无 document 首屏后补一次）
  useLayoutEffect(() => {
    ensureKaraokeCss();
  }, []);

  const hostRef = useRef<HTMLSpanElement | null>(null);
  const baseRef = useRef<HTMLSpanElement | null>(null);
  const cacheRef = useRef<KaraokeLayoutCache | null>(null);
  const progressRef = useRef(props.progress);
  progressRef.current = props.progress;
  const propsRef = useRef(props);
  propsRef.current = props;

  const [clipPath, setClipPath] = useState<string>(CLIP_HIDDEN);

  const applyStep = (step: number) => {
    const cache = cacheRef.current;
    if (!cache) {
      return;
    }
    const idx = Math.max(0, Math.min(cache.clipByStep.length - 1, step));
    const next = cache.clipByStep[idx] ?? CLIP_HIDDEN;
    setClipPath((prev) => (prev === next ? prev : next));
  };

  useLayoutEffect(() => {
    const rebuildCache = () => {
      const host = hostRef.current;
      const base = baseRef.current;
      const p = propsRef.current;
      if (!host || !base) {
        return;
      }
      const width = Math.round(host.getBoundingClientRect().width || host.offsetWidth || 0);
      if (!(width > 0)) {
        return;
      }
      const nextFont = fontKeyOf(p);
      const prev = cacheRef.current;
      if (
        prev &&
        prev.text === p.text &&
        prev.hostWidth === width &&
        prev.fontKey === nextFont &&
        prev.clipByStep.length === KARAOKE_CLIP_STEPS + 1
      ) {
        applyStep(stepFromProgress(progressRef.current, KARAOKE_CLIP_STEPS));
        return;
      }
      const clipByStep = precomputeKaraokeClips({
        host,
        measureRoot: base,
        text: p.text,
        steps: KARAOKE_CLIP_STEPS,
      });
      cacheRef.current = {
        text: p.text,
        hostWidth: width,
        fontKey: nextFont,
        clipByStep,
      };
      applyStep(stepFromProgress(progressRef.current, KARAOKE_CLIP_STEPS));
    };

    rebuildCache();
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === "undefined") {
      return;
    }
    let frame = 0;
    const ro = new ResizeObserver(() => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        rebuildCache();
      });
    });
    ro.observe(host);
    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      ro.disconnect();
    };
  }, [props.text, props.fontSize, props.lineHeight, props.fontWeight, props.letterSpacing]);

  useLayoutEffect(() => {
    applyStep(stepFromProgress(props.progress, KARAOKE_CLIP_STEPS));
  }, [props.progress]);

  const hostStyle: CSSProperties = {
    fontSize: props.fontSize,
    lineHeight: `${props.lineHeight}px`,
    fontWeight: props.fontWeight as CSSProperties["fontWeight"],
    letterSpacing: props.letterSpacing,
    ["--agnx-lyric-lit-color" as string]: props.litColor,
    ["--agnx-lyric-pending-color" as string]: props.pendingColor,
    ["--agnx-lyric-pending-opacity" as string]: "0.4",
    opacity: props.opacity,
    userSelect: props.selectable === false ? "none" : "text",
    WebkitUserSelect: props.selectable === false ? "none" : "text",
    cursor: props.onSeekProgress ? "pointer" : undefined,
  };

  const sharedFont: CSSProperties = {
    fontSize: props.fontSize,
    lineHeight: `${props.lineHeight}px`,
    fontWeight: props.fontWeight as CSSProperties["fontWeight"],
    letterSpacing: props.letterSpacing,
  };

  // 内联色：即使 stylesheet 晚一拍，也不继承默认黑
  const baseStyle: CSSProperties = {
    ...sharedFont,
    color: props.pendingColor,
  };

  const fillStyle: CSSProperties = {
    ...sharedFont,
    color: props.litColor,
    clipPath,
    // React/RN-web 可能只认 camelCase；双写保证不丢
    WebkitClipPath: clipPath,
  };

  const onClick = (event: MouseEvent) => {
    if (!props.onSeekProgress) {
      return;
    }
    const host = hostRef.current;
    if (!host || !cacheRef.current) {
      return;
    }
    const rect = host.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) {
      return;
    }
    const relX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const relY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const approx = Math.min(1, Math.max(0, relY * 0.72 + relX * 0.28));
    props.onSeekProgress(approx);
  };

  return createElement(
    "span",
    {
      ref: hostRef,
      className: "agnx-music-lyric-karaoke-host",
      "data-testid": props.testID,
      "data-lyric-selectable": props.selectable === false ? "false" : "true",
      style: hostStyle,
      onClick: props.onSeekProgress ? onClick : undefined,
    },
    createElement(
      "span",
      { ref: baseRef, className: "agnx-music-lyric-karaoke-base", style: baseStyle },
      props.text,
    ),
    createElement(
      "span",
      {
        className: "agnx-music-lyric-karaoke-fill",
        style: fillStyle,
        "aria-hidden": true,
      },
      props.text,
    ),
  );
}

/** native / 无 DOM：整行高亮（不做逐字子节点）。 */
export function MusicLyricPlainActiveText(props: {
  text: string;
  style: StyleProp<TextStyle>;
  selectable?: boolean;
}): ReactNode {
  return (
    <Text
      selectable={props.selectable}
      style={props.style}
      {...({
        dataSet: { lyricSelectable: props.selectable === false ? "false" : "true" },
      } as object)}
    >
      {props.text}
    </Text>
  );
}
