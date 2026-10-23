// 场景：歌名过长水平循环滚动；可选副文案（艺人）同轨双色共滚。Web 用 CSS animation。
/* oxlint-disable eslint-plugin-react-perf(jsx-no-new-array-as-prop, jsx-no-new-object-as-prop, jsx-no-new-function-as-prop) -- marquee */
import { createElement, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Animated,
  Easing,
  StyleSheet as RNStyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const MARQUEE_STYLE_ID = "agnx-music-marquee-keyframes-v6";
const SECONDARY_GAP_PX = 10;

function ensureMarqueeCss(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(MARQUEE_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = MARQUEE_STYLE_ID;
  style.textContent = `
@keyframes agnx-music-marquee {
  0% { transform: translateX(0); }
  10% { transform: translateX(0); }
  90% { transform: translateX(-50%); }
  100% { transform: translateX(-50%); }
}
.agnx-music-marquee-viewport {
  overflow: hidden !important;
  width: 100%;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.agnx-music-marquee-viewport.is-fit {
  justify-content: flex-start;
  width: auto;
  max-width: 100%;
}
.agnx-music-marquee-viewport.is-overflow {
  justify-content: flex-start;
}
.agnx-music-marquee-track {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  white-space: nowrap;
  width: max-content;
  max-width: none;
}
.agnx-music-marquee-track.is-scrolling {
  justify-content: flex-start;
  animation: agnx-music-marquee linear infinite;
  will-change: transform;
}
.agnx-music-marquee-chunk {
  flex-shrink: 0;
  white-space: nowrap;
  padding-right: 0;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: ${SECONDARY_GAP_PX}px;
}
.agnx-music-marquee-track.is-scrolling .agnx-music-marquee-chunk {
  padding-right: 40px;
}
`;
  document.head.appendChild(style);
}

function WebCssMarquee(props: {
  text: string;
  color: string;
  fontSize?: number;
  fontWeight?: TextStyle["fontWeight"];
  secondaryText?: string;
  secondaryColor?: string;
  secondaryFontSize?: number;
  secondaryFontWeight?: TextStyle["fontWeight"];
  fitContent?: boolean;
  /** 未溢出时主轴对齐；桌面小封面旁标题需 start，避免短歌名居中拉开间距 */
  contentAlign?: "start" | "center";
  /** Tab 切走 / 窗口隐藏时暂停 CSS 动画 */
  animationPaused?: boolean;
  testID?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [scrolling, setScrolling] = useState(false);
  const [durationSec, setDurationSec] = useState(8);
  const [animationPaused, setAnimationPaused] = useState(false);
  const secondary = props.secondaryText?.trim() || "";

  useEffect(() => {
    ensureMarqueeCss();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const syncPause = () => {
      setAnimationPaused(Boolean(document.hidden) || Boolean(props.animationPaused));
    };
    syncPause();
    document.addEventListener("visibilitychange", syncPause);
    return () => document.removeEventListener("visibilitychange", syncPause);
  }, [props.animationPaused]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const measure = measureRef.current;
    if (!viewport || !measure) {
      return;
    }
    const update = () => {
      const textWidth = measure.scrollWidth;
      const parent = viewport.parentElement;
      // 以父盒约束宽为准：若视口被 max-content 撑开，clientWidth≈textWidth 会误判「不溢出」，
      // 外层 overflow:hidden 却仍把字裁掉，表现为「截断但不滚」。
      const parentW = parent ? parent.getBoundingClientRect().width || parent.clientWidth || 0 : 0;
      // keep-alive display:none / 0 宽槽：禁止写入 width:1px，否则 fitContent + width:auto 父级会 shrink-wrap 死锁，
      // 切回 Music 后只剩居中小封面、标题被裁没。
      if (parentW < 8) {
        viewport.style.removeProperty("width");
        setScrolling(false);
        return;
      }
      const constraint = Math.max(1, parentW);
      if (props.fitContent) {
        const maxW = Math.max(1, constraint);
        if (textWidth <= maxW + 4) {
          viewport.style.width = `${textWidth}px`;
          setScrolling(false);
          return;
        }
        viewport.style.width = `${maxW}px`;
        setScrolling(true);
        setDurationSec(Math.max(6, textWidth / 40));
        return;
      }
      viewport.style.width = `${constraint}px`;
      const need = textWidth > constraint + 4;
      setScrolling(need);
      if (need) {
        setDurationSec(Math.max(6, textWidth / 40));
      }
    };
    update();
    // 首帧布局偶发 0 宽：再测一次；从隐藏恢复时双 rAF 等 display:flex 落稳
    let raf2 = 0;
    const raf = requestAnimationFrame(() => {
      update();
      raf2 = requestAnimationFrame(update);
    });
    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(raf);
        cancelAnimationFrame(raf2);
      };
    }
    const observer = new ResizeObserver(update);
    observer.observe(viewport.parentElement ?? viewport);
    if (viewport.parentElement?.parentElement) {
      observer.observe(viewport.parentElement.parentElement);
    }
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
      observer.disconnect();
    };
  }, [
    props.text,
    secondary,
    props.fontSize,
    props.fontWeight,
    props.secondaryFontSize,
    props.secondaryFontWeight,
    props.secondaryColor,
    props.fitContent,
    props.contentAlign,
    // 切回可见时强制重测，清掉隐藏期可能留下的错误 inline width
    props.animationPaused,
  ]);

  const textCss: CSSProperties = {
    color: props.color,
    fontSize: props.fontSize ?? 16,
    fontWeight: (props.fontWeight as CSSProperties["fontWeight"]) ?? 600,
    whiteSpace: "nowrap",
    lineHeight: 1.45,
  };
  const secondaryCss: CSSProperties = {
    color: props.secondaryColor ?? props.color,
    fontSize: props.secondaryFontSize ?? props.fontSize ?? 16,
    fontWeight: (props.secondaryFontWeight as CSSProperties["fontWeight"]) ?? 400,
    whiteSpace: "nowrap",
    lineHeight: 1.45,
  };

  const renderChunkChildren = () => {
    const nodes = [createElement("span", { key: "primary", style: textCss }, props.text)];
    if (secondary) {
      nodes.push(createElement("span", { key: "secondary", style: secondaryCss }, secondary));
    }
    return nodes;
  };

  const alignStart = props.contentAlign === "start" || props.fitContent || scrolling;
  const viewportClass = [
    "agnx-music-marquee-viewport",
    props.fitContent ? "is-fit" : "",
    scrolling ? "is-overflow" : "",
    alignStart ? "is-align-start" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createElement(
    "div",
    {
      ref: viewportRef,
      className: viewportClass,
      "data-testid": props.testID,
      style: {
        minWidth: 0,
        overflow: "hidden",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: alignStart ? "flex-start" : "center",
      },
    },
    createElement(
      "span",
      {
        ref: measureRef,
        style: {
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          left: 0,
          top: 0,
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "center",
          gap: SECONDARY_GAP_PX,
          whiteSpace: "nowrap",
        },
      },
      ...renderChunkChildren(),
    ),
    createElement(
      "div",
      {
        className: scrolling ? "agnx-music-marquee-track is-scrolling" : "agnx-music-marquee-track",
        style: scrolling
          ? {
              animationDuration: `${durationSec}s`,
              animationPlayState: animationPaused ? "paused" : "running",
            }
          : undefined,
      },
      createElement("span", { className: "agnx-music-marquee-chunk" }, ...renderChunkChildren()),
      scrolling
        ? createElement("span", { className: "agnx-music-marquee-chunk" }, ...renderChunkChildren())
        : null,
    ),
  );
}

function NativeMarquee(props: {
  text: string;
  style?: StyleProp<TextStyle>;
  secondaryText?: string;
  secondaryStyle?: StyleProp<TextStyle>;
  fitContent?: boolean;
  testID?: string;
}) {
  const { theme } = useUnistyles();
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const offset = useRef(new Animated.Value(0)).current;
  const shouldScroll = textWidth > boxWidth + 4 && boxWidth > 0;
  const secondary = props.secondaryText?.trim() || "";
  const textStyle = useMemo(() => {
    const flat = (RNStyleSheet.flatten(props.style) ?? {}) as TextStyle;
    return Object.assign({}, flat, { color: theme.colors.foreground, flexShrink: 0 });
  }, [props.style, theme.colors.foreground]);
  const secondaryStyle = useMemo(() => {
    const flat = (RNStyleSheet.flatten(props.secondaryStyle) ?? {}) as TextStyle;
    return Object.assign({}, flat, {
      color: flat.color ?? theme.colors.foregroundMuted,
      flexShrink: 0,
    });
  }, [props.secondaryStyle, theme.colors.foregroundMuted]);

  useEffect(() => {
    offset.stopAnimation();
    offset.setValue(0);
    if (!shouldScroll) {
      return;
    }
    const distance = textWidth + 40;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(offset, {
          toValue: -distance,
          duration: Math.max(5000, distance * 35),
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(offset, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [offset, shouldScroll, textWidth]);

  const renderChunk = (measure: boolean) => (
    <View
      style={styles.chunkRow}
      onLayout={measure ? (event) => setTextWidth(event.nativeEvent.layout.width) : undefined}
    >
      <Text style={textStyle}>{props.text}</Text>
      {secondary ? <Text style={secondaryStyle}>{secondary}</Text> : null}
    </View>
  );

  return (
    <View
      style={[styles.box, props.fitContent ? styles.boxFit : null]}
      onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
      testID={props.testID}
    >
      <Animated.View
        style={[
          styles.row,
          shouldScroll ? { transform: [{ translateX: offset }] } : null,
          shouldScroll ? styles.rowScroll : null,
          props.fitContent && !shouldScroll ? styles.rowFit : null,
        ]}
      >
        {renderChunk(true)}
        {shouldScroll ? <View style={styles.gapCopy}>{renderChunk(false)}</View> : null}
      </Animated.View>
    </View>
  );
}

export function MarqueeText(props: {
  text: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
  /** 短文案按内容收窄；仅溢出时才占满可用宽度并轮播 */
  fitContent?: boolean;
  /**
   * 显式字号（推荐）。Web 路径用 CSS 画字，RN StyleSheet.flatten 吃不到 Unistyles
   * 代理对象里的 fontSize，会导致一直落回默认 16。
   */
  fontSize?: number;
  fontWeight?: TextStyle["fontWeight"];
  color?: string;
  /** 副文案（如艺人）：与主文案同一轨道滚动，可独立配色/字号 */
  secondaryText?: string;
  secondaryColor?: string;
  secondaryFontSize?: number;
  secondaryFontWeight?: TextStyle["fontWeight"];
  /** 未溢出时对齐；小封面旁标题用 start */
  contentAlign?: "start" | "center";
  /** Music Tab 切走时暂停跑马灯 */
  animationPaused?: boolean;
}) {
  const { theme } = useUnistyles();
  const flat = (RNStyleSheet.flatten(props.style) ?? {}) as TextStyle;
  const fontSize =
    props.fontSize ?? (typeof flat.fontSize === "number" ? flat.fontSize : theme.fontSize.base);
  const fontWeight = props.fontWeight ?? flat.fontWeight;
  const color =
    props.color ?? (typeof flat.color === "string" ? flat.color : theme.colors.foreground);
  const secondary = props.secondaryText?.trim() || "";
  const isDom = typeof document !== "undefined";

  if (isDom) {
    return (
      <View style={props.fitContent ? styles.boxFit : styles.box}>
        <WebCssMarquee
          text={props.text}
          color={color}
          fontSize={fontSize}
          fontWeight={fontWeight}
          secondaryText={secondary || undefined}
          secondaryColor={props.secondaryColor ?? theme.colors.foregroundMuted}
          secondaryFontSize={props.secondaryFontSize}
          secondaryFontWeight={props.secondaryFontWeight}
          fitContent={props.fitContent}
          contentAlign={props.contentAlign}
          animationPaused={props.animationPaused}
          testID={props.testID}
        />
      </View>
    );
  }

  return (
    <NativeMarquee
      text={props.text}
      style={[props.style, { fontSize, fontWeight, color }]}
      secondaryText={secondary || undefined}
      secondaryStyle={{
        fontSize: props.secondaryFontSize ?? Math.max(12, fontSize - 2),
        fontWeight: props.secondaryFontWeight ?? "400",
        color: props.secondaryColor ?? theme.colors.foregroundMuted,
      }}
      fitContent={props.fitContent}
      testID={props.testID}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    // 勿用 flex:1（basis:0）：纵向两行歌名/艺人时会被压扁
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    width: "100%",
    overflow: "hidden",
  },
  boxFit: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
    // 交叉轴居中：在横向 title 行里垂直居中，避免贴顶
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
  },
  rowFit: {
    alignSelf: "center",
  },
  rowScroll: {
    width: "max-content" as unknown as number,
    justifyContent: "flex-start",
  },
  chunkRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: SECONDARY_GAP_PX,
    flexShrink: 0,
  },
  gapCopy: {
    marginLeft: 40,
  },
});
