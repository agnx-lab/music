// 场景：Music 播放器 UI + 命令/快捷键/菜单 — 经 activate(host) 注册。
// Phase A：汽水式沉浸布局；紧凑端不自造顶栏，沿用 Agnx 壳层头部按钮（布局 v2）。
// hmr-bust: player-detail-host-segmented-oncard-v1
/* oxlint-disable eslint(complexity), eslint(no-nested-ternary), eslint-plugin-react(no-array-index-key), eslint-plugin-react-hooks(exhaustive-deps), eslint-plugin-react-perf(jsx-no-new-array-as-prop, jsx-no-new-object-as-prop, jsx-no-new-function-as-prop, jsx-no-jsx-as-prop) -- Phase A player surface */
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet as RNStyleSheet,
  Text,
  View,
  ActivityIndicator,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Timer,
  Volume2,
  VolumeX,
  LocateFixed,
} from "lucide-react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type {
  WorkspaceAppActionBarProps,
  WorkspaceAppActionContribution,
  WorkspaceAppActionOverflowMenuProps,
  WorkspaceAppActionTooltipProps,
  WorkspaceAppHostApi,
  WorkspaceAppMenuItem,
  WorkspaceAppRunContext,
} from "@getagnx/app-sdk";
import { projectActionBarOverflowFold } from "@getagnx/app-sdk";
import { MUSIC_APP_ID } from "./music-ids";
import {
  MUSIC_OPEN_PLAYER_COMMAND_ID,
  MUSIC_PANEL_ID,
  MUSIC_PLAYER_ENTITY_ID,
  MUSIC_SEGMENT_ID,
  registerMusicListContributions,
} from "./list-contributions";
import {
  MusicCoverBackdropBlurDetailField,
  MusicCoverBackdropOpacityDetailField,
  MusicSearchCacheTtlDetailField,
} from "./detail-sheet-fields";
import { groupLyricUnits, parseLyrics } from "./lyrics";
import { MusicQueueDrawer } from "./queue-drawer";
import { MusicSearchView } from "./search-view";
import { TransportModeControl, TransportQueueControl } from "./transport-controls";
import { TrackCoverButton, TrackTitleArtist, resolveTrackArtistLabel } from "./track-identity";
import { coverUrlForHero } from "./cover-url-quality";
import { syncMusicContentBackdropToHost } from "./sync-content-backdrop";
import {
  MUSIC_PLAYER_ACTION_IDS,
  MUSIC_PLAYER_ACTION_LABELS,
  resolveMusicPlayerBarActionIds,
  resolveMusicPlayerChromeOverflowIds,
  type MusicPlayerActionId,
} from "./player-action-layout";
import {
  buildMusicPlayerOverflowMenuItems,
  isMusicTrackMenuDestructive,
  MUSIC_SIDEBAR_TRACK_MENU_IDS,
  MUSIC_TRACK_MENU_ACTION_LABELS,
  MUSIC_TRACK_MENU_CONTRIBUTION_IDS,
  MUSIC_TRACK_MENU_ICONS,
  MUSIC_TRACK_MENU_SHORTCUT_KEYS,
  MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS,
  resolveMusicTrackMenuActionId,
  resolveMusicTrackMenuIcon,
  type MusicTrackMenuActionId,
} from "./track-menu";
import {
  useMusicDemoStore,
  bindMusicHostStorage,
  getMusicHostHydrationCompleted,
  subscribeMusicHostHydration,
  isMusicTrackDownloadedLocally,
  type DemoTrack,
  type MusicPlayMode,
} from "./store";
import { MusicTabIcon } from "./music-tab-icon";
import {
  ATMOSPHERE_EXTRACT_VERSION,
  ensureTrackAtmospherePalette,
  pickAtmosphereBandForTheme,
  type ExtractedAtmospherePalette,
} from "./extract-cover-atmosphere";
import { maxLyricContentWidthPx, resolveDesktopStageSplit } from "./resolve-desktop-stage-split";
import {
  clearPendingTrackAutoPlay,
  requestTrackAutoPlay,
  resolveMusicResumePositionSec,
  shouldRequestAutoPlayOnOpenPlayer,
  takePendingAutoPlayTrackId,
} from "./music-autoplay";
import { readMusicPlaybackSessionSnapshotSync } from "./playback-session";
import {
  downloadAndPersistTrackBundle,
  isMusicLocalPersistedUri,
  restoreTrackFromDownloadBundleIfNeeded,
} from "./resource/download-bundle";
import { runMusicTrackMenuAction } from "./track-menu-run";
import { buildMusicTrackPublicDetailExtraRows } from "./track-detail";
import {
  MUSIC_TRACK_MENU_SURFACE,
  openMusicTrackEntityMenuLayoutEditor,
  seedMusicTrackEntityMenuLayouts,
  useMusicTrackEntityMenuLayout,
} from "./track-menu-surfaces";
import { seedMusicSearchMenuLayouts } from "./search-menu-surfaces";
import {
  cloudPlaybackGaveUpMessage,
  findCloudPlayableAlternates,
  formatMusicPlaybackError,
} from "./resource/cloud-playback";
import { getMusicProviderReferer, isDeferredBrowserProviderId } from "./resource/provider-catalog";
import { setMusicSidecarFetchJson } from "./resource/sidecar-fetch";
import { setMusicHostMediaApis, resolveMusicPlayableSrc } from "./resource/host-media";
import { findTxqqLyricsText, lyricsLikelyBelongToTrack } from "./resource/txqq-provider";
import { resolveMusicPlayable } from "./resource/service";
import { startMusicUiSmokeWatcher } from "./resource/ui-smoke";
import type { SearchHitTrack } from "./resource/types";
import {
  getMusicPlaybackAudio,
  getMusicPlaybackLoadedMeta,
  isMusicPlaybackAttachedOnTrack,
  isMusicPlayInterruptedError,
  isMusicAutoplayBlockedError,
  prepareMusicPlaybackSourceChange,
  applyMusicPlaybackVolume,
  readMusicPlaybackDurationSec,
  safeMusicPlay,
  setMusicPlaybackBackgroundActive,
  setMusicPlaybackLoadedMeta,
  setMusicPlaybackSrc,
  whenMusicPlaybackMetadataReady,
} from "./playback-engine";
import {
  applyMusicPlaybackIntent,
  ensureMusicPlaybackRuntime,
  ensureMusicColdRestoreWatch,
  maybeRestoreMusicPlaybackAfterColdStart,
  subscribeMusicPlaybackUi,
  syncMusicPlaybackPositionToStore,
} from "./playback-runtime";
import { publishPlaybackUiTime } from "./playback-ui-time-store";
import {
  MusicLyricKaraokeText,
  MusicLyricPlainActiveText,
  MusicSeekProgress,
} from "./music-lyrics-karaoke";
import { usePlaybackLyricHighlight } from "./use-playback-ui-time";
import { getMusicHostApi, resetMusicHostApi, setMusicHostApi } from "./music-host";
import { notifyMusicPlayerError, notifyMusicPlayerToast } from "./host-feedback";
import { startMusicPerfSelfReport, stopMusicPerfSelfReport } from "./perf-self-report";
import {
  MUSIC_PLAYER_EXTRA_SHORTCUTS,
  MUSIC_PLAYER_SHORTCUT_SLOTS,
  registerMusicPlayerShortcuts,
  setMusicPlayerShortcutHandlers,
  setMusicPlayerShortcutSurfaceActive,
} from "./music-player-shortcuts";

const MINI_APP_PANE_INTERACTIVE_EVENT = "agnx-mini-app-pane-interactive";

/** 「恢复滚动」触发态图标色：氛围下 foreground 近白，与 muted 难辨，固定冰蓝。 */
const MUSIC_LYRICS_FOLLOW_ACTIVE_COLOR = "#60A5FA";

interface MiniAppPaneInteractiveDetail {
  appId: string;
  panelId: string;
  entityId: string;
  active: boolean;
  /** keep-alive 槽是否当前可见；缺省时回退 active，兼容旧宿主广播 */
  visible?: boolean;
}

function miniAppPaneKey(input: { appId: string; panelId: string; entityId: string }): string {
  return `${input.appId}\0${input.panelId}\0${input.entityId}`;
}

function isThisMiniAppPaneInteractive(input: {
  appId: string;
  panelId: string;
  entityId: string;
}): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  const bag = window as Window & {
    __agnxMiniAppFocusBootstrapped?: boolean;
    __agnxFocusedMiniApp?: MiniAppPaneInteractiveDetail | null;
  };
  // 宿主 MiniAppPanel 尚未广播时（单测/无面板）：保持可测默认激活。
  if (!bag.__agnxMiniAppFocusBootstrapped) {
    return true;
  }
  const focused = bag.__agnxFocusedMiniApp ?? null;
  return Boolean(
    focused?.active &&
    focused.appId === input.appId &&
    focused.panelId === input.panelId &&
    focused.entityId === input.entityId,
  );
}

/** 歌词跟唱 / UI 时钟：看「是否真的显示在画面上」，不要求分组获焦。 */
function isThisMiniAppPaneVisible(input: {
  appId: string;
  panelId: string;
  entityId: string;
}): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  const bag = window as Window & {
    __agnxMiniAppFocusBootstrapped?: boolean;
    __agnxVisibleMiniApps?: Record<string, true>;
    __agnxFocusedMiniApp?: MiniAppPaneInteractiveDetail | null;
  };
  if (!bag.__agnxMiniAppFocusBootstrapped) {
    return true;
  }
  const visibleMap = bag.__agnxVisibleMiniApps;
  if (visibleMap) {
    return Boolean(visibleMap[miniAppPaneKey(input)]);
  }
  // 旧宿主只广播 focused：退回 interactive，避免完全不跟唱
  return isThisMiniAppPaneInteractive(input);
}

/** 打开播放器 Tab 时请求切到搜索面（命令入口）。 */
let pendingPlayerSurface: "player" | "search" | null = null;
/** 云播后台整曲落盘：避免同一曲重复拉；成功后下次直接读本地。 */
const cloudAutoPersistInFlight = new Set<string>();

/** 挂 globalThis，模块被 HMR 重执行时仍保留「三键 ↔ 歌词」选择。 */
const SEARCH_CENTER_CONTROLS_OPEN_KEY = "__agnxMusicSearchCenterControlsOpen";

function readPersistedSearchCenterControlsOpen(): boolean {
  const bag = globalThis as Record<string, unknown>;
  return typeof bag[SEARCH_CENTER_CONTROLS_OPEN_KEY] === "boolean"
    ? (bag[SEARCH_CENTER_CONTROLS_OPEN_KEY] as boolean)
    : true;
}

function writePersistedSearchCenterControlsOpen(open: boolean): void {
  (globalThis as Record<string, unknown>)[SEARCH_CENTER_CONTROLS_OPEN_KEY] = open;
}

/**
 * 跟唱时当前行距视口顶的 inset（约第 4 行）。
 * 顶 mask 渐变约 200px；72≈第 2 行、120≈第 3 行，再下移一行约 +48。
 */
const LYRIC_FOLLOW_TOP_INSET_PX = 168;

/**
 * 歌词列表顶/底预留空白（约三行：lineHeight 32 + 行内 padding）。
 * 开播与末句跟唱时不要贴视口顶/底边。
 */
const LYRIC_LIST_TOP_LEAD_PX = 144;
const LYRIC_LIST_BOTTOM_LEAD_PX = 144;

function stripShortcutSuffix(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/u, "").trim();
}

function host(): WorkspaceAppHostApi {
  return getMusicHostApi();
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function playModeLabel(mode: MusicPlayMode): string {
  if (mode === "loop-one") {
    return "单曲循环";
  }
  if (mode === "shuffle") {
    return "随机播放";
  }
  return "列表循环";
}

/** tip 文案与键帽只来自字母快捷键表，禁止读 transient ⌥1–9。 */
function refreshMusicControlShortcutHints(input: {
  actionBar: readonly MusicPlayerActionId[];
  playing: boolean;
  muted: boolean;
  pinned: boolean;
  playMode: MusicPlayMode;
  setControlTitles: (value: Record<string, string>) => void;
  setControlShortcutKeys: (value: Record<string, readonly string[]>) => void;
}): void {
  const { actionBar, playing, muted, pinned, playMode, setControlTitles, setControlShortcutKeys } =
    input;
  const nextTitles: Record<string, string> = {};
  const nextKeys: Record<string, readonly string[]> = {};
  for (const slot of MUSIC_PLAYER_SHORTCUT_SLOTS) {
    nextTitles[slot.id] = slot.label;
    nextKeys[slot.id] = slot.helpKeys;
  }
  for (const slot of MUSIC_PLAYER_EXTRA_SHORTCUTS) {
    nextTitles[slot.id] = slot.label;
    nextKeys[slot.id] = slot.helpKeys;
    const shortId = slot.id.replace(/^action:/, "");
    nextTitles[shortId] = slot.label;
    nextKeys[shortId] = slot.helpKeys;
  }
  for (const id of actionBar) {
    nextTitles[id] = nextTitles[`action:${id}`] ?? MUSIC_PLAYER_ACTION_LABELS[id];
    const actionKeys = nextKeys[`action:${id}`];
    if (actionKeys) {
      nextKeys[id] = actionKeys;
    }
  }
  nextTitles.more = "更多";
  if (playing && nextTitles["transport:play"]) {
    nextTitles["transport:play"] = "暂停";
  }
  if (muted && nextTitles["action:volume"]) {
    nextTitles["action:volume"] = "取消静音";
    nextTitles.volume = "取消静音";
  }
  if (pinned && nextTitles["action:pin"]) {
    nextTitles["action:pin"] = "取消置顶";
    nextTitles.pin = "取消置顶";
  }
  if (nextTitles["transport:mode"]) {
    nextTitles["transport:mode"] = playModeLabel(playMode);
  }
  setControlTitles(nextTitles);
  setControlShortcutKeys(nextKeys);
}

function resolvePlayModeIcon(mode: MusicPlayMode) {
  if (mode === "loop-one") {
    return Repeat1;
  }
  if (mode === "shuffle") {
    return Shuffle;
  }
  return Repeat;
}

function IconHit(props: {
  label: string;
  /** 宿主 tip 文案；不含快捷键字符串 */
  tipLabel?: string;
  shortcutKeys?: readonly string[];
  /** 默认 true；音量非静音等场景可关 tip */
  tipEnabled?: boolean;
  tipSide?: "top" | "bottom";
  /** 外露 bar「显示完整」：图标旁显示文案 */
  showLabel?: boolean;
  /** 56px 圆形主播放键；勿用默认 40px iconHit 裁切 */
  variant?: "default" | "play";
  onPress?: () => void;
  disabled?: boolean;
  children: ReactNode;
  testID?: string;
}) {
  const ActionTooltip = host().ui.ActionTooltip as ComponentType<WorkspaceAppActionTooltipProps>;
  const tipLabel = props.tipLabel ?? props.label;
  const tipEnabled = props.tipEnabled !== false;
  const bindDomCursor = useCallback(
    (node: unknown) => {
      if (!node || typeof node !== "object") {
        return;
      }
      const el = node as {
        removeAttribute?: (name: string) => void;
        style?: { cursor?: string };
      };
      el.removeAttribute?.("title");
      if (el.style) {
        el.style.cursor = props.disabled ? "default" : "pointer";
      }
    },
    [props.disabled],
  );
  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint={tipLabel}
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        props.variant === "play" ? styles.iconHitPlay : styles.iconHit,
        props.showLabel ? styles.iconHitLabeled : null,
        props.disabled ? styles.iconHitDisabled : null,
      ]}
      testID={props.testID}
      ref={bindDomCursor as never}
    >
      {props.children}
      {props.showLabel ? (
        <Text style={styles.iconHitLabel} numberOfLines={1} selectable={false}>
          {props.label}
        </Text>
      ) : null}
    </Pressable>
  );
  return (
    <View style={props.variant === "play" ? styles.iconHitWrapPlay : styles.iconHitWrap}>
      <ActionTooltip
        label={tipLabel}
        shortcutKeys={props.shortcutKeys}
        side={props.tipSide ?? "top"}
        enabled={tipEnabled}
      >
        {button}
      </ActionTooltip>
    </View>
  );
}

function SearchDesktopLyricScroller(props: {
  text: string;
  progress: number;
  emptyLabel: string;
  useCssKaraoke: boolean;
  litColor: string;
  pendingColor: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle["fontWeight"];
  textStyle: StyleProp<TextStyle>;
}) {
  const body = props.text.trim() ? props.text : "";
  if (!body) {
    return (
      <Text style={[props.textStyle, styles.searchDesktopLyricCentered]} numberOfLines={2}>
        {props.emptyLabel}
      </Text>
    );
  }

  if (props.useCssKaraoke) {
    return (
      <View style={styles.searchDesktopLyricCentered}>
        <MusicLyricKaraokeText
          text={body}
          progress={props.progress}
          litColor={props.litColor}
          pendingColor={props.pendingColor}
          fontSize={props.fontSize}
          lineHeight={props.lineHeight}
          fontWeight={props.fontWeight}
          selectable={false}
        />
      </View>
    );
  }

  // native：整行高亮，不拆字
  return (
    <Text
      style={[props.textStyle, styles.searchDesktopLyricCentered, { color: props.litColor }]}
      numberOfLines={2}
    >
      {body}
    </Text>
  );
}

function SeekBar(props: {
  progress: number;
  /** 已缓冲/缓存比例（0–1），显示在播放进度下方 */
  buffered?: number;
  onSeekRatio: (ratio: number) => void;
  accessibilityLabel?: string;
  testID?: string;
  /** edge：搜索面顶缘细条，无时间戳、无大拇指 */
  variant?: "default" | "edge";
  previewMode?: "none" | "desktop-hover" | "compact-tap";
  previewVisible?: boolean;
  previewRatio?: number;
  previewLabel?: string | null;
  onPreviewChange?: (next: { visible: boolean; ratio: number }) => void;
}) {
  const isEdge = props.variant === "edge";
  const widthRef = useRef(1);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    widthRef.current = Math.max(1, event.nativeEvent.layout.width);
  }, []);
  const ratioFromMouseEvent = useCallback(
    (event: {
      clientX?: number;
      currentTarget?: { getBoundingClientRect?: () => DOMRect };
      nativeEvent?: { clientX?: number; locationX?: number };
    }) => {
      const clientX =
        typeof event.clientX === "number"
          ? event.clientX
          : typeof event.nativeEvent?.clientX === "number"
            ? event.nativeEvent.clientX
            : null;
      const rect = event.currentTarget?.getBoundingClientRect?.();
      if (clientX != null && rect && rect.width > 0) {
        return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      }
      const locationX =
        typeof event.nativeEvent?.locationX === "number" ? event.nativeEvent.locationX : 0;
      return Math.min(1, Math.max(0, locationX / widthRef.current));
    },
    [],
  );
  const ratioFromEvent = useCallback(
    (event: GestureResponderEvent) => {
      return ratioFromMouseEvent(
        event as unknown as {
          clientX?: number;
          currentTarget?: { getBoundingClientRect?: () => DOMRect };
          nativeEvent?: { clientX?: number; locationX?: number };
        },
      );
    },
    [ratioFromMouseEvent],
  );
  const seekFromEvent = useCallback(
    (event: GestureResponderEvent) => {
      const ratio = ratioFromEvent(event);
      props.onSeekRatio(ratio);
      if (props.previewMode === "compact-tap") {
        props.onPreviewChange?.({ visible: true, ratio });
      }
    },
    [props, ratioFromEvent],
  );
  const buffered = Math.min(1, Math.max(0, props.buffered ?? 0));
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={props.accessibilityLabel ?? "播放进度"}
      onLayout={handleLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={seekFromEvent}
      onResponderMove={seekFromEvent}
      style={[styles.progressHit, isEdge ? styles.progressHitEdge : null]}
      testID={props.testID}
      {...(props.previewMode === "desktop-hover"
        ? ({
            onMouseEnter: (event: {
              clientX?: number;
              currentTarget?: { getBoundingClientRect?: () => DOMRect };
            }) => {
              props.onPreviewChange?.({ visible: true, ratio: ratioFromMouseEvent(event) });
            },
            onMouseMove: (event: {
              clientX?: number;
              currentTarget?: { getBoundingClientRect?: () => DOMRect };
            }) => {
              props.onPreviewChange?.({ visible: true, ratio: ratioFromMouseEvent(event) });
            },
            onMouseLeave: () => {
              props.onPreviewChange?.({
                visible: false,
                ratio: props.previewRatio ?? props.progress,
              });
            },
          } as object)
        : {})}
    >
      {props.previewVisible && props.previewLabel ? (
        <View
          style={[
            styles.progressTooltip,
            { left: `${Math.min(100, (props.previewRatio ?? 0) * 100)}%` },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.progressTooltipText}>{props.previewLabel}</Text>
        </View>
      ) : null}
      <View style={[styles.progressTrack, isEdge ? styles.progressTrackEdge : null]}>
        {buffered > 0 && buffered < 0.995 ? (
          <View
            style={[
              styles.progressBuffered,
              isEdge ? styles.progressBufferedEdge : null,
              { width: `${buffered * 100}%` },
            ]}
            testID="music-seek-buffered"
          />
        ) : null}
        <View
          style={[
            styles.progressFill,
            isEdge ? styles.progressFillEdge : null,
            { width: `${Math.min(100, props.progress * 100)}%` },
          ]}
        />
      </View>
      {isEdge ? null : (
        <View style={[styles.progressThumb, { left: `${Math.min(100, props.progress * 100)}%` }]} />
      )}
    </View>
  );
}

function VolumeBar(props: {
  value: number;
  onChange: (ratio: number) => void;
  testID?: string;
  vertical?: boolean;
  /** 菜单旁水平条用更宽触控区 */
  wide?: boolean;
  /** edge：与 SeekBar 共用 progressHit / Track / Fill 几何；颜色仅用 volumeFillColor 覆盖为灰 */
  variant?: "default" | "edge";
}) {
  const sizeRef = useRef(1);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      sizeRef.current = Math.max(1, props.vertical ? height : width);
    },
    [props.vertical],
  );
  const changeFromEvent = useCallback(
    (event: GestureResponderEvent) => {
      const size = sizeRef.current;
      const ratio = props.vertical
        ? Math.min(1, Math.max(0, 1 - event.nativeEvent.locationY / size))
        : Math.min(1, Math.max(0, event.nativeEvent.locationX / size));
      // 滑条位置 0–1 → 音量 0–2（200%）
      props.onChange(ratio * 2);
    },
    [props],
  );
  if (props.vertical) {
    return (
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="音量"
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={changeFromEvent}
        onResponderMove={changeFromEvent}
        style={styles.volumeHitVertical}
        testID={props.testID}
      >
        <View style={styles.volumeTrackVertical}>
          <View
            style={[
              styles.volumeFillVertical,
              { height: `${Math.min(100, (props.value / 2) * 100)}%` },
            ]}
          />
        </View>
      </View>
    );
  }
  const isEdge = props.variant === "edge";
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="音量"
      onLayout={handleLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={changeFromEvent}
      onResponderMove={changeFromEvent}
      style={[
        // edge：与 SeekBar 完全同一套 hit 几何（progressHit + progressHitEdge）
        isEdge ? styles.progressHit : styles.volumeHit,
        isEdge ? styles.progressHitEdge : null,
        !isEdge && props.wide ? { width: "100%", flexGrow: 1, flexShrink: 1 } : null,
      ]}
      testID={props.testID}
    >
      <View
        style={[
          isEdge ? styles.progressTrack : styles.volumeTrack,
          isEdge ? styles.progressTrackEdge : null,
        ]}
      >
        <View
          style={[
            // edge：几何跟 progressFill*，颜色覆盖为灰（volumeFillColor）
            isEdge ? styles.progressFill : styles.volumeFill,
            isEdge ? styles.progressFillEdge : null,
            isEdge ? styles.volumeFillColor : null,
            { width: `${Math.min(100, (props.value / 2) * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

/** 歌词叶子：同文件使用 styles，避免跨组件传 Unistyles 代理导致高亮样式丢失。 */

interface LyricUnit {
  timeSec: number;
  texts: readonly string[];
}

/** 非 active 行不跟 progress；active 行只跟量化 progress（Web CSS 逐字，无子节点）。 */
const MusicLyricLineRow = memo(
  function MusicLyricLineRow(props: {
    index: number;
    unit: LyricUnit;
    isActive: boolean;
    lyricProgress: number;
    selected: boolean;
    hovered: boolean;
    isCompact: boolean;
    inSearch: boolean;
    accent: string;
    /** Web 桌面用 CSS karaoke；native 整行高亮 */
    useCssKaraoke: boolean;
    onLayoutY: (index: number, y: number) => void;
    onLinePress: (index: number, timeSec: number) => void;
    onPlayLine: (timeSec: number) => void;
    onHoverEnter: (index: number) => void;
    onHoverLeave: (index: number) => void;
  }) {
    const { theme } = useUnistyles();
    const { index, unit, isActive, lyricProgress, selected, hovered, isCompact, inSearch, accent } =
      props;
    const showChrome = hovered || selected;
    const bilingual = unit.texts.length > 1;
    const unitLabel = unit.texts.join(" / ");

    const baseFontSize = (() => {
      if (isActive && inSearch) {
        return Number(theme.fontSize.base) || 16;
      }
      if (isActive) {
        return Number(theme.fontSize["2xl"]) || 24;
      }
      if (inSearch) {
        return Number(theme.fontSize.sm) || 14;
      }
      return Number(theme.fontSize.lg) || 18;
    })();
    const baseLineHeight =
      isActive && !inSearch ? 40 : isActive && inSearch ? 24 : inSearch ? 22 : 32;
    const secondaryFontSize = isActive
      ? Number(theme.fontSize.lg) || 18
      : Number(theme.fontSize.base) || 16;
    const secondaryLineHeight = isActive ? 28 : 24;

    // 已唱：强调色；未唱完：更暗的 muted，对比拉大（氛围壳上更易辨认）
    const litColor = theme.colors.accent;
    const pendingColor = theme.colors.foregroundMuted;
    const inactiveColor = theme.colors.foregroundMuted;

    return (
      <Pressable
        accessibilityRole="none"
        accessibilityLabel={`歌词：${unitLabel}`}
        onLayout={(event) => {
          props.onLayoutY(index, event.nativeEvent.layout.y);
        }}
        onPress={() => props.onLinePress(index, unit.timeSec)}
        style={[
          styles.lyricLineHit,
          bilingual ? styles.lyricLineHitBilingual : null,
          isCompact ? styles.lyricLineHitCompact : null,
          inSearch ? styles.lyricLineHitSearchTransport : null,
          hovered && !selected ? styles.lyricLineHovered : null,
          selected ? styles.lyricLineSelected : null,
        ]}
        {...({
          onMouseEnter: () => props.onHoverEnter(index),
          onMouseLeave: () => props.onHoverLeave(index),
        } as object)}
      >
        {unit.texts.map((text, textIndex) => {
          const isSecondary = textIndex > 0;
          const fontSize = isSecondary ? secondaryFontSize : baseFontSize;
          const lineHeight = isSecondary ? secondaryLineHeight : baseLineHeight;
          const fontWeight = isActive
            ? theme.fontWeight.bold
            : (theme.fontWeight.normal as TextStyle["fontWeight"]);
          const letterSpacing = isActive ? (isSecondary ? 0.15 : 0.3) : undefined;
          const opacity = isSecondary && !isActive ? 0.78 : isSecondary && isActive ? 1 : undefined;

          if (isActive && props.useCssKaraoke) {
            return (
              <MusicLyricKaraokeText
                key={`${index}-${textIndex}-k`}
                text={text}
                progress={lyricProgress}
                litColor={litColor}
                pendingColor={pendingColor}
                fontSize={fontSize}
                lineHeight={lineHeight}
                fontWeight={fontWeight}
                letterSpacing={letterSpacing}
                opacity={opacity}
                selectable={!isCompact}
                testID={textIndex === 0 ? `music-lyric-karaoke-${index}` : undefined}
              />
            );
          }

          if (isActive) {
            // native：整行点亮，不再拆字节点
            return (
              <MusicLyricPlainActiveText
                key={`${index}-${textIndex}-a`}
                text={text}
                selectable={!isCompact}
                style={[
                  styles.lyricLine,
                  isSecondary ? styles.lyricLineBilingualSecondary : null,
                  styles.lyricActive,
                  isSecondary ? styles.lyricActiveBilingualSecondary : null,
                  inSearch ? styles.lyricLineSearchTransport : null,
                  inSearch ? styles.lyricActiveSearchTransport : null,
                  { color: litColor },
                ]}
              />
            );
          }

          return (
            <Text
              key={`${index}-${textIndex}-${text}`}
              selectable={!isCompact}
              style={[
                styles.lyricLine,
                isSecondary ? styles.lyricLineBilingualSecondary : null,
                inSearch ? styles.lyricLineSearchTransport : null,
                { color: inactiveColor },
              ]}
              {...({
                dataSet: { lyricSelectable: isCompact ? "false" : "true" },
              } as object)}
            >
              {text}
            </Text>
          );
        })}
        {showChrome ? (
          <>
            <Text style={styles.lyricSelectTime} pointerEvents="none">
              {formatClock(unit.timeSec)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="播放此句"
              onPress={(event) => {
                event.stopPropagation?.();
                props.onPlayLine(unit.timeSec);
              }}
              style={styles.lyricSelectPlay}
              testID={`music-lyric-play-${index}`}
            >
              <Play size={14} color={accent} fill={accent} />
            </Pressable>
          </>
        ) : null}
      </Pressable>
    );
  },
  (prev, next) => {
    if (prev.isActive || next.isActive) {
      return (
        prev.isActive === next.isActive &&
        prev.lyricProgress === next.lyricProgress &&
        prev.selected === next.selected &&
        prev.hovered === next.hovered &&
        prev.isCompact === next.isCompact &&
        prev.inSearch === next.inSearch &&
        prev.accent === next.accent &&
        prev.useCssKaraoke === next.useCssKaraoke &&
        prev.unit === next.unit &&
        prev.index === next.index
      );
    }
    return (
      prev.index === next.index &&
      prev.selected === next.selected &&
      prev.hovered === next.hovered &&
      prev.isCompact === next.isCompact &&
      prev.inSearch === next.inSearch &&
      prev.accent === next.accent &&
      prev.unit === next.unit
    );
  },
);

function MusicLyricsKaraokeBlock(props: {
  lyricUnits: readonly { timeSec: number; texts: readonly string[] }[];
  progressLines: readonly { timeSec: number; text?: string }[];
  lyricsDensity: "compact" | "relaxed" | string;
  isCompact: boolean;
  inSearch: boolean;
  accent: string;
  lyricsScrollRef: MutableRefObject<ScrollView | null>;
  lyricLineOffsetRef: MutableRefObject<Map<number, number>>;
  lyricsUserBrowsing: boolean;
  lyricSelectedIndex: number | null;
  setLyricSelectedIndex: (index: number | null) => void;
  setLyricHoveredIndex: (
    updater: number | null | ((current: number | null) => number | null),
  ) => void;
  lyricHoveredIndex: number | null;
  markLyricsUserBrowsing: () => void;
  onLyricLinePress: (timeSec: number) => void;
  playing: boolean;
  /** Web：CSS background-clip 逐字；native：整行高亮 */
  useCssKaraoke: boolean;
  /** Tab 是否可见（多分组并存时只要显示就跟唱，不要求获焦）。 */
  paneVisible: boolean;
  /** 重新聚焦递增，强制滚到当前行。 */
  lyricsFollowEpoch: number;
  preferInstantLyricScrollRef: MutableRefObject<boolean>;
  followTopInsetPx: number;
  beginProgrammaticLyricsScroll: () => void;
  onClearBrowseTimer?: () => void;
}) {
  const highlight = usePlaybackLyricHighlight({
    units: props.lyricUnits,
    progressLines: props.progressLines,
  });
  const lyricActive = highlight.activeIndex;
  const lyricProgress = highlight.progress;
  const lyricDoubleTapRef = useRef<{ index: number; at: number } | null>(null);
  const lyricSelectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  /**
   * mount 即 pending：覆盖「切到需加载的新 Tab 导致 Music 卸载再挂」场景。
   * 该场景不会走 wasInteractive false→true，只能靠 remount 一次 instant snap。
   * 成功对齐后清除；若先 snap 到错误行（时钟未同步），activeIndex 变化时仍 instant。
   */
  const pendingInstantSnapRef = useRef(true);
  const snappedActiveIndexRef = useRef<number | null>(null);
  const activeIndexRef = useRef(lyricActive);
  activeIndexRef.current = lyricActive;

  const scrollToActiveLine = useCallback((input: { index: number; animated: boolean }): boolean => {
    const p = propsRef.current;
    if (input.index < 0 || p.lyricUnits.length === 0) {
      return false;
    }
    const offset = p.lyricLineOffsetRef.current.get(input.index);
    if (offset == null || !Number.isFinite(offset)) {
      return false;
    }
    p.beginProgrammaticLyricsScroll();
    p.lyricsScrollRef.current?.scrollTo({
      y: Math.max(0, offset - p.followTopInsetPx),
      animated: input.animated,
    });
    return true;
  }, []);

  const onLayoutY = useCallback(
    (index: number, y: number) => {
      propsRef.current.lyricLineOffsetRef.current.set(index, y);
      // 量到「当前播放行」且仍在 pending instant 时立刻对齐（不动画）。
      if (
        pendingInstantSnapRef.current &&
        index === activeIndexRef.current &&
        propsRef.current.paneVisible &&
        !propsRef.current.lyricsUserBrowsing &&
        propsRef.current.lyricSelectedIndex == null
      ) {
        if (scrollToActiveLine({ index, animated: false })) {
          snappedActiveIndexRef.current = index;
          // 仅当已对齐到当前 active 才结束 pending；时钟追上后 active 变了会再 snap
          if (index === activeIndexRef.current) {
            pendingInstantSnapRef.current = false;
            propsRef.current.preferInstantLyricScrollRef.current = false;
          }
        }
      }
    },
    [scrollToActiveLine],
  );

  const onPlayLine = useCallback((timeSec: number) => {
    propsRef.current.onLyricLinePress(timeSec);
  }, []);

  const onHoverEnter = useCallback((index: number) => {
    propsRef.current.setLyricHoveredIndex(index);
  }, []);

  const onHoverLeave = useCallback((index: number) => {
    propsRef.current.setLyricHoveredIndex((current) => (current === index ? null : current));
  }, []);

  const onLinePress = useCallback((index: number, timeSec: number) => {
    const p = propsRef.current;
    const now = Date.now();
    const prev = lyricDoubleTapRef.current;
    if (prev && prev.index === index && now - prev.at < 320) {
      lyricDoubleTapRef.current = null;
      if (lyricSelectTimerRef.current) {
        clearTimeout(lyricSelectTimerRef.current);
        lyricSelectTimerRef.current = null;
      }
      p.onLyricLinePress(timeSec);
      return;
    }
    lyricDoubleTapRef.current = { index, at: now };
    if (lyricSelectTimerRef.current) {
      clearTimeout(lyricSelectTimerRef.current);
    }
    lyricSelectTimerRef.current = setTimeout(() => {
      lyricSelectTimerRef.current = null;
      if (p.lyricSelectedIndex === index) {
        p.setLyricSelectedIndex(null);
        if (typeof window !== "undefined") {
          window.getSelection()?.removeAllRanges();
        }
        return;
      }
      if (typeof window !== "undefined") {
        window.getSelection()?.removeAllRanges();
      }
      p.onClearBrowseTimer?.();
      p.setLyricSelectedIndex(index);
    }, 280);
  }, []);

  useEffect(() => {
    return () => {
      if (lyricSelectTimerRef.current) {
        clearTimeout(lyricSelectTimerRef.current);
      }
    };
  }, []);

  // 重新聚焦 / epoch：仅当调用方显式 preferInstant 时进入 pending。
  useEffect(() => {
    if (props.preferInstantLyricScrollRef.current) {
      pendingInstantSnapRef.current = true;
    }
  }, [props.lyricsFollowEpoch, props.preferInstantLyricScrollRef]);

  useEffect(() => {
    if (
      !props.paneVisible ||
      props.lyricsUserBrowsing ||
      props.lyricSelectedIndex != null ||
      lyricActive < 0 ||
      props.lyricUnits.length === 0
    ) {
      return;
    }

    // remount 后若曾 snap 到旧 active（如顶部），时钟追上真实行时仍 instant
    const forceInstant =
      pendingInstantSnapRef.current ||
      props.preferInstantLyricScrollRef.current ||
      (snappedActiveIndexRef.current != null &&
        snappedActiveIndexRef.current !== lyricActive &&
        lyricActive >= 0);
    // 非播放：只做 instant snap；正常跟唱仍要求 playing。
    if (!props.playing && !forceInstant) {
      return;
    }

    const tryScroll = (): boolean => {
      const ok = scrollToActiveLine({
        index: lyricActive,
        animated: !forceInstant,
      });
      if (ok) {
        snappedActiveIndexRef.current = lyricActive;
        if (forceInstant) {
          pendingInstantSnapRef.current = false;
          props.preferInstantLyricScrollRef.current = false;
        }
      }
      return ok;
    };

    if (tryScroll()) {
      return;
    }

    // offset 未就绪：instant 多等一会儿（onLayout 兜底）；普通跟唱短重试即可。
    let cancelled = false;
    let attempts = 0;
    let raf = 0;
    const maxAttempts = forceInstant ? 45 : 8;
    const tick = () => {
      if (cancelled) {
        return;
      }
      attempts += 1;
      if (tryScroll() || attempts >= maxAttempts) {
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [
    lyricActive,
    props.lyricSelectedIndex,
    props.lyricUnits.length,
    props.lyricsFollowEpoch,
    props.lyricsUserBrowsing,
    props.paneVisible,
    props.playing,
    props.preferInstantLyricScrollRef,
    scrollToActiveLine,
  ]);

  return (
    <View
      style={styles.lyricsFadeHost}
      {...({ className: "agnx-music-lyrics-fade-host" } as object)}
    >
      <ScrollView
        ref={props.lyricsScrollRef}
        style={styles.lyricsPane}
        contentContainerStyle={[
          styles.lyricsContent,
          props.lyricsDensity === "relaxed" ? styles.lyricsContentRelaxed : null,
          props.isCompact ? styles.lyricsContentCompact : null,
          props.isCompact && props.lyricsDensity === "relaxed"
            ? styles.lyricsContentCompactRelaxed
            : null,
          props.inSearch ? styles.lyricsContentSearchTransport : null,
          props.inSearch && props.lyricsDensity === "relaxed"
            ? styles.lyricsContentSearchTransportRelaxed
            : null,
        ]}
        testID="workspace-mini-app-music-lyrics"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={props.markLyricsUserBrowsing}
        onContentSizeChange={() => {
          // 列表高度变化后补一次 instant snap（remount / 切 Tab 后常见）
          const need =
            pendingInstantSnapRef.current ||
            propsRef.current.preferInstantLyricScrollRef.current ||
            (snappedActiveIndexRef.current != null &&
              snappedActiveIndexRef.current !== activeIndexRef.current);
          if (!need) {
            return;
          }
          if (
            !propsRef.current.paneVisible ||
            propsRef.current.lyricsUserBrowsing ||
            propsRef.current.lyricSelectedIndex != null
          ) {
            return;
          }
          const index = activeIndexRef.current;
          if (index < 0) {
            return;
          }
          if (scrollToActiveLine({ index, animated: false })) {
            pendingInstantSnapRef.current = false;
            propsRef.current.preferInstantLyricScrollRef.current = false;
          }
        }}
        {...({
          className: "agnx-music-lyrics-scroll",
          dataSet: { scrollbar: "hidden" },
          onWheel: props.markLyricsUserBrowsing,
        } as object)}
      >
        {props.lyricUnits.length === 0 ? (
          <View style={styles.lyricsEmptyWrap}>
            <Text style={styles.lyricsEmpty}>暂无歌词，请欣赏</Text>
          </View>
        ) : (
          props.lyricUnits.map((unit, index) => (
            <MusicLyricLineRow
              key={`${unit.timeSec}-${index}-${unit.texts.join(" / ")}`}
              index={index}
              unit={unit}
              isActive={index === lyricActive}
              lyricProgress={lyricProgress}
              selected={index === props.lyricSelectedIndex}
              hovered={index === props.lyricHoveredIndex}
              isCompact={props.isCompact}
              inSearch={props.inSearch}
              accent={props.accent}
              useCssKaraoke={props.useCssKaraoke}
              onLayoutY={onLayoutY}
              onLinePress={onLinePress}
              onPlayLine={onPlayLine}
              onHoverEnter={onHoverEnter}
              onHoverLeave={onHoverLeave}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function MusicSearchTransportLyrics(props: {
  lyricUnits: readonly { timeSec: number; texts: readonly string[] }[];
  progressLines: readonly { timeSec: number; text?: string }[];
  onShowControls: () => void;
  useCssKaraoke: boolean;
  litColor: string;
  pendingColor: string;
  primaryFontSize: number;
  primaryLineHeight: number;
  secondaryFontSize: number;
  secondaryLineHeight: number;
  fontWeight: TextStyle["fontWeight"];
  stackStyle: StyleProp<ViewStyle>;
  stripStyle: StyleProp<ViewStyle>;
  primaryTextStyle: StyleProp<TextStyle>;
  secondaryTextStyle: StyleProp<TextStyle>;
}) {
  const highlight = usePlaybackLyricHighlight({
    units: props.lyricUnits,
    progressLines: props.progressLines,
  });
  const lyricActive = highlight.activeIndex;
  const lyricProgress = highlight.progress;
  const searchActiveUnit =
    lyricActive >= 0 && props.lyricUnits[lyricActive] ? props.lyricUnits[lyricActive] : null;
  const searchActivePrimary = searchActiveUnit?.texts[0] ?? "";
  const searchActiveSecondary =
    searchActiveUnit && searchActiveUnit.texts.length > 1 ? (searchActiveUnit.texts[1] ?? "") : "";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        searchActiveUnit
          ? `歌词：${searchActiveUnit.texts.join(" / ")}，点按显示播放控制`
          : "暂无歌词，点按显示播放控制"
      }
      onPress={props.onShowControls}
      style={props.stripStyle}
      testID="music-search-transport-lyrics"
    >
      <View style={props.stackStyle}>
        <SearchDesktopLyricScroller
          key={`primary-${lyricActive}`}
          text={searchActivePrimary}
          progress={lyricProgress}
          emptyLabel="暂无歌词，请欣赏"
          useCssKaraoke={props.useCssKaraoke}
          litColor={props.litColor}
          pendingColor={props.pendingColor}
          fontSize={props.primaryFontSize}
          lineHeight={props.primaryLineHeight}
          fontWeight={props.fontWeight}
          textStyle={props.primaryTextStyle}
        />
        {searchActiveSecondary ? (
          <SearchDesktopLyricScroller
            key={`secondary-${lyricActive}`}
            text={searchActiveSecondary}
            progress={lyricProgress}
            emptyLabel=""
            useCssKaraoke={props.useCssKaraoke}
            litColor={props.litColor}
            pendingColor={props.pendingColor}
            fontSize={props.secondaryFontSize}
            lineHeight={props.secondaryLineHeight}
            fontWeight={props.fontWeight}
            textStyle={props.secondaryTextStyle}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function MusicPlayerContent(props: { appId: string; panelId: string; entityId: string }) {
  const { theme, rt } = useUnistyles();
  const isCompact = rt.breakpoint === "xs" || rt.breakpoint === "sm";
  const mutedIcon = theme.colors.foregroundMuted;
  const accent = theme.colors.accent;

  const track = useMusicDemoStore((state) => {
    if (props.entityId === MUSIC_PLAYER_ENTITY_ID) {
      const playingId = state.nowPlayingId;
      return playingId ? state.tracks.find((item) => item.id === playingId) : undefined;
    }
    return state.tracks.find((item) => item.id === props.entityId);
  });
  const libraryHydrationReady = useSyncExternalStore(
    subscribeMusicHostHydration,
    getMusicHostHydrationCompleted,
    getMusicHostHydrationCompleted,
  );
  const tracks = useMusicDemoStore((state) => state.tracks);
  const queueIds = useMusicDemoStore((state) => state.queueIds);
  const playMode = useMusicDemoStore((state) => state.playMode);
  const volume = useMusicDemoStore((state) => state.volume);
  const muted = useMusicDemoStore((state) => state.muted);
  const coverHidden = useMusicDemoStore((state) => state.coverHidden);
  const lyricsDensity = useMusicDemoStore((state) => state.lyricsDensity);
  const setNowPlaying = useMusicDemoStore((state) => state.setNowPlaying);
  const cyclePlayMode = useMusicDemoStore((state) => state.cyclePlayMode);
  const setVolume = useMusicDemoStore((state) => state.setVolume);
  const setMuted = useMusicDemoStore((state) => state.setMuted);
  const setCoverHidden = useMusicDemoStore((state) => state.setCoverHidden);
  const setPlaybackPosition = useMusicDemoStore((state) => state.setPlaybackPosition);
  const setWantsPlaying = useMusicDemoStore((state) => state.setWantsPlaying);
  const playNext = useMusicDemoStore((state) => state.playNext);
  const playPrevious = useMusicDemoStore((state) => state.playPrevious);
  const removeFromQueue = useMusicDemoStore((state) => state.removeFromQueue);
  const moveQueueItem = useMusicDemoStore((state) => state.moveQueueItem);
  const upsertTrackFromSearchHit = useMusicDemoStore((state) => state.upsertTrackFromSearchHit);
  const setQueueIds = useMusicDemoStore((state) => state.setQueueIds);

  const addToQueue = useMusicDemoStore((state) => state.addToQueue);
  const { layout: actionLayout, openEditLayout: openPlayerEntityEditLayout } =
    useMusicTrackEntityMenuLayout(MUSIC_TRACK_MENU_SURFACE.player);
  // 搜索 / 音量：固定铬层，不进编辑布局；底栏+三点只投影曲目操作（与侧栏菜单项同源、布局独立）
  const showShellSearch = true;
  const showShellVolume = true;

  const playerSurface = useMusicDemoStore((state) => state.playerSurface);
  const setPlayerSurface = useMusicDemoStore((state) => state.setPlayerSurface);
  const atmospherePushEnabled = useMusicDemoStore((state) => state.atmospherePushEnabled);
  const coverBackdropEnabled = useMusicDemoStore((state) => state.coverBackdropEnabled);
  const coverBackdropBlur = useMusicDemoStore((state) => state.coverBackdropBlur);
  const coverBackdropOpacity = useMusicDemoStore((state) => state.coverBackdropOpacity);
  const coverBackdropIncludeTabBar = useMusicDemoStore((state) => state.coverBackdropIncludeTabBar);
  const wantsPlaying = useMusicDemoStore((state) => state.wantsPlaying);
  const [playing, setPlaying] = useState(false);
  const setError = useCallback((message: string | null) => {
    if (!message) {
      return;
    }
    notifyMusicPlayerError(message);
  }, []);
  const [duration, setDuration] = useState(0);
  const [bufferedProgress, setBufferedProgress] = useState(0);
  const currentTimeRef = useRef(0);
  /** 进度进外部时钟 store，父树不再因 timeupdate setState。 */
  const commitPlaybackUiTime = useCallback((time: number, force = false) => {
    currentTimeRef.current = time;
    publishPlaybackUiTime(time, force);
  }, []);
  const [queueOpen, setQueueOpen] = useState(false);
  const [compactVolumeOpen, setCompactVolumeOpen] = useState(false);
  const [seekPreview, setSeekPreview] = useState<{ visible: boolean; ratio: number }>({
    visible: false,
    ratio: 0,
  });
  const setPlaceholderToast = useCallback((message: string | null) => {
    if (!message) {
      return;
    }
    notifyMusicPlayerToast(message);
  }, []);
  /** 搜索点播：音流解析中（底栏已切歌，需展示加载态） */
  const [streamResolving, setStreamResolving] = useState(false);
  /** 桌面搜索底栏中区：播放三键 ↔ 歌词（状态跨 HMR 保留） */
  const [searchCenterControlsOpen, setSearchCenterControlsOpen] = useState(
    readPersistedSearchCenterControlsOpen,
  );
  const [controlTitles, setControlTitles] = useState<Record<string, string>>({});
  const [controlShortcutKeys, setControlShortcutKeys] = useState<Record<string, readonly string[]>>(
    {},
  );
  const [coverDisplay, setCoverDisplay] = useState<{ trackId: string; uri: string } | null>(null);
  /** 仅当展示 URI 属于当前曲目时才用，避免切歌瞬间错绑上一首封面/氛围。 */
  const coverDisplayUri =
    coverDisplay && track?.id && coverDisplay.trackId === track.id ? coverDisplay.uri : null;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  /** 当前 audio 元素已 load 的曲目 id；用于区分「同曲续播」与「切歌仍在播旧源」。 */
  const loadedTrackIdRef = useRef<string | null>(null);
  /** 与 loadedTrackIdRef 配对：sourceUri 从云端换成本地路径时必须重载，不能只比 id。 */
  const loadedSourceUriRef = useRef<string | null>(null);
  const resumeAfterLoadRef = useRef(false);
  /** 云端直链失败后已试过的 URL，避免死循环换源。 */
  const cloudTriedUrlsRef = useRef<Set<string>>(new Set());
  const cloudRetryingRef = useRef(false);
  const recoverCloudPlaybackRef = useRef<(failedUrl: string) => Promise<boolean>>(
    async () => false,
  );
  /** 搜索点播解析代数：切歌 / 再点另一首时作废进行中的 resolve */
  const searchResolveGenerationRef = useRef(0);
  /** 进度条右侧音量切换：progress | volume 同槽 */
  const [transportSliderMode, setTransportSliderMode] = useState<"progress" | "volume">("progress");
  const [desktopVolumeHoverOpen, setDesktopVolumeHoverOpen] = useState(false);
  const volumeCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lyricsScrollRef = useRef<ScrollView | null>(null);
  const lyricLineOffsetRef = useRef<Map<number, number>>(new Map());
  const lyricsEnrichingRef = useRef<string | null>(null);
  const lyricsBrowseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lyricsProgrammaticScrollRef = useRef(false);
  const lyricsProgrammaticClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lyricsUserBrowsing, setLyricsUserBrowsing] = useState(false);
  const [lyricHoveredIndex, setLyricHoveredIndex] = useState<number | null>(null);
  const [lyricSelectedIndex, setLyricSelectedIndex] = useState<number | null>(null);
  /** Music Tab / pane 是否前台可交互；切回时用于立刻跟唱定位并恢复动画。 */
  const [paneInteractive, setPaneInteractive] = useState(() =>
    isThisMiniAppPaneInteractive({
      appId: props.appId,
      panelId: props.panelId,
      entityId: props.entityId,
    }),
  );
  const [paneVisible, setPaneVisible] = useState(() =>
    isThisMiniAppPaneVisible({
      appId: props.appId,
      panelId: props.panelId,
      entityId: props.entityId,
    }),
  );
  /** 每次重新聚焦 +1，驱动歌词滚动即使 activeIndex 未变。 */
  const [lyricsFollowEpoch, setLyricsFollowEpoch] = useState(0);
  /**
   * remount / 初次进入前台：默认 instant 一次。
   * 切到「需新加载」的 Tab 常会卸掉 Music，回来时不会触发 wasInteractive 边沿。
   */
  const preferInstantLyricScrollRef = useRef(true);
  const paneInteractiveRef = useRef(paneInteractive);
  paneInteractiveRef.current = paneInteractive;
  const paneVisibleRef = useRef(paneVisible);
  paneVisibleRef.current = paneVisible;
  const [desktopStageWidth, setDesktopStageWidth] = useState(0);
  const isWeb = host().platform.isWeb;

  /**
   * 组件 remount 恢复：同步真实 audio 时间并请求歌词 instant snap。
   * 场景：从 Music 切到尚未加载的 Agent Tab（触发卸载），再切回 Music。
   */
  useEffect(() => {
    const audio = getMusicPlaybackAudio();
    const live = audio?.currentTime;
    if (typeof live === "number" && Number.isFinite(live) && live > 0) {
      commitPlaybackUiTime(live, true);
    }
    preferInstantLyricScrollRef.current = true;
    // 短延迟：等 layout + highlight 吃到 force 时间（避免嵌套 rAF 触发 max-nested-callbacks）
    const timer = setTimeout(() => {
      preferInstantLyricScrollRef.current = true;
      setLyricsFollowEpoch((epoch) => epoch + 1);
    }, 32);
    return () => {
      clearTimeout(timer);
    };
    // 仅 mount 一次；不要绑 track/playing 以免切歌重复闪
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount recovery only
  }, []);

  const lyricLines = useMemo(() => parseLyrics(track?.lyrics), [track?.lyrics]);
  const lyricUnits = useMemo(() => groupLyricUnits(lyricLines), [lyricLines]);
  const lyricFontSizePx = (() => {
    const active = theme.fontSize["2xl"];
    if (typeof active === "number") {
      return active;
    }
    const parsed = Number(active);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
  })();
  const desktopStageSplit = useMemo(() => {
    const maxLyricWidth = maxLyricContentWidthPx(lyricUnits, lyricFontSizePx);
    return resolveDesktopStageSplit({
      stageWidthPx: desktopStageWidth,
      maxLyricContentWidthPx: maxLyricWidth,
    });
  }, [desktopStageWidth, lyricFontSizePx, lyricUnits]);
  const handleDesktopStageLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setDesktopStageWidth((prev) => (prev === next ? prev : next));
  }, []);
  const lyricProgressLines = useMemo(
    () =>
      lyricUnits.map((unit) => ({
        timeSec: unit.timeSec,
        // 末组估时用组内最长行，避免双语短译文把窗口估太短
        text: unit.texts.reduce(
          (best, text) => (Array.from(text).length > Array.from(best).length ? text : best),
          "",
        ),
      })),
    [lyricUnits],
  );
  const lyricSelectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueTracks = useMemo(() => {
    const known = new Map(tracks.map((item) => [item.id, item]));
    const fromQueue = queueIds
      .map((id) => known.get(id))
      .filter((item): item is DemoTrack => item != null);
    return fromQueue.length > 0 ? fromQueue : tracks;
  }, [queueIds, tracks]);

  useEffect(() => {
    cloudTriedUrlsRef.current = new Set();
    cloudRetryingRef.current = false;
  }, [track?.id]);

  useEffect(() => {
    recoverCloudPlaybackRef.current = async (failedUrl: string) => {
      const state = useMusicDemoStore.getState();
      const currentId = state.nowPlayingId;
      const current = currentId ? state.getTrack(currentId) : undefined;
      if (!current || current.sourceKind !== "cloud") {
        return false;
      }
      const normalizedFailed = failedUrl.trim();
      if (normalizedFailed) {
        cloudTriedUrlsRef.current.add(normalizedFailed);
      }
      if (current.sourceUri?.trim()) {
        cloudTriedUrlsRef.current.add(current.sourceUri.trim());
      }
      if (cloudRetryingRef.current) {
        return false;
      }
      if (cloudTriedUrlsRef.current.size > 8) {
        setError(cloudPlaybackGaveUpMessage());
        return false;
      }
      cloudRetryingRef.current = true;
      setError(formatMusicPlaybackError(new Error("no supported source"), { cloud: true }));
      try {
        const alternates = await findCloudPlayableAlternates({
          title: current.title,
          artist: current.artist,
          excludeUrls: cloudTriedUrlsRef.current,
          preferProviderId: current.remoteRef?.providerId,
          limit: 6,
        });
        const next = alternates[0];
        if (!next?.url) {
          setError(cloudPlaybackGaveUpMessage());
          return false;
        }
        cloudTriedUrlsRef.current.add(next.url);
        resumeAfterLoadRef.current = true;
        state.updateTrack(current.id, {
          sourceUri: next.url,
          sourceKind: "cloud",
          remoteRef: {
            providerId: next.providerId,
            remoteId: next.remoteId,
            pageUrl: current.remoteRef?.pageUrl,
          },
        });
        return true;
      } catch {
        setError(cloudPlaybackGaveUpMessage());
        return false;
      } finally {
        cloudRetryingRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!isWeb) {
      return;
    }
    const audio = getMusicPlaybackAudio();
    if (!audio) {
      return;
    }
    audioRef.current = audio;
    ensureMusicPlaybackRuntime();
    const unsubscribeUi = subscribeMusicPlaybackUi({
      onTimeUpdate: (time) => {
        currentTimeRef.current = time;
        // 窗口隐藏 / Music Tab 未聚焦：不推 UI 时钟
        if (typeof document !== "undefined" && document.hidden) {
          return;
        }
        if (
          !isThisMiniAppPaneVisible({
            appId: props.appId,
            panelId: props.panelId,
            entityId: props.entityId,
          })
        ) {
          return;
        }
        commitPlaybackUiTime(time);
      },
      onPlayingChange: (nextPlaying) => {
        setPlaying(nextPlaying);
      },
    });
    const updateBuffered = () => {
      try {
        const playingId = useMusicDemoStore.getState().nowPlayingId;
        const playingTrack = playingId
          ? useMusicDemoStore.getState().tracks.find((item) => item.id === playingId)
          : undefined;
        if (
          playingTrack?.sourceKind === "local" &&
          isMusicLocalPersistedUri(playingTrack.sourceUri)
        ) {
          setBufferedProgress((prev) => (prev === 1 ? prev : 1));
          return;
        }
        const total = audio.duration || 0;
        if (
          !(total > 0) ||
          !Number.isFinite(total) ||
          !audio.buffered ||
          audio.buffered.length === 0
        ) {
          return;
        }
        const end = audio.buffered.end(audio.buffered.length - 1);
        // 量化到 0.5%，避免 progress 事件浮点抖动打满父树重渲染。
        const next = Math.min(1, Math.max(0, Math.round((end / total) * 200) / 200));
        setBufferedProgress((prev) => (prev === next ? prev : next));
      } catch {
        // ignore InvalidStateError while metadata loading
      }
    };
    const handleMeta = () => {
      setDuration(audio.duration || 0);
      updateBuffered();
    };
    const handleError = () => {
      setPlaying(false);
      useMusicDemoStore.getState().setWantsPlaying(false);
      const state = useMusicDemoStore.getState();
      const current = state.nowPlayingId ? state.getTrack(state.nowPlayingId) : undefined;
      const failedUrl = (audio.currentSrc || audio.src || current?.sourceUri || "").trim();
      if (current?.sourceKind === "cloud") {
        void (async () => {
          const recovered = await recoverCloudPlaybackRef.current(failedUrl);
          if (!recovered) {
            setError(cloudPlaybackGaveUpMessage());
          }
        })();
        return;
      }
      setError(formatMusicPlaybackError(new Error("no supported source")));
    };
    audio.addEventListener("loadedmetadata", handleMeta);
    audio.addEventListener("durationchange", handleMeta);
    audio.addEventListener("progress", updateBuffered);
    audio.addEventListener("loadeddata", updateBuffered);
    audio.addEventListener("canplaythrough", updateBuffered);
    audio.addEventListener("error", handleError);
    // remount 时立刻从单例同步时长，避免先渲染 0:00；事件若已错过则再等 metadata。
    const mountDuration = readMusicPlaybackDurationSec(audio);
    if (mountDuration > 0) {
      setDuration(mountDuration);
      commitPlaybackUiTime(audio.currentTime || 0, true);
      setPlaying(!audio.paused);
    } else {
      void whenMusicPlaybackMetadataReady(audio).then((sec) => {
        if (sec > 0) {
          setDuration(sec);
        }
        return undefined;
      });
      if (Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
        commitPlaybackUiTime(audio.currentTime, true);
      }
      setPlaying(!audio.paused);
    }
    return () => {
      // 卸载 UI（进设置/切 Tab）时固化一次进度；播放中不再每秒写 store。
      syncMusicPlaybackPositionToStore(true);
      // ended/timeupdate 由 playback-runtime 常驻；卸载 UI 不得拆除，否则设置页会冻进度/不切歌。
      unsubscribeUi();
      audio.removeEventListener("loadedmetadata", handleMeta);
      audio.removeEventListener("durationchange", handleMeta);
      audio.removeEventListener("progress", updateBuffered);
      audio.removeEventListener("loadeddata", updateBuffered);
      audio.removeEventListener("canplaythrough", updateBuffered);
      audio.removeEventListener("error", handleError);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [commitPlaybackUiTime, isWeb, props.appId, props.entityId, props.panelId]);

  useEffect(() => {
    applyMusicPlaybackVolume(volume, muted);
  }, [muted, volume]);

  // 后台续播时钉住 music Tab：避免开新 Tab 触发 LRU 卸载 → remount hard-load 顿挫
  useEffect(() => {
    const active = wantsPlaying || playing;
    setMusicPlaybackBackgroundActive(active);
    return () => {
      // 仅在本实例曾声明 active 时，卸载且不再续播才清；续播中卸载由 retain 尽量避免
      if (!useMusicDemoStore.getState().wantsPlaying) {
        setMusicPlaybackBackgroundActive(false);
      }
    };
  }, [playing, wantsPlaying]);

  useEffect(() => {
    // 重挂载时从全局 meta 恢复 loaded*，避免误判成新曲 hard-load
    const meta = getMusicPlaybackLoadedMeta();
    if (meta && !loadedTrackIdRef.current) {
      loadedTrackIdRef.current = meta.trackId;
      loadedSourceUriRef.current = meta.sourceUri;
    }
  }, []);

  useEffect(() => {
    if (muted) {
      setCompactVolumeOpen(false);
      setDesktopVolumeHoverOpen(false);
    }
  }, [muted]);

  useEffect(() => {
    if (!isCompact) {
      setTransportSliderMode("progress");
    }
  }, [isCompact]);

  useEffect(() => {
    const timerRef = volumeCloseTimerRef;
    return () => {
      const timer = timerRef.current;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sessionTrackId = track?.id ?? null;
    const audio = audioRef.current ?? getMusicPlaybackAudio();
    if (audio && audioRef.current !== audio) {
      audioRef.current = audio;
    }

    // 换曲：先停旧源，避免标题已是新歌却仍在出旧声；UI 进度立刻归零
    if (
      audio &&
      loadedTrackIdRef.current &&
      sessionTrackId &&
      loadedTrackIdRef.current !== sessionTrackId
    ) {
      prepareMusicPlaybackSourceChange();
      commitPlaybackUiTime(0, true);
      setDuration(0);
      setBufferedProgress(0);
    }

    if (!audio || !track?.sourceUri) {
      // 单例仍在播：勿清 src / 勿把 UI 进度打成 0（设置返回瞬间 track 可能短暂未就绪）。
      if (audio && !audio.paused && audio.src) {
        setPlaying(true);
        commitPlaybackUiTime(audio.currentTime || 0, true);
        const liveDuration =
          Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        if (liveDuration > 0) {
          setDuration(liveDuration);
        }
        return () => {
          cancelled = true;
        };
      }
      // 新曲尚无 URL（搜索解析中）：静音等待，清掉已加载标记
      if (audio && sessionTrackId && loadedTrackIdRef.current !== sessionTrackId) {
        prepareMusicPlaybackSourceChange();
        try {
          audio.removeAttribute("src");
          audio.load();
        } catch {
          // ignore
        }
        loadedTrackIdRef.current = null;
        loadedSourceUriRef.current = null;
      }
      setError(null);
      setPlaying(false);
      commitPlaybackUiTime(0, true);
      setDuration(0);
      setBufferedProgress(0);
      if (!track?.sourceUri) {
        loadedTrackIdRef.current = null;
        loadedSourceUriRef.current = null;
      }
      return;
    }
    setError(null);
    const playingFromLocalDisk =
      track.sourceKind === "local" && isMusicLocalPersistedUri(track.sourceUri);
    if (playingFromLocalDisk) {
      setBufferedProgress(1);
    }
    const shouldResume =
      resumeAfterLoadRef.current ||
      takePendingAutoPlayTrackId(track.id) ||
      (useMusicDemoStore.getState().wantsPlaying &&
        track.id === useMusicDemoStore.getState().nowPlayingId);
    // 换到另一首歌时绝不能沿用上一首的 currentTime / 被竞态写脏的全局进度。
    const switchingTrack =
      loadedTrackIdRef.current != null && loadedTrackIdRef.current !== track.id;
    // 仅在同曲重挂载时读取持久化进度；不要把 playbackPositionSec 放进依赖，
    // 否则 seek/暂停边界写回进度也会触发整段 audio 重载。
    // hard-load 前取 store / 同步会话块 / 单例 currentTime 较大值，硬刷新不丢进度。
    const sessionSnap = readMusicPlaybackSessionSnapshotSync();
    const sessionPos =
      sessionSnap && sessionSnap.nowPlayingId === track.id
        ? sessionSnap.playbackPositionSec
        : 0;
    const resumeAt = resolveMusicResumePositionSec({
      switchingTrack,
      nowPlayingMatches: track.id === useMusicDemoStore.getState().nowPlayingId,
      storePositionSec: Math.max(
        useMusicDemoStore.getState().playbackPositionSec,
        sessionPos,
      ),
      audioCurrentTimeSec: audio.currentTime || 0,
    });
    if (!switchingTrack && resumeAt > useMusicDemoStore.getState().playbackPositionSec) {
      useMusicDemoStore.getState().setPlaybackPosition(resumeAt);
    }
    resumeAfterLoadRef.current = false;

    // 从设置/Tab 关闭后返回：同曲单例仍挂着 src（含暂停）时禁止 hard-load 归零。
    const attachedOnSameTrack = isMusicPlaybackAttachedOnTrack({
      trackId: track.id,
      sourceUri: track.sourceUri,
      nowPlayingId: useMusicDemoStore.getState().nowPlayingId,
      audio,
      loadedTrackId: loadedTrackIdRef.current,
      loadedSourceUri: loadedSourceUriRef.current,
    });
    if (attachedOnSameTrack) {
      loadedTrackIdRef.current = track.id;
      loadedSourceUriRef.current = track.sourceUri;
      setMusicPlaybackLoadedMeta({ trackId: track.id, sourceUri: track.sourceUri });
      syncMusicPlaybackPositionToStore(true);
      const liveAt = Math.max(0, audio.currentTime || resumeAt || 0);
      commitPlaybackUiTime(liveAt, true);
      const liveDuration = readMusicPlaybackDurationSec(audio);
      setDuration(liveDuration);
      if (!(liveDuration > 0)) {
        const onMeta = () => {
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            return;
          }
          const next = readMusicPlaybackDurationSec(audio);
          if (next > 0) {
            setDuration(next);
          }
          commitPlaybackUiTime(audio.currentTime || 0, true);
        };
        audio.addEventListener("loadedmetadata", onMeta, { once: true });
        void whenMusicPlaybackMetadataReady(audio).then((sec) => {
          if (!cancelled && sec > 0) {
            setDuration(sec);
          }
          return undefined;
        });
      }
      if (playingFromLocalDisk) {
        setBufferedProgress(1);
      }
      setStreamResolving(false);
      if (shouldResume && audio.paused) {
        void safeMusicPlay(audio).then((ok) => {
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            return undefined;
          }
          if (ok) {
            setPlaying(true);
            setWantsPlaying(true);
          } else {
            setPlaying(false);
            setWantsPlaying(true);
            void maybeRestoreMusicPlaybackAfterColdStart();
          }
          return undefined;
        });
      } else {
        setPlaying(!audio.paused);
      }
      return () => {
        cancelled = true;
      };
    }

    // 同曲换源（云播落盘→本地）：保留进度软切，避免 pause+归零导致卡一下
    const sameTrackUriSwap =
      loadedTrackIdRef.current === track.id &&
      loadedSourceUriRef.current != null &&
      loadedSourceUriRef.current !== track.sourceUri &&
      track.id === useMusicDemoStore.getState().nowPlayingId &&
      Boolean(audio.src);
    if (sameTrackUriSwap) {
      const preserveAt = Math.max(0, audio.currentTime || resumeAt || 0);
      const wasPlaying =
        !audio.paused || shouldResume || Boolean(useMusicDemoStore.getState().wantsPlaying);
      if (playingFromLocalDisk) {
        setBufferedProgress(1);
      }
      void (async () => {
        const rawUri = track.sourceUri!;
        try {
          const resolvedUri = /^https?:\/\//.test(rawUri)
            ? rawUri
            : await host().files.resolveObjectUrl(rawUri);
          const referer = getMusicProviderReferer(track.remoteRef?.providerId);
          const uri = /^https?:\/\//.test(resolvedUri)
            ? await resolveMusicPlayableSrc(resolvedUri, { referer })
            : resolvedUri;
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            return;
          }
          if (objectUrlRef.current?.startsWith("blob:") && objectUrlRef.current !== uri) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
          objectUrlRef.current = uri;
          // 勿 prepareMusicPlaybackSourceChange：会 pause 并 currentTime=0
          const playbackAudio = setMusicPlaybackSrc(audio, uri);
          audioRef.current = playbackAudio;
          const onReady = () => {
            if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
              return;
            }
            try {
              if (
                preserveAt > 0 &&
                Number.isFinite(playbackAudio.duration) &&
                preserveAt < playbackAudio.duration
              ) {
                playbackAudio.currentTime = preserveAt;
              }
            } catch {
              // ignore
            }
            commitPlaybackUiTime(playbackAudio.currentTime || preserveAt, true);
            setDuration(playbackAudio.duration || 0);
            if (playingFromLocalDisk) {
              setBufferedProgress(1);
            }
            if (wasPlaying) {
              void safeMusicPlay(playbackAudio).then((ok) => {
                if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
                  setStreamResolving(false);
                  return undefined;
                }
                if (ok) {
                  setPlaying(true);
                  setWantsPlaying(true);
                  setStreamResolving(false);
                } else {
                  setPlaying(false);
                  setWantsPlaying(true);
                  setStreamResolving(false);
                  void maybeRestoreMusicPlaybackAfterColdStart();
                }
                return undefined;
              });
            } else {
              setStreamResolving(false);
            }
          };
          loadedTrackIdRef.current = track.id;
          loadedSourceUriRef.current = rawUri;
          setMusicPlaybackLoadedMeta({ trackId: track.id, sourceUri: rawUri });
          playbackAudio.addEventListener("loadeddata", onReady, { once: true });
          void playbackAudio.load();
        } catch (loadError) {
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            return;
          }
          if (isMusicPlayInterruptedError(loadError)) {
            setStreamResolving(false);
            return;
          }
          setStreamResolving(false);
          const message = formatMusicPlaybackError(loadError);
          if (message) {
            setError(message);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!playingFromLocalDisk) {
      setBufferedProgress(0);
    }
    setPlaying(false);
    commitPlaybackUiTime(resumeAt, true);
    // 恢复进度只依赖 store.playbackPositionSec + audio.currentTime；播放中不再每秒回写 store。
    void (async () => {
      const rawUri = track.sourceUri!;
      try {
        const resolvedUri = /^https?:\/\//.test(rawUri)
          ? rawUri
          : await host().files.resolveObjectUrl(rawUri);
        const referer = getMusicProviderReferer(track.remoteRef?.providerId);
        const uri = /^https?:\/\//.test(resolvedUri)
          ? await resolveMusicPlayableSrc(resolvedUri, { referer })
          : resolvedUri;
        if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
          return;
        }
        const loadedMeta = getMusicPlaybackLoadedMeta();
        // 同曲同源已挂好时不要换 blob / load（含暂停重挂载；须比对目标 uri）
        const sameSrc =
          Boolean(audio.src) &&
          (audio.src === uri || objectUrlRef.current === uri) &&
          (loadedTrackIdRef.current === track.id || loadedMeta?.trackId === track.id);
        if (sameSrc) {
          loadedTrackIdRef.current = track.id;
          loadedSourceUriRef.current = rawUri;
          setMusicPlaybackLoadedMeta({ trackId: track.id, sourceUri: rawUri });
          syncMusicPlaybackPositionToStore(true);
          commitPlaybackUiTime(audio.currentTime || resumeAt || 0, true);
          setDuration(readMusicPlaybackDurationSec(audio));
          if (shouldResume) {
            if (!audio.paused) {
              setPlaying(true);
              setStreamResolving(false);
              return;
            }
            const started = await safeMusicPlay(audio);
            if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
              return;
            }
            if (started) {
              setPlaying(true);
              setWantsPlaying(true);
              setStreamResolving(false);
            } else {
              setPlaying(false);
              setWantsPlaying(true);
              setStreamResolving(false);
              void maybeRestoreMusicPlaybackAfterColdStart();
            }
            return;
          }
          setPlaying(false);
          setStreamResolving(false);
          return;
        }
        // hard-load 前再固化一次进度（prepare 会把 currentTime 打成 0）
        if (!switchingTrack && track.id === useMusicDemoStore.getState().nowPlayingId) {
          const liveSec = Math.max(
            0,
            Math.floor(audio.currentTime || 0),
            useMusicDemoStore.getState().playbackPositionSec,
            resumeAt,
          );
          if (liveSec > useMusicDemoStore.getState().playbackPositionSec) {
            useMusicDemoStore.getState().setPlaybackPosition(liveSec);
          }
        }
        const seekTo = resolveMusicResumePositionSec({
          switchingTrack,
          nowPlayingMatches: track.id === useMusicDemoStore.getState().nowPlayingId,
          storePositionSec: useMusicDemoStore.getState().playbackPositionSec,
          audioCurrentTimeSec: audio.currentTime || 0,
        });
        if (objectUrlRef.current?.startsWith("blob:") && objectUrlRef.current !== uri) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = uri;
        prepareMusicPlaybackSourceChange();
        const playbackAudio = setMusicPlaybackSrc(audio, uri);
        audioRef.current = playbackAudio;
        loadedTrackIdRef.current = track.id;
        loadedSourceUriRef.current = rawUri;
        setMusicPlaybackLoadedMeta({ trackId: track.id, sourceUri: rawUri });
        void playbackAudio.load();
        if (playingFromLocalDisk) {
          setBufferedProgress(1);
        }
        // 必须先有 duration 再 seek：网页刷新后若在 metadata 前 seek/play 失败，右边会永久 00:00。
        const durationSec = await whenMusicPlaybackMetadataReady(playbackAudio);
        if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
          return;
        }
        if (durationSec > 0) {
          setDuration(durationSec);
        }
        if (seekTo > 0) {
          try {
            playbackAudio.currentTime =
              durationSec > 0 ? Math.min(seekTo, Math.max(0, durationSec - 0.05)) : seekTo;
          } catch {
            // ignore
          }
        }
        const syncDurationFromAudio = () => {
          const next = readMusicPlaybackDurationSec(playbackAudio);
          if (next > 0) {
            setDuration(next);
          }
        };
        if (shouldResume) {
          const started = await safeMusicPlay(playbackAudio);
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            try {
              playbackAudio.pause();
            } catch {
              // ignore
            }
            return;
          }
          syncDurationFromAudio();
          if (started) {
            setPlaying(true);
            setWantsPlaying(true);
            setStreamResolving(false);
            setError(null);
          } else {
            // 网页自动播放拦截：进度/意图/时长保留，UI 不得假「播放中」；手势续播由 runtime 解锁。
            setPlaying(false);
            setWantsPlaying(true);
            setStreamResolving(false);
            void maybeRestoreMusicPlaybackAfterColdStart();
          }
        } else {
          syncDurationFromAudio();
          setStreamResolving(false);
        }
      } catch (loadError) {
        if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
          return;
        }
        if (isMusicPlayInterruptedError(loadError)) {
          if (!audio.paused) {
            setPlaying(true);
            setWantsPlaying(true);
            setStreamResolving(false);
            setError(null);
            return;
          }
          setStreamResolving(false);
          return;
        }
        setStreamResolving(false);
        if (track.sourceKind === "cloud") {
          const recovered = await recoverCloudPlaybackRef.current(rawUri);
          if (!recovered && !cancelled && useMusicDemoStore.getState().nowPlayingId === track.id) {
            setError(cloudPlaybackGaveUpMessage());
          }
          return;
        }
        const message = formatMusicPlaybackError(loadError);
        if (message) {
          setError(message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // 换曲/换源时重载；playing / wantsPlaying / playbackPositionSec 故意不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track switch only
  }, [track?.id, track?.sourceUri, setWantsPlaying]);

  // 播放中进度只走 UI 时钟，不每秒 setPlaybackPosition（会触发 zustand 全量 persist）。
  // 进度落盘由 pause/seek/visibility 等边界事件 + syncMusicPlaybackPositionToStore 完成。
  // 换曲时下面的 load effect / setNowPlaying 会归零或恢复 store 进度。

  useEffect(() => {
    let cancelled = false;
    const trackId = track?.id ?? null;
    const raw = track?.coverUri?.trim() || null;
    if (!raw || !trackId) {
      setCoverDisplay(null);
      return () => {
        cancelled = true;
      };
    }
    // 曲目一变立刻丢掉上一首的展示 URI，防止氛围 effect 用旧封面给新曲取色并写脏缓存。
    setCoverDisplay((prev) => (prev?.trackId === trackId ? prev : null));
    const applyCover = (uri: string) => {
      if (!cancelled && useMusicDemoStore.getState().nowPlayingId === trackId) {
        // http CDN：大封面链路统一升到原图清晰度；本地/blob 保持不变。
        setCoverDisplay({ trackId, uri: coverUrlForHero(uri) });
      }
    };
    if (/^https?:\/\//.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
      applyCover(raw);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      try {
        applyCover(await host().files.resolveObjectUrl(raw));
      } catch {
        if (!cancelled && useMusicDemoStore.getState().nowPlayingId === trackId) {
          setCoverDisplay(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [track?.coverUri, track?.id]);

  /** 开沉浸：存 light/dark 双套；按当前 Theme 推对应套。切 Theme 只换套，不反推 Theme。 */
  useEffect(() => {
    let cancelled = false;
    const sourceId = MUSIC_APP_ID;
    // prefs 水合完成前禁止推送：默认值/竞态窗口会误开沉浸。
    if (!libraryHydrationReady) {
      return () => {
        cancelled = true;
      };
    }
    const label = track?.title?.trim() || undefined;
    const trackId = track?.id;
    const themeBrightness: "light" | "dark" = theme.colorScheme === "light" ? "light" : "dark";

    const pushBand = (palette: ExtractedAtmospherePalette) => {
      const band = pickAtmosphereBandForTheme(palette, themeBrightness);
      // 双套一并推给宿主：切 Theme 时宿主按亮度换套，不依赖播放器是否挂载。
      host().ui.setAtmosphere({
        sourceId,
        primary: band.primary,
        secondary: band.secondary,
        tertiary: band.tertiary,
        luminance: band.luminance,
        sourceLabel: label,
        bands: { light: palette.light, dark: palette.dark },
      });
    };

    if (!atmospherePushEnabled) {
      host().ui.clearAtmosphere(sourceId);
      return () => {
        cancelled = true;
      };
    }
    if (!trackId) {
      return () => {
        cancelled = true;
      };
    }

    const coverKey = track?.coverUri?.trim() || null;
    const displayUri =
      coverDisplay && coverDisplay.trackId === trackId ? coverDisplay.uri.trim() || null : null;
    const extractUri =
      displayUri ||
      (coverKey &&
      (/^https?:\/\//.test(coverKey) ||
        coverKey.startsWith("data:") ||
        coverKey.startsWith("blob:"))
        ? coverKey
        : null);

    const cached = useMusicDemoStore.getState().getTrack(trackId)?.atmospherePalette;
    const cacheOk = Boolean(
      cached?.dark?.primary &&
      cached?.light?.primary &&
      cached.extractVersion === ATMOSPHERE_EXTRACT_VERSION &&
      (!coverKey || !cached.coverKey || cached.coverKey === coverKey),
    );
    if (cacheOk && cached?.dark && cached.light) {
      pushBand({ dark: cached.dark, light: cached.light });
    }

    if (!extractUri) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const palette = await ensureTrackAtmospherePalette({
        trackId,
        coverKeyUri: track?.coverUri,
        extractUri,
      });
      if (cancelled || !palette) {
        return;
      }
      if (!useMusicDemoStore.getState().atmospherePushEnabled) {
        return;
      }
      if (useMusicDemoStore.getState().nowPlayingId !== trackId) {
        return;
      }
      pushBand(palette);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    atmospherePushEnabled,
    coverDisplay,
    libraryHydrationReady,
    theme.colorScheme,
    track?.coverUri,
    track?.id,
    track?.title,
  ]);

  // 不在卸载时 clearAtmosphere：进设置/切 Tab 仍保持 Music 粘滞（Tab 优先 > 全局回落）。
  // 仅关沉浸 / 显式 clear 时清源。

  // 宿主中间区封面背景：与氛围色分轨；关开关时 clear；切 Tab 不 clear（粘滞）。
  useEffect(() => {
    let cancelled = false;
    const displayUri =
      coverDisplay && track?.id && coverDisplay.trackId === track.id
        ? coverDisplay.uri.trim() || null
        : null;
    void (async () => {
      await syncMusicContentBackdropToHost(host(), { displayUri });
      if (cancelled) {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    coverBackdropEnabled,
    coverBackdropBlur,
    coverBackdropOpacity,
    coverBackdropIncludeTabBar,
    coverDisplay,
    track?.coverUri,
    track?.id,
    track?.title,
  ]);

  useEffect(() => {
    lyricLineOffsetRef.current = new Map();
    setLyricSelectedIndex(null);
    setLyricHoveredIndex(null);
  }, [track?.id, track?.lyrics]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const styleId = "agnx-music-lyrics-chrome-v8";
    document.getElementById(styleId)?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v7")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v6")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v5")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v4")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v3")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v2")?.remove();
    document.getElementById("agnx-music-lyrics-scrollbar-hide")?.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
.agnx-music-lyrics-scroll,
.agnx-music-lyrics-scroll > div,
[data-testid="workspace-mini-app-music-lyrics"],
[data-testid="workspace-mini-app-music-lyrics"] * {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.agnx-music-lyrics-scroll::-webkit-scrollbar,
.agnx-music-lyrics-scroll *::-webkit-scrollbar,
[data-testid="workspace-mini-app-music-lyrics"]::-webkit-scrollbar,
[data-testid="workspace-mini-app-music-lyrics"] *::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
  background: transparent !important;
}
.agnx-music-lyrics-fade-host {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.agnx-music-lyrics-scroll,
[data-testid="workspace-mini-app-music-lyrics"] {
  cursor: default !important;
}
/* 默认禁止选区，避免点选高亮后残留文字选区挡住「再点取消」；桌面歌词正文单独开选 */
.agnx-music-lyrics-scroll *,
[data-testid="workspace-mini-app-music-lyrics"] * {
  user-select: none !important;
  -webkit-user-select: none !important;
}
.agnx-music-lyrics-scroll [data-lyric-selectable="true"],
[data-testid="workspace-mini-app-music-lyrics"] [data-lyric-selectable="true"] {
  user-select: text !important;
  -webkit-user-select: text !important;
}
/* 顶底加高渐变透明（仅 mask，不用 backdrop-filter，避免溢出遮挡下方标题） */
.agnx-music-lyrics-scroll,
[data-testid="workspace-mini-app-music-lyrics"] {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 200px,
    #000 calc(100% - 200px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 200px,
    #000 calc(100% - 200px),
    transparent 100%
  );
}
`;
    document.head.appendChild(style);
  }, []);

  /** 跟唱/定位引起的 scrollTo：短窗口内忽略滚动事件，避免误出「恢复滚动」 */
  const beginProgrammaticLyricsScroll = useCallback(() => {
    lyricsProgrammaticScrollRef.current = true;
    if (lyricsProgrammaticClearTimerRef.current) {
      clearTimeout(lyricsProgrammaticClearTimerRef.current);
    }
    lyricsProgrammaticClearTimerRef.current = setTimeout(() => {
      lyricsProgrammaticScrollRef.current = false;
      lyricsProgrammaticClearTimerRef.current = null;
    }, 480);
  }, []);

  /** 切歌：退出浏览态；随后 instant snap 到当前进度行（可能非首行）。 */
  useEffect(() => {
    if (!track?.id) {
      return;
    }
    if (lyricsBrowseTimerRef.current) {
      clearTimeout(lyricsBrowseTimerRef.current);
      lyricsBrowseTimerRef.current = null;
    }
    if (lyricSelectTimerRef.current) {
      clearTimeout(lyricSelectTimerRef.current);
      lyricSelectTimerRef.current = null;
    }
    setLyricsUserBrowsing(false);
    setLyricSelectedIndex(null);
    setLyricHoveredIndex(null);
    // 不先 scrollTo(0)：避免「顶部闪一下再滚到当前行」。
    // offset map 已在另一 effect 清空；layout 后 instant snap。
    preferInstantLyricScrollRef.current = true;
    setLyricsFollowEpoch((epoch) => epoch + 1);
  }, [track?.id, track?.lyrics]);

  /** 仅用户手势滚动（拖拽 / 滚轮）才进入浏览态；程序跟唱不算 */
  const markLyricsUserBrowsing = useCallback(() => {
    if (lyricsProgrammaticScrollRef.current) {
      return;
    }
    setLyricsUserBrowsing(true);
    if (lyricsBrowseTimerRef.current) {
      clearTimeout(lyricsBrowseTimerRef.current);
      lyricsBrowseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (lyricsBrowseTimerRef.current) {
        clearTimeout(lyricsBrowseTimerRef.current);
      }
      if (lyricsProgrammaticClearTimerRef.current) {
        clearTimeout(lyricsProgrammaticClearTimerRef.current);
      }
      if (lyricSelectTimerRef.current) {
        clearTimeout(lyricSelectTimerRef.current);
      }
    };
  }, []);

  const handleLyricLinePress = useCallback(
    (timeSec: number) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(timeSec)) {
        return;
      }
      audio.currentTime = timeSec;
      commitPlaybackUiTime(timeSec, true);
      setPlaybackPosition(timeSec);
      if (lyricsBrowseTimerRef.current) {
        clearTimeout(lyricsBrowseTimerRef.current);
        lyricsBrowseTimerRef.current = null;
      }
      setLyricsUserBrowsing(false);
      setLyricHoveredIndex(null);
      setLyricSelectedIndex(null);
      if (!playing) {
        void safeMusicPlay(audio).then((ok) => {
          if (ok) {
            setPlaying(true);
            setWantsPlaying(true);
          }
          return undefined;
        });
      }
    },
    [commitPlaybackUiTime, playing, setPlaybackPosition, setWantsPlaying],
  );

  /** 恢复跟唱：清浏览/点选并滚到当前播放行 */
  const handleResumeLyricsFollow = useCallback(() => {
    if (lyricsBrowseTimerRef.current) {
      clearTimeout(lyricsBrowseTimerRef.current);
      lyricsBrowseTimerRef.current = null;
    }
    if (lyricSelectTimerRef.current) {
      clearTimeout(lyricSelectTimerRef.current);
      lyricSelectTimerRef.current = null;
    }
    setLyricSelectedIndex(null);
    setLyricHoveredIndex(null);
    setLyricsUserBrowsing(false);
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    const time = audioRef.current?.currentTime ?? currentTimeRef.current;
    commitPlaybackUiTime(time || 0, true);
    // 恢复跟唱：直接落到当前行，再由后续换行走平滑跟唱。
    preferInstantLyricScrollRef.current = true;
    setLyricsFollowEpoch((epoch) => epoch + 1);
  }, [commitPlaybackUiTime]);

  useEffect(() => {
    const trackId = track?.id;
    if (!trackId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const restored = await restoreTrackFromDownloadBundleIfNeeded(host(), trackId);
      if (cancelled || !restored) {
        return;
      }
      // 已落盘却被云端 URL 盖掉：恢复后强制重载音源
      loadedTrackIdRef.current = null;
      loadedSourceUriRef.current = null;
    })();
    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  useEffect(() => {
    // 本地落盘曲：缓冲进度恒满；UI 侧对本地曲隐藏缓存带
    if (track?.sourceKind === "local" && isMusicLocalPersistedUri(track.sourceUri)) {
      setBufferedProgress(1);
    }
  }, [track?.id, track?.sourceKind, track?.sourceUri]);

  useEffect(() => {
    const trackId = track?.id;
    const title = track?.title?.trim() ?? "";
    const artist = track?.artist ?? "";
    const existingLyrics = track?.lyrics;
    const providerId = track?.remoteRef?.providerId?.trim() ?? "";
    // Pixabay / Soundstripe 多为无词素材；禁止用歌名去 txqq 糊配华语歌词
    if (isDeferredBrowserProviderId(providerId)) {
      if (trackId && existingLyrics?.trim()) {
        useMusicDemoStore.getState().updateTrack(trackId, { lyrics: null });
      }
      return;
    }
    // 已有歌词但与歌名明显不符（无 [ti:] 的历史串台、或 [ti:] 不对）：清掉
    if (
      trackId &&
      title &&
      existingLyrics?.trim() &&
      !lyricsLikelyBelongToTrack(existingLyrics, title)
    ) {
      useMusicDemoStore.getState().updateTrack(trackId, { lyrics: null });
      return;
    }
    // 纯本地上传（无 remoteRef）：不按歌名去网上糊配歌词
    if (!providerId && track?.sourceKind === "local") {
      return;
    }
    if (!trackId || !title || existingLyrics?.trim()) {
      return;
    }
    if (lyricsEnrichingRef.current === trackId) {
      return;
    }
    lyricsEnrichingRef.current = trackId;
    let cancelled = false;
    void (async () => {
      try {
        const lyrics = await findTxqqLyricsText({
          title,
          artist,
        });
        if (cancelled || !lyrics) {
          return;
        }
        const latest = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
        if (!latest || latest.lyrics?.trim()) {
          return;
        }
        useMusicDemoStore.getState().updateTrack(trackId, { lyrics });
      } finally {
        if (lyricsEnrichingRef.current === trackId) {
          lyricsEnrichingRef.current = null;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    track?.id,
    track?.title,
    track?.artist,
    track?.lyrics,
    track?.remoteRef?.providerId,
    track?.sourceKind,
  ]);

  // 云播：进度条浅色带只是 <audio>.buffered 预读，会停在播放头附近。
  // 后台把整曲落盘到 apps/data，完成后切本地源；之后再听直接读本地，不再依赖流式预读。
  useEffect(() => {
    const trackId = track?.id;
    const sourceKind = track?.sourceKind;
    const sourceUri = track?.sourceUri;
    const remoteRef = track?.remoteRef;
    if (!trackId) {
      return;
    }
    if (sourceKind === "local" && isMusicLocalPersistedUri(sourceUri)) {
      return;
    }
    const playableUrl = sourceUri && /^https?:\/\//i.test(sourceUri) ? sourceUri.trim() : null;
    if (!playableUrl && !remoteRef) {
      return;
    }
    if (cloudAutoPersistInFlight.has(trackId)) {
      return;
    }
    cloudAutoPersistInFlight.add(trackId);
    let cancelled = false;
    void (async () => {
      try {
        await downloadAndPersistTrackBundle(host(), trackId, {
          playableUrl,
          force: false,
        });
        if (cancelled) {
          return;
        }
        const latest = useMusicDemoStore.getState().getTrack(trackId);
        if (!latest || !isMusicLocalPersistedUri(latest.sourceUri)) {
          return;
        }
        setBufferedProgress(1);
        // 源已由 bundle 写回 local；交由 load effect 同曲换源软切，勿清空 loaded* / 硬重载
      } catch {
        cloudAutoPersistInFlight.delete(trackId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [track?.id, track?.remoteRef, track?.sourceKind, track?.sourceUri]);

  useEffect(() => {
    if (pendingPlayerSurface === "search") {
      pendingPlayerSurface = null;
      setPlayerSurface("search");
    }
  }, [setPlayerSurface]);

  useEffect(() => {
    writePersistedSearchCenterControlsOpen(searchCenterControlsOpen);
  }, [searchCenterControlsOpen]);

  const handleToggle = useCallback(async () => {
    if (!track) {
      return;
    }
    setNowPlaying(track.id);
    const audio = audioRef.current;
    if (!audio || !track.sourceUri) {
      setError(track.remoteRef ? "暂无可用播放地址" : "请先上传本地音频");
      return;
    }
    // 以真实 audio.paused 为准，避免刷新后假「播放中」点一下反而把 wantsPlaying 清掉。
    const actuallyPlaying = !audio.paused;
    try {
      if (actuallyPlaying) {
        await applyMusicPlaybackIntent(false);
        setPlaying(false);
        setError(null);
        return;
      }
      const started = await applyMusicPlaybackIntent(true);
      if (started.applied && started.audioPaused === false) {
        setPlaying(true);
        setError(null);
      } else if (!audio.paused) {
        setPlaying(true);
        setWantsPlaying(true);
        setError(null);
      } else {
        setPlaying(false);
        setWantsPlaying(true);
        void maybeRestoreMusicPlaybackAfterColdStart();
      }
    } catch (playError) {
      if (isMusicPlayInterruptedError(playError)) {
        if (!audio.paused) {
          setPlaying(true);
          setWantsPlaying(true);
          setError(null);
        }
        return;
      }
      setPlaying(false);
      // 自动播放拦截不落盘清意图
      if (!isMusicAutoplayBlockedError(playError)) {
        setWantsPlaying(false);
      }
      const message = playError instanceof Error ? formatMusicPlaybackError(playError) : "播放失败";
      if (message) {
        setError(message);
      }
    }
  }, [setNowPlaying, setWantsPlaying, track]);

  const handleSeekRatio = useCallback(
    (ratio: number) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(duration) || duration <= 0) {
        return;
      }
      const next = ratio * duration;
      audio.currentTime = next;
      commitPlaybackUiTime(next, true);
      setPlaybackPosition(next);
    },
    [commitPlaybackUiTime, duration, setPlaybackPosition],
  );

  const invalidateSearchResolve = useCallback(() => {
    searchResolveGenerationRef.current += 1;
    setStreamResolving(false);
    // 立刻停旧音：UI 已切歌时不允许继续响上一首
    prepareMusicPlaybackSourceChange();
  }, []);

  const handlePrev = useCallback(() => {
    invalidateSearchResolve();
    resumeAfterLoadRef.current = true;
    const prev = playPrevious();
    if (prev) {
      setPlaying(true);
    } else {
      resumeAfterLoadRef.current = false;
    }
  }, [invalidateSearchResolve, playPrevious]);

  const handleNext = useCallback(() => {
    invalidateSearchResolve();
    resumeAfterLoadRef.current = true;
    const next = playNext();
    if (next) {
      setPlaying(true);
    } else {
      resumeAfterLoadRef.current = false;
    }
  }, [invalidateSearchResolve, playNext]);

  const handleCycleMode = useCallback(() => {
    cyclePlayMode();
  }, [cyclePlayMode]);

  const handleVolumeChange = useCallback(
    (ratio: number) => {
      setMuted(false);
      setVolume(ratio);
    },
    [setMuted, setVolume],
  );

  const handleToggleMute = useCallback(() => {
    setMuted(!muted);
  }, [muted, setMuted]);

  const openDesktopVolumeHover = useCallback(() => {
    if (volumeCloseTimerRef.current) {
      clearTimeout(volumeCloseTimerRef.current);
      volumeCloseTimerRef.current = null;
    }
    setDesktopVolumeHoverOpen(true);
  }, []);

  const scheduleCloseDesktopVolumeHover = useCallback(() => {
    if (volumeCloseTimerRef.current) {
      clearTimeout(volumeCloseTimerRef.current);
    }
    volumeCloseTimerRef.current = setTimeout(() => {
      setDesktopVolumeHoverOpen(false);
      volumeCloseTimerRef.current = null;
    }, 160);
  }, []);

  const handleToggleQueue = useCallback(() => {
    setQueueOpen((open) => !open);
  }, []);

  const handleQueueSelect = useCallback(
    (id: string) => {
      invalidateSearchResolve();
      resumeAfterLoadRef.current = true;
      setNowPlaying(id);
      setPlaying(true);
      if (isCompact) {
        setQueueOpen(false);
      }
    },
    [invalidateSearchResolve, isCompact, setNowPlaying],
  );

  const handleQueueRemove = useCallback(
    (id: string) => {
      const wasPlaying = useMusicDemoStore.getState().nowPlayingId === id;
      removeFromQueue(id);
      if (!wasPlaying) {
        return;
      }
      const nextId = useMusicDemoStore.getState().nowPlayingId;
      if (nextId) {
        requestTrackAutoPlay(nextId);
      }
    },
    [removeFromQueue],
  );

  const handleQueueMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      moveQueueItem(fromIndex, toIndex);
    },
    [moveQueueItem],
  );

  const handlePlayPress = useCallback(() => {
    void handleToggle();
  }, [handleToggle]);

  const handleReplaceCover = useCallback(async () => {
    if (!track) {
      return;
    }
    try {
      const files = await host().files.pickAndImport({
        title: "选择封面",
        multiple: false,
        extensions: [
          "png",
          "jpg",
          "jpeg",
          "webp",
          "gif",
          "bmp",
          "avif",
          "mp4",
          "webm",
          "mov",
          "m4v",
          "ogv",
        ],
        accept: "image/*,video/*,.gif,.png,.jpg,.jpeg,.webp,.bmp,.avif,.mp4,.webm,.mov,.m4v,.ogv",
        filterLabel: "图片或视频",
        appId: MUSIC_APP_ID,
      });
      const file = files[0];
      if (!file) {
        return;
      }
      useMusicDemoStore.getState().updateTrack(track.id, { coverUri: file.uri });
      setError(null);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : "更换封面失败");
    }
  }, [track]);

  const handleOpenSearch = useCallback(() => {
    setQueueOpen(false);
    setCompactVolumeOpen(false);
    setTransportSliderMode("progress");
    // 与搜索页返回键同位：瞬时切换，不做抽屉位移动画
    setPlayerSurface("search");
  }, [setPlayerSurface]);

  const handleBackToPlayer = useCallback(() => {
    setTransportSliderMode("progress");
    setPlayerSurface("player");
  }, [setPlayerSurface]);

  const toggleCoverHidden = useCallback(() => {
    setCoverHidden(!useMusicDemoStore.getState().coverHidden);
  }, [setCoverHidden]);

  /** 搜索按钮为开关：chrome 以 playerSurface 为准 */
  const handleToggleSearch = useCallback(() => {
    if (useMusicDemoStore.getState().playerSurface === "search") {
      handleBackToPlayer();
      return;
    }
    handleOpenSearch();
  }, [handleBackToPlayer, handleOpenSearch]);

  const handleSeekPreviewChange = useCallback((next: { visible: boolean; ratio: number }) => {
    setSeekPreview(next);
  }, []);

  const dismissFloatingControls = useCallback(() => {
    setCompactVolumeOpen(false);
    setDesktopVolumeHoverOpen(false);
    setSeekPreview((current) => (current.visible ? { ...current, visible: false } : current));
  }, []);

  const renderOverflowHoverSidePanel = useCallback(
    (id: string) => {
      if (id !== "volume" || muted) {
        return null;
      }
      return (
        <View style={styles.menuVolumePanel} testID="music-volume-popover">
          <VolumeBar
            value={volume}
            onChange={handleVolumeChange}
            wide
            testID="music-volume-popover-bar"
          />
        </View>
      );
    },
    [handleVolumeChange, muted, volume],
  );

  const handleTrackMenuAction = useCallback(
    (id: MusicTrackMenuActionId, trackIdOverride?: string) => {
      const trackId = trackIdOverride ?? track?.id;
      if (!trackId) {
        return;
      }
      if (id === "refreshResources") {
        setPlaceholderToast("正在更新并保存到本地（音源/封面/歌词）…");
      }
      if (id === "exportZip") {
        setPlaceholderToast("正在准备导出…");
      }
      if (id === "deleteTrack") {
        setPlaceholderToast("正在删除本地文件…");
      }
      void (async () => {
        try {
          const result = await runMusicTrackMenuAction({
            hostApi: host(),
            action: id,
            trackId,
          });
          if (result.toast) {
            setPlaceholderToast(result.toast);
          }
          if (result.reloadPlayback && useMusicDemoStore.getState().nowPlayingId === trackId) {
            loadedTrackIdRef.current = null;
            loadedSourceUriRef.current = null;
            resumeAfterLoadRef.current = playing;
            setNowPlaying(trackId);
            setWantsPlaying(playing || useMusicDemoStore.getState().wantsPlaying);
          }
        } catch (menuError) {
          const message = menuError instanceof Error ? menuError.message : "操作失败";
          notifyMusicPlayerError(message);
        }
      })();
    },
    [playing, setNowPlaying, setWantsPlaying, track],
  );

  const handleOpenEditLayout = useCallback(() => {
    openPlayerEntityEditLayout();
  }, [openPlayerEntityEditLayout]);

  useEffect(() => {
    const sync = () => {
      const interactive = isThisMiniAppPaneInteractive({
        appId: props.appId,
        panelId: props.panelId,
        entityId: props.entityId,
      });
      const visible = isThisMiniAppPaneVisible({
        appId: props.appId,
        panelId: props.panelId,
        entityId: props.entityId,
      });
      // 快捷键跟「Tab 槽可见」而非仅 pane 获焦：split/焦点在控件内时 isInteractive 可能为 false。
      setMusicPlayerShortcutSurfaceActive(visible);
      setPaneInteractive(interactive);
      const wasVisible = paneVisibleRef.current;
      setPaneVisible(visible);
      // 可见性恢复（含：仍显示但失焦的分组、或 keep-alive 重新显示）时对齐进度/歌词
      if (visible) {
        const audio = audioRef.current;
        const time = audio?.currentTime ?? currentTimeRef.current;
        commitPlaybackUiTime(time || 0, true);
        // 从不可见 → 可见：instant snap（禁止先滚顶部）。失焦但仍可见时持续跟唱，不强制 snap。
        if (!wasVisible) {
          if (lyricsBrowseTimerRef.current) {
            clearTimeout(lyricsBrowseTimerRef.current);
            lyricsBrowseTimerRef.current = null;
          }
          setLyricsUserBrowsing(false);
          setLyricSelectedIndex(null);
          preferInstantLyricScrollRef.current = true;
          if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => {
              preferInstantLyricScrollRef.current = true;
              setLyricsFollowEpoch((epoch) => epoch + 1);
            });
          } else {
            setLyricsFollowEpoch((epoch) => epoch + 1);
          }
        }
      }
    };
    sync();
    if (typeof window === "undefined") {
      return () => {
        setMusicPlayerShortcutSurfaceActive(false);
      };
    }
    window.addEventListener(MINI_APP_PANE_INTERACTIVE_EVENT, sync);
    return () => {
      window.removeEventListener(MINI_APP_PANE_INTERACTIVE_EVENT, sync);
      // keep-alive 卸播放器但 Tab 槽仍可见时，宿主 __agnxVisibleMiniApps 仍为 true，不得清 transient。
      if (
        !isThisMiniAppPaneVisible({
          appId: props.appId,
          panelId: props.panelId,
          entityId: props.entityId,
        })
      ) {
        setMusicPlayerShortcutSurfaceActive(false);
      }
    };
  }, [commitPlaybackUiTime, props.appId, props.entityId, props.panelId]);

  useEffect(() => {
    setMusicPlayerShortcutHandlers({
      "action:pin": () => handleTrackMenuAction("pin"),
      "action:search": () => handleToggleSearch(),
      "action:addPlaylist": () => handleTrackMenuAction("addPlaylist"),
      "action:playNext": () => handleTrackMenuAction("playNext"),
      "action:volume": () => {
        setTransportSliderMode((mode) => (mode === "progress" ? "volume" : "progress"));
      },
      "action:share": () => handleTrackMenuAction("share"),
      "action:detail": () => handleTrackMenuAction("detail"),
      "action:exportZip": () => handleTrackMenuAction("exportZip"),
      "action:refreshResources": () => handleTrackMenuAction("refreshResources"),
      "action:deleteTrack": () => handleTrackMenuAction("deleteTrack"),
      "transport:prev": () => handlePrev(),
      "transport:play": () => handlePlayPress(),
      "transport:next": () => handleNext(),
      "transport:mode": () => handleCycleMode(),
      "transport:queue": () => handleToggleQueue(),
      "lyrics:resumeFollow": () => handleResumeLyricsFollow(),
    });
  }, [
    handleCycleMode,
    handleNext,
    handlePlayPress,
    handlePrev,
    handleResumeLyricsFollow,
    handleToggleQueue,
    handleToggleSearch,
    handleTrackMenuAction,
  ]);

  useEffect(() => {
    refreshMusicControlShortcutHints({
      actionBar: actionLayout.bar,
      playing,
      muted,
      pinned: Boolean(track?.pinned),
      playMode,
      setControlTitles,
      setControlShortcutKeys,
    });
  }, [actionLayout.bar, muted, playMode, playing, track?.pinned]);

  const handleSearchPlayLocal = useCallback(
    (trackId: string) => {
      invalidateSearchResolve();
      requestTrackAutoPlay(trackId);
      setNowPlaying(trackId);
      setPlayerSurface("player");
    },
    [invalidateSearchResolve, setNowPlaying, setPlayerSurface],
  );

  const handleSearchSelectTrackHit = useCallback(
    async (hit: SearchHitTrack) => {
      const generation = ++searchResolveGenerationRef.current;
      // 立刻停旧音：解析完成前也不要继续响上一首
      prepareMusicPlaybackSourceChange();
      const created = upsertTrackFromSearchHit(hit);
      // 先切 now-playing：底栏迷你播放器立刻更新，不等解析音流
      requestTrackAutoPlay(created.id);
      setNowPlaying(created.id);
      setWantsPlaying(true);
      // 全平台统一：点选后进加载态，直到 audio 真正 play（见 load effect）
      setStreamResolving(true);
      setPlaceholderToast("正在加载…");

      const stillCurrent = () =>
        generation === searchResolveGenerationRef.current &&
        useMusicDemoStore.getState().nowPlayingId === created.id;

      let playableUrl = hit.playableUrl?.trim() || created.sourceUri?.trim() || "";
      let resolvedMeta: {
        title?: string;
        artist?: string;
        coverUrl?: string;
      } | null = null;
      /** 成功挂上 sourceUri 后仍保持 loading，交给播放引擎收尾 */
      let awaitAudioStart = false;
      try {
        const needsResolve = !playableUrl && Boolean(hit.ref.pageUrl || hit.ref.remoteId);
        if (needsResolve) {
          try {
            const resolved = await resolveMusicPlayable(hit.ref);
            if (!stillCurrent()) {
              return;
            }
            playableUrl = resolved?.url?.trim() || "";
            if (resolved) {
              resolvedMeta = {
                title: resolved.title?.trim() || undefined,
                artist: resolved.artist?.trim() || undefined,
                coverUrl: resolved.coverUrl?.trim() || undefined,
              };
            }
          } catch (resolveError) {
            if (!stillCurrent()) {
              return;
            }
            // 有详情页的延后点播失败要提示；仅 remoteId 的可继续落到空地址文案
            if (hit.ref.pageUrl) {
              const message = resolveError instanceof Error ? resolveError.message : "解析音流失败";
              setPlaceholderToast(message);
              setPlaying(false);
              setWantsPlaying(false);
              return;
            }
          }
        }
        if (!stillCurrent()) {
          return;
        }
        if (!playableUrl) {
          setPlaceholderToast(
            hit.ref.pageUrl || hit.ref.remoteId
              ? "解析音流失败，可重试或换一首"
              : "暂无可用播放地址",
          );
          setPlaying(false);
          setWantsPlaying(false);
          return;
        }
        const latest = useMusicDemoStore.getState().getTrack(created.id) ?? created;
        const keepLocalFile =
          latest.sourceKind === "local" &&
          Boolean(latest.sourceUri) &&
          !/^https?:\/\//i.test(latest.sourceUri ?? "") &&
          !latest.sourceUri?.startsWith("blob:");
        const artist = resolvedMeta?.artist;
        const artistOk =
          Boolean(artist) &&
          artist!.toLowerCase() !== "pixabay" &&
          artist!.toLowerCase() !== "soundstripe";
        useMusicDemoStore.getState().updateTrack(created.id, {
          sourceUri: keepLocalFile ? latest.sourceUri : playableUrl,
          sourceKind: keepLocalFile ? "local" : "cloud",
          remoteRef: hit.ref,
          ...(artistOk ? { artist } : {}),
          ...(resolvedMeta?.coverUrl && !latest.coverUri
            ? { coverUri: resolvedMeta.coverUrl }
            : {}),
          ...(resolvedMeta?.title ? { title: resolvedMeta.title } : {}),
        });
        if (!stillCurrent()) {
          return;
        }
        awaitAudioStart = true;
        setPlaceholderToast("正在加载…");
      } finally {
        // 成功路径保持 streamResolving，等 audio.play 成功再关；失败/取消才在这里关
        if (generation === searchResolveGenerationRef.current && !awaitAudioStart) {
          setStreamResolving(false);
        }
      }
    },
    [setNowPlaying, setWantsPlaying, upsertTrackFromSearchHit],
  );

  const handleSearchPlayAllTrackHits = useCallback(
    (hits: SearchHitTrack[]) => {
      if (hits.length === 0) {
        return;
      }
      const ids = hits.map((hit) => upsertTrackFromSearchHit(hit).id);
      setQueueIds(ids);
      void handleSearchSelectTrackHit(hits[0]!);
    },
    [handleSearchSelectTrackHit, setQueueIds, upsertTrackFromSearchHit],
  );

  const handleSearchEnqueueTrackHits = useCallback(
    (hits: SearchHitTrack[]) => {
      if (hits.length === 0) {
        return;
      }
      for (const hit of hits) {
        const created = upsertTrackFromSearchHit(hit);
        addToQueue(created.id, "end");
      }
      setPlaceholderToast(`已加入队列 ${hits.length} 首`);
    },
    [addToQueue, upsertTrackFromSearchHit],
  );

  const handleSearchPlayNextTrackHit = useCallback(
    (hit: SearchHitTrack) => {
      const created = upsertTrackFromSearchHit(hit);
      addToQueue(created.id, "next");
      setPlaceholderToast(`下一首播放：${created.title}`);
    },
    [addToQueue, upsertTrackFromSearchHit],
  );

  const handleSearchEnqueueTrackHit = useCallback(
    (hit: SearchHitTrack) => {
      const created = upsertTrackFromSearchHit(hit);
      addToQueue(created.id, "end");
      setPlaceholderToast(`已加入队列：${created.title}`);
    },
    [addToQueue, upsertTrackFromSearchHit],
  );

  /** 搜索行保存：入库 + 解析音流 + 落盘；不切 now-playing、不自动播放 */
  const handleSearchSaveTrackHit = useCallback(
    async (hit: SearchHitTrack) => {
      const created = upsertTrackFromSearchHit(hit);
      if (isMusicTrackDownloadedLocally(created) || isMusicLocalPersistedUri(created.sourceUri)) {
        setPlaceholderToast(`已在本地：${created.title}`);
        return;
      }
      setPlaceholderToast(`正在保存：${created.title}…`);
      try {
        let playableUrl = hit.playableUrl?.trim() || created.sourceUri?.trim() || "";
        if (!playableUrl && Boolean(hit.ref.pageUrl || hit.ref.remoteId)) {
          const resolved = await resolveMusicPlayable(hit.ref);
          playableUrl = resolved?.url?.trim() || "";
          if (resolved) {
            const artist = resolved.artist?.trim();
            const artistOk =
              Boolean(artist) &&
              artist!.toLowerCase() !== "pixabay" &&
              artist!.toLowerCase() !== "soundstripe";
            useMusicDemoStore.getState().updateTrack(created.id, {
              ...(playableUrl
                ? { sourceUri: playableUrl, sourceKind: "cloud" as const, remoteRef: hit.ref }
                : { remoteRef: hit.ref }),
              ...(artistOk ? { artist } : {}),
              ...(resolved.coverUrl?.trim() && !created.coverUri
                ? { coverUri: resolved.coverUrl.trim() }
                : {}),
            });
          }
        }
        if (!playableUrl) {
          setPlaceholderToast(
            hit.ref.pageUrl || hit.ref.remoteId
              ? "解析音流失败，无法保存"
              : "暂无可用播放地址，无法保存",
          );
          return;
        }
        const report = await downloadAndPersistTrackBundle(host(), created.id, {
          playableUrl,
          force: false,
        });
        const latest = useMusicDemoStore.getState().getTrack(created.id);
        if (latest && isMusicLocalPersistedUri(latest.sourceUri)) {
          setPlaceholderToast(`已保存到本地：${latest.title}`);
          return;
        }
        setPlaceholderToast(
          report?.sourceUri ? `已写入清单：${created.title}` : `保存未完成：${created.title}`,
        );
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : "保存失败";
        setPlaceholderToast(message);
      }
    },
    [upsertTrackFromSearchHit],
  );

  const playingFromLocalDisk =
    track?.sourceKind === "local" && isMusicLocalPersistedUri(track.sourceUri);
  /** 仅云端流式显示缓存带；本地磁盘直读不展示（满格也藏掉，避免误以为还在下） */
  const seekBuffered = playingFromLocalDisk ? 0 : bufferedProgress;
  const ModeIcon = resolvePlayModeIcon(playMode);
  const effectiveVolume = muted ? 0 : volume;
  /** 底栏/歌词/操作条：只认 store surface */
  const inSearch = playerSurface === "search";
  const desktopVolumeHoverEnabled = isWeb && !isCompact;
  const compactFloatingOverlayVisible = isCompact && (compactVolumeOpen || seekPreview.visible);

  if (!track && !inSearch) {
    if (!libraryHydrationReady) {
      return <View style={styles.root} testID="workspace-mini-app-music-boot" />;
    }
    return (
      <View style={styles.root} testID="workspace-mini-app-music-empty">
        <Text style={styles.emptyTitle}>暂无曲目</Text>
        <Text style={styles.meta}>导入本地音频或搜索后再播放。</Text>
        <View style={styles.emptyActionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="上传音乐"
            onPress={() => {
              void uploadAndOpenTracks();
            }}
            style={styles.emptySearchHit}
            testID="music-upload-empty"
          >
            <Text style={styles.emptySearchText}>上传</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="搜索音乐"
            onPress={handleOpenSearch}
            style={styles.emptySearchHit}
            testID="music-open-search-empty"
          >
            <Search size={16} color={accent} />
            <Text style={styles.emptySearchText}>搜索</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!track && inSearch) {
    return (
      <View style={[styles.root, styles.rootSearch]} testID="workspace-mini-app-music-player">
        <View style={styles.searchSurface} testID="music-search-drawer">
          <MusicSearchView
            onBack={handleBackToPlayer}
            onPlayLocalTrack={handleSearchPlayLocal}
            onSelectTrackHit={handleSearchSelectTrackHit}
            onPlayAllTrackHits={handleSearchPlayAllTrackHits}
            onEnqueueTrackHits={handleSearchEnqueueTrackHits}
            onPlayNextTrackHit={handleSearchPlayNextTrackHit}
            onEnqueueTrackHit={handleSearchEnqueueTrackHit}
            onSaveTrackHit={handleSearchSaveTrackHit}
          />
        </View>
      </View>
    );
  }

  if (!track) {
    return null;
  }

  const actionIconSize = isCompact ? 22 : 18;

  const resolveControlShortcutKeys = (id: string): readonly string[] | undefined => {
    return controlShortcutKeys[id] ?? controlShortcutKeys[`action:${id}`];
  };

  const ActionOverflowMenu = host().ui
    .ActionOverflowMenu as ComponentType<WorkspaceAppActionOverflowMenuProps>;
  const ActionBar = host().ui.ActionBar as ComponentType<WorkspaceAppActionBarProps>;

  const buildMoreMenuItems = (mode: "chrome" | "full" = "chrome"): WorkspaceAppMenuItem[] => {
    const trackShortcutKeys: Partial<Record<MusicTrackMenuActionId, readonly string[]>> = {};
    const map: Array<[MusicTrackMenuActionId, string]> = [
      ["pin", "action:pin"],
      ["addPlaylist", "action:addPlaylist"],
      ["playNext", "action:playNext"],
      ["share", "action:share"],
      ["detail", "action:detail"],
      ["exportZip", "action:exportZip"],
      ["refreshResources", "action:refreshResources"],
      ["deleteTrack", "action:deleteTrack"],
    ];
    for (const [menuId, shortcutId] of map) {
      const value = controlShortcutKeys[shortcutId] ?? controlShortcutKeys[menuId];
      if (value) {
        trackShortcutKeys[menuId] = value;
      }
    }
    const menuActionIds = resolveMusicPlayerChromeOverflowIds(actionLayout, true);
    // chrome：移动端小封面 hideBar；full：右键/长按始终 fold bar
    const hideBar = mode === "full" || (isCompact && coverHidden);
    const fold = projectActionBarOverflowFold({
      barIds: resolveMusicPlayerBarActionIds(actionLayout),
      overflowIds: menuActionIds,
      hideBar,
    });
    const trackItems = buildMusicPlayerOverflowMenuItems({
      pinned: track.pinned,
      menuActionIds: fold.menuOverflowIds as MusicTrackMenuActionId[],
      foldedBarActionIds: fold.foldedBarIds as MusicTrackMenuActionId[],
      trackShortcutKeys,
    });
    return trackItems;
  };

  const handleOverflowMenuSelect = (id: string) => {
    const actionId = resolveMusicTrackMenuActionId(id);
    if (actionId) {
      handleTrackMenuAction(actionId);
    }
  };

  const actionContributions: WorkspaceAppActionContribution[] = MUSIC_PLAYER_ACTION_IDS.map(
    (id) => {
      const label =
        id === "pin" ? (track?.pinned ? "取消置顶" : "置顶") : MUSIC_PLAYER_ACTION_LABELS[id];
      return {
        id,
        label,
        tipLabel: stripShortcutSuffix(controlTitles[id] ?? controlTitles[`action:${id}`] ?? label),
        icon: resolveMusicTrackMenuIcon(id, Boolean(track?.pinned)),
        active: id === "pin" && Boolean(track?.pinned),
        destructive: isMusicTrackMenuDestructive(id),
        shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[id],
        // 瞬时面已刷新的键帽优先；否则宿主按 shortcutSourceKey 解析默认/Rebind
        shortcutKeys: resolveControlShortcutKeys(`action:${id}`) ?? resolveControlShortcutKeys(id),
        onPress: () => handleTrackMenuAction(id),
      };
    },
  );

  const trackArtistLabel = track ? resolveTrackArtistLabel(track) : null;
  const titleFontSize = isCompact ? 22 : 24;
  const artistFontSize = isCompact ? 16 : 18;
  const identityMenuItems = buildMoreMenuItems("full");

  /** 歌名/艺人：与封面同属一个 identity；点按切换大/小封面 */
  const titleArtistHit = (mode: "stacked" | "singleLine") => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={coverHidden ? "显示封面" : "隐藏封面"}
      onPress={toggleCoverHidden}
      style={
        mode === "singleLine"
          ? [
              styles.titleSingleLineRow,
              isCompact && coverHidden ? styles.titleSingleLineRowCompact : null,
              !isCompact ? styles.titleSingleLineRowDesktop : null,
            ]
          : styles.titleTextColumn
      }
    >
      {mode === "singleLine" ? (
        <TrackTitleArtist
          mode="singleLine"
          title={track.title}
          artistLabel={trackArtistLabel}
          titleFontSize={titleFontSize}
          artistFontSize={artistFontSize}
          mutedColor={theme.colors.foregroundMuted}
          fitContent={!isCompact && coverHidden}
          titleStyle={[
            styles.headline,
            styles.headlineSingleLineMarquee,
            isCompact && coverHidden ? styles.headlineCompactInline : null,
            !isCompact ? styles.headlineDesktopCollapsed : null,
          ]}
          titleTestID="music-track-title"
          animationPaused={!paneVisible}
        />
      ) : (
        <TrackTitleArtist
          mode="stacked"
          title={track.title}
          artistLabel={trackArtistLabel}
          titleFontSize={titleFontSize}
          artistFontSize={artistFontSize}
          mutedColor={theme.colors.foregroundMuted}
          titleStyle={[styles.headline, styles.headlineUnderCover, styles.headlineUnderCoverLarge]}
          artistStyle={[styles.artistMuted, styles.artistMutedUnderCoverLarge]}
          titleTestID="music-track-title"
          artistTestID="music-track-artist"
          animationPaused={!paneVisible}
        />
      )}
    </Pressable>
  );

  /**
   * 封面+歌名+艺人 = 一个整体：整块右键菜单；点任一处切换视图；仅封面长按换图。
   * - hero：大封面在上/左，标题在下
   * - inline：顶栏小封面 + 一行歌名艺人
   */
  const playerIdentitySurface = coverHidden ? (
    <View
      style={[
        styles.titleRow,
        isCompact ? styles.titleRowCompactInline : null,
        !isCompact ? styles.titleRowDesktopCollapsed : null,
      ]}
      testID="music-track-title-hit"
    >
      <TrackCoverButton
        size="inline"
        displayUri={coverDisplayUri}
        sourceUriForVideoCheck={track.coverUri ?? coverDisplayUri}
        isWeb={isWeb}
        isCompact={isCompact}
        accessibilityLabel="显示封面"
        onPress={toggleCoverHidden}
        onLongPress={() => {
          void handleReplaceCover();
        }}
        testID="music-title-inline-cover"
      />
      {titleArtistHit("singleLine")}
    </View>
  ) : (
    <View
      style={[styles.playerIdentityHero, isCompact ? styles.playerIdentityHeroCompact : null]}
      testID="music-track-identity-hero"
    >
      <TrackCoverButton
        size="hero"
        displayUri={coverDisplayUri}
        sourceUriForVideoCheck={track.coverUri ?? coverDisplayUri}
        isWeb={isWeb}
        isCompact={isCompact}
        accessibilityLabel="隐藏封面"
        onPress={toggleCoverHidden}
        onLongPress={() => {
          void handleReplaceCover();
        }}
        testID="music-cover-toggle"
      />
      <View
        style={[
          styles.metaColumn,
          isCompact ? styles.metaColumnCompact : null,
          styles.titleRowUnderCover,
        ]}
      >
        {titleArtistHit("stacked")}
      </View>
    </View>
  );

  const playerIdentity = (
    <View
      style={[
        styles.metaColumn,
        isCompact ? styles.metaColumnCompact : null,
        isCompact && coverHidden ? styles.metaColumnCompactInline : null,
        !isCompact && coverHidden ? styles.metaColumnDesktopCollapsed : null,
      ]}
    >
      <ActionOverflowMenu
        items={identityMenuItems}
        surface={playerIdentitySurface}
        showTrigger={false}
        side="bottom"
        align="start"
        showEditLayout
        editLayoutLabel="编辑布局"
        onEditLayout={handleOpenEditLayout}
        testID="music-track-title-overflow"
        renderHoverSidePanel={renderOverflowHoverSidePanel}
        onSelect={handleOverflowMenuSelect}
      />
    </View>
  );

  const transportIdentitySurface = (
    <View
      style={[
        styles.transportIdentityRow,
        isCompact && inSearch ? styles.transportIdentityRowCompact : null,
        !isCompact && inSearch ? styles.transportIdentityRowDesktop : null,
      ]}
      testID="music-transport-title-hit"
    >
      <TrackCoverButton
        size="transport"
        displayUri={coverDisplayUri}
        sourceUriForVideoCheck={track.coverUri ?? coverDisplayUri}
        isWeb={isWeb}
        isCompact={isCompact}
        accessibilityLabel="返回播放器"
        onPress={handleBackToPlayer}
        onLongPress={() => {
          void handleReplaceCover();
        }}
        testID="music-transport-cover-hit"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="返回播放器"
        onPress={handleBackToPlayer}
        style={[
          styles.miniMeta,
          isCompact && inSearch ? styles.miniMetaCompactSearch : null,
          !isCompact && inSearch ? styles.miniMetaDesktopSearch : null,
        ]}
      >
        <TrackTitleArtist
          mode="singleLine"
          title={track.title}
          artistLabel={trackArtistLabel}
          titleFontSize={titleFontSize}
          artistFontSize={artistFontSize}
          mutedColor={theme.colors.foregroundMuted}
          fitContent={!isCompact && inSearch}
          titleStyle={[
            styles.headline,
            styles.headlineSingleLineMarquee,
            isCompact && inSearch ? styles.headlineCompactInline : null,
            !isCompact && inSearch ? styles.headlineDesktopCollapsed : null,
          ]}
          titleTestID="music-transport-title"
          animationPaused={!paneVisible}
        />
      </Pressable>
    </View>
  );

  // 搜索迷你条：整机 ActionBar（hideBar fold bar 进菜单 + surface 右键/长按 + 三点）
  const miniNowPlaying = (
    <View
      style={[
        styles.miniNowPlaying,
        !isCompact && inSearch ? styles.miniNowPlayingDesktopSearch : null,
        isCompact && inSearch ? styles.miniNowPlayingCompactSearch : null,
      ]}
      testID="music-transport-cover"
    >
      <ActionBar
        layout={actionLayout}
        actions={actionContributions}
        surface={transportIdentitySurface}
        surfaceLayout="row"
        hideBar
        distribute="end"
        iconSize={actionIconSize}
        mutedColor={mutedIcon}
        accentColor={accent}
        testID="music-transport-actions"
        overflowMenu={{
          side: "top",
          align: "end",
          triggerSize: actionIconSize,
          triggerColor: mutedIcon,
          moreLabel: controlTitles.more ?? "更多",
          showEditLayout: true,
          editLayoutLabel: "编辑布局",
          onEditLayout: handleOpenEditLayout,
          testID: "music-action-overflow",
          renderHoverSidePanel: renderOverflowHoverSidePanel,
        }}
      />
    </View>
  );

  const lyricsBlock = (
    <MusicLyricsKaraokeBlock
      lyricUnits={lyricUnits}
      progressLines={lyricProgressLines}
      lyricsDensity={lyricsDensity}
      isCompact={isCompact}
      inSearch={inSearch}
      accent={accent}
      lyricsScrollRef={lyricsScrollRef}
      lyricLineOffsetRef={lyricLineOffsetRef}
      lyricsUserBrowsing={lyricsUserBrowsing}
      lyricSelectedIndex={lyricSelectedIndex}
      setLyricSelectedIndex={setLyricSelectedIndex}
      setLyricHoveredIndex={setLyricHoveredIndex}
      lyricHoveredIndex={lyricHoveredIndex}
      markLyricsUserBrowsing={markLyricsUserBrowsing}
      onLyricLinePress={handleLyricLinePress}
      playing={playing}
      useCssKaraoke={isWeb}
      paneVisible={paneVisible}
      lyricsFollowEpoch={lyricsFollowEpoch}
      preferInstantLyricScrollRef={preferInstantLyricScrollRef}
      followTopInsetPx={LYRIC_FOLLOW_TOP_INSET_PX}
      beginProgrammaticLyricsScroll={beginProgrammaticLyricsScroll}
      onClearBrowseTimer={() => {
        if (lyricsBrowseTimerRef.current) {
          clearTimeout(lyricsBrowseTimerRef.current);
          lyricsBrowseTimerRef.current = null;
        }
        setLyricsUserBrowsing(false);
      }}
    />
  );

  // 移动端小封面：外露只留三点；bar 由宿主 ActionBar hideBar 投影进菜单
  const hideCompactCollapsedBar = isCompact && coverHidden;

  const actionRail = (
    <ActionBar
      layout={actionLayout}
      actions={actionContributions}
      hideBar={hideCompactCollapsedBar}
      distribute={isCompact && !coverHidden ? "even" : isCompact ? "start" : "end"}
      iconSize={actionIconSize}
      mutedColor={mutedIcon}
      accentColor={accent}
      testID="music-action"
      overflowMenu={{
        side: "top",
        align: "end",
        triggerSize: actionIconSize,
        triggerColor: mutedIcon,
        moreLabel: controlTitles.more ?? "更多",
        showEditLayout: true,
        editLayoutLabel: "编辑布局",
        onEditLayout: handleOpenEditLayout,
        testID: "music-action-overflow",
        renderHoverSidePanel: renderOverflowHoverSidePanel,
      }}
    />
  );

  const seekRow = (
    <MusicSeekProgress duration={duration}>
      {(seekProgress, seekTime) => {
        // 桌面：进度条只做进度；音量改右侧悬浮竖条。移动端：点音量键把进度槽切成音量条。
        const useInlineVolume = isCompact && transportSliderMode === "volume";
        return (
          <View style={styles.transportTimes} testID="music-transport-slider-row">
            <Text style={styles.timeText}>{useInlineVolume ? "音量" : formatClock(seekTime)}</Text>
            {useInlineVolume ? (
              <View style={styles.inlineVolumeBar}>
                <VolumeBar
                  value={effectiveVolume}
                  onChange={handleVolumeChange}
                  wide
                  testID="music-volume-inline-bar"
                />
              </View>
            ) : (
              <SeekBar
                progress={seekProgress}
                buffered={seekBuffered}
                onSeekRatio={handleSeekRatio}
                testID="music-seek-bar"
                previewMode={
                  desktopVolumeHoverEnabled ? "desktop-hover" : isCompact ? "compact-tap" : "none"
                }
                previewVisible={seekPreview.visible}
                previewRatio={seekPreview.ratio}
                previewLabel={
                  duration > 0
                    ? formatClock(
                        (seekPreview.visible ? seekPreview.ratio : seekProgress) * duration,
                      )
                    : null
                }
                onPreviewChange={handleSeekPreviewChange}
              />
            )}
            <Text style={styles.timeText}>
              {useInlineVolume ? `${Math.round(effectiveVolume * 100)}%` : formatClock(duration)}
            </Text>
            {isCompact ? (
              <IconHit
                label={transportSliderMode === "progress" ? (muted ? "取消静音" : "音量") : "进度"}
                tipLabel={
                  transportSliderMode === "progress"
                    ? stripShortcutSuffix(
                        controlTitles["action:volume"] ?? (muted ? "取消静音" : "音量"),
                      )
                    : "切换回播放进度"
                }
                shortcutKeys={
                  transportSliderMode === "progress"
                    ? resolveControlShortcutKeys("action:volume")
                    : undefined
                }
                onPress={() => {
                  if (transportSliderMode === "progress" && muted) {
                    setMuted(false);
                  }
                  setTransportSliderMode((mode) => (mode === "progress" ? "volume" : "progress"));
                }}
                testID="music-slider-mode-toggle"
              >
                {transportSliderMode === "progress" ? (
                  muted || volume <= 0 ? (
                    <VolumeX size={18} color={mutedIcon} />
                  ) : (
                    <Volume2 size={18} color={mutedIcon} />
                  )
                ) : (
                  <Timer size={18} color={accent} />
                )}
              </IconHit>
            ) : null}
          </View>
        );
      }}
    </MusicSeekProgress>
  );

  const searchEdgeSeek = (
    <MusicSeekProgress duration={duration}>
      {(progressValue) => {
        const useInlineVolume = isCompact && transportSliderMode === "volume";
        return (
          <View style={styles.searchEdgeSeekRow} testID="music-search-edge-seek">
            {useInlineVolume ? (
              <VolumeBar
                value={effectiveVolume}
                onChange={handleVolumeChange}
                variant="edge"
                testID="music-search-volume-bar"
              />
            ) : (
              <SeekBar
                progress={progressValue}
                buffered={seekBuffered}
                onSeekRatio={handleSeekRatio}
                variant="edge"
                testID="music-seek-bar-edge"
                previewMode={
                  desktopVolumeHoverEnabled ? "desktop-hover" : isCompact ? "compact-tap" : "none"
                }
                previewVisible={seekPreview.visible}
                previewRatio={seekPreview.ratio}
                previewLabel={
                  duration > 0
                    ? formatClock(
                        (seekPreview.visible ? seekPreview.ratio : progressValue) * duration,
                      )
                    : null
                }
                onPreviewChange={handleSeekPreviewChange}
              />
            )}
          </View>
        );
      }}
    </MusicSeekProgress>
  );

  const compactTransportVolumeControl = (
    <IconHit
      label={transportSliderMode === "progress" ? (muted ? "取消静音" : "音量") : "进度"}
      tipLabel={
        transportSliderMode === "progress"
          ? stripShortcutSuffix(controlTitles["action:volume"] ?? (muted ? "取消静音" : "音量"))
          : "切换回播放进度"
      }
      shortcutKeys={
        transportSliderMode === "progress" ? resolveControlShortcutKeys("action:volume") : undefined
      }
      onPress={() => {
        if (transportSliderMode === "progress" && muted) {
          setMuted(false);
        }
        setTransportSliderMode((mode) => (mode === "progress" ? "volume" : "progress"));
      }}
      testID="music-search-volume-toggle"
    >
      {transportSliderMode === "progress" ? (
        muted || volume <= 0 ? (
          <VolumeX size={20} color={mutedIcon} />
        ) : (
          <Volume2 size={20} color={mutedIcon} />
        )
      ) : (
        <Timer size={20} color={accent} />
      )}
    </IconHit>
  );

  const desktopTransportVolumeControl = (
    <View
      style={[styles.volumeSlot, desktopVolumeHoverOpen ? styles.volumeSlotRaised : null]}
      testID="music-desktop-volume-slot"
      {...(isWeb
        ? {
            onMouseEnter: openDesktopVolumeHover,
            onMouseLeave: scheduleCloseDesktopVolumeHover,
          }
        : null)}
    >
      {desktopVolumeHoverOpen ? (
        <View
          style={[styles.volumePopover, styles.volumePopoverDesktop]}
          testID="music-desktop-volume-popover"
        >
          <VolumeBar
            value={volume}
            onChange={handleVolumeChange}
            vertical
            testID="music-desktop-volume-bar"
          />
        </View>
      ) : null}
      <IconHit
        label={muted || volume <= 0 ? "取消静音" : "静音"}
        tipLabel={stripShortcutSuffix(
          controlTitles["action:volume"] ?? (muted || volume <= 0 ? "取消静音" : "静音"),
        )}
        tipEnabled={!desktopVolumeHoverOpen}
        shortcutKeys={resolveControlShortcutKeys("action:volume")}
        onPress={handleToggleMute}
        testID="music-desktop-volume-toggle"
      >
        {muted || volume <= 0 ? (
          <VolumeX size={16} color={mutedIcon} />
        ) : (
          <Volume2 size={16} color={mutedIcon} />
        )}
      </IconHit>
    </View>
  );

  const transportSideIconSize = isCompact ? 20 : 16;
  const transportControlContext = {
    IconHit,
    controlTitles,
    stripShortcutSuffix,
    resolveControlShortcutKeys,
  };
  const transportModeControl = (
    <TransportModeControl
      {...transportControlContext}
      playMode={playMode}
      playModeLabel={playModeLabel}
      ModeIcon={ModeIcon}
      accentColor={accent}
      iconSize={transportSideIconSize}
      onCycleMode={handleCycleMode}
    />
  );
  const transportQueueControl = (
    <TransportQueueControl
      {...transportControlContext}
      queueOpen={queueOpen}
      accentColor={accent}
      mutedIconColor={mutedIcon}
      iconSize={transportSideIconSize}
      onToggleQueue={handleToggleQueue}
    />
  );
  const transportRight = (
    <View style={[styles.transportSideRight, inSearch ? styles.transportSideRightSearch : null]}>
      {!isCompact
        ? desktopTransportVolumeControl
        : inSearch && showShellVolume
          ? compactTransportVolumeControl
          : null}
      {transportModeControl}
      {transportQueueControl}
    </View>
  );

  /** 上/播/下：必须直接作为 flex row 子节点，勿抽到外文件 Fragment/间接容器（RN Web 会丢布局） */
  const renderPlaybackCluster = (opts: {
    density: "desktop" | "compact" | "search";
    containerStyle?: object;
    containerTestID?: string;
  }) => {
    const skipSize = opts.density === "compact" ? 22 : 20;
    const playSize = opts.density === "compact" ? 24 : 22;
    const testIds =
      opts.density === "search"
        ? {
            prev: "music-search-transport-prev",
            play: "music-search-transport-play",
            next: "music-search-transport-next",
          }
        : {
            prev: "music-prev",
            play: "music-play-toggle",
            next: "music-next",
          };
    const playLabel = (() => {
      if (streamResolving) {
        return "加载中";
      }
      return playing ? "暂停" : "播放";
    })();
    return (
      <View
        style={[styles.transportCenter, opts.containerStyle]}
        pointerEvents="box-none"
        testID={opts.containerTestID}
      >
        <IconHit
          label="上一首"
          tipLabel={stripShortcutSuffix(controlTitles["transport:prev"] ?? "上一首")}
          shortcutKeys={resolveControlShortcutKeys("transport:prev")}
          onPress={handlePrev}
          testID={testIds.prev}
        >
          <SkipBack
            size={skipSize}
            color={theme.colors.foreground}
            fill={theme.colors.foreground}
          />
        </IconHit>
        <IconHit
          label={playLabel}
          tipLabel={stripShortcutSuffix(controlTitles["transport:play"] ?? playLabel)}
          shortcutKeys={resolveControlShortcutKeys("transport:play")}
          onPress={handlePlayPress}
          variant="play"
          testID={testIds.play}
        >
          <View style={styles.playButton}>
            {streamResolving ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : playing ? (
              <Pause
                size={playSize}
                color={theme.colors.background}
                fill={theme.colors.background}
              />
            ) : (
              <Play
                size={playSize}
                color={theme.colors.background}
                fill={theme.colors.background}
              />
            )}
          </View>
        </IconHit>
        <IconHit
          label="下一首"
          tipLabel={stripShortcutSuffix(controlTitles["transport:next"] ?? "下一首")}
          shortcutKeys={resolveControlShortcutKeys("transport:next")}
          onPress={handleNext}
          testID={testIds.next}
        >
          <SkipForward
            size={skipSize}
            color={theme.colors.foreground}
            fill={theme.colors.foreground}
          />
        </IconHit>
      </View>
    );
  };

  const searchCenterShowPlayback = streamResolving || searchCenterControlsOpen;
  const searchDesktopCenter = (
    <View style={styles.searchDesktopCenter} testID="music-search-transport-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={searchCenterShowPlayback ? "显示歌词" : "显示播放控制"}
        onPress={() => {
          if (streamResolving) {
            return;
          }
          setSearchCenterControlsOpen((open) => !open);
        }}
        style={styles.searchDesktopCenterDismiss}
        testID="music-search-transport-center-dismiss"
      />
      {searchCenterShowPlayback ? (
        renderPlaybackCluster({
          density: "search",
          containerStyle: styles.searchDesktopCenterControlsRow,
          containerTestID: "music-search-transport-controls",
        })
      ) : (
        <MusicSearchTransportLyrics
          lyricUnits={lyricUnits}
          progressLines={lyricProgressLines}
          onShowControls={() => setSearchCenterControlsOpen(true)}
          useCssKaraoke={isWeb}
          litColor={theme.colors.accent}
          pendingColor={theme.colors.foregroundMuted}
          primaryFontSize={Number(theme.fontSize.base) || 16}
          primaryLineHeight={22}
          secondaryFontSize={Number(theme.fontSize.sm) || 14}
          secondaryLineHeight={18}
          fontWeight={theme.fontWeight.semibold}
          stackStyle={styles.searchDesktopLyricStack}
          stripStyle={styles.searchDesktopLyricStrip}
          primaryTextStyle={styles.searchDesktopLyricText}
          secondaryTextStyle={styles.searchDesktopLyricTextSecondary}
        />
      )}
    </View>
  );

  /** 搜索面底栏三栏：左(封面+标题+三点) | 剩余空间居中(歌词/控制) | 右(模式+队列) */
  const searchTransport = (
    <View
      style={[
        styles.transport,
        styles.transportNoDivider,
        isCompact ? styles.transportCompact : null,
        styles.transportSearch,
        compactFloatingOverlayVisible ? styles.floatingChromeAbove : null,
      ]}
      testID="workspace-mini-app-music-transport"
    >
      {searchEdgeSeek}
      {isCompact ? (
        <View style={[styles.transportControls, styles.transportControlsSearchCompact]}>
          <View
            style={[
              styles.transportSide,
              styles.transportSideSearch,
              styles.transportSideSearchCompact,
            ]}
          >
            {miniNowPlaying}
          </View>
        </View>
      ) : (
        <View style={[styles.transportControls, styles.transportControlsSearchDesktop]}>
          <View style={styles.searchTransportLeft}>{miniNowPlaying}</View>
          <View style={styles.searchTransportCenter}>{searchDesktopCenter}</View>
          <View style={styles.searchTransportRight}>{transportRight}</View>
        </View>
      )}
    </View>
  );

  const transport = inSearch ? (
    searchTransport
  ) : isCompact ? (
    <View
      style={[
        styles.transport,
        styles.transportNoDivider,
        styles.transportCompact,
        compactFloatingOverlayVisible ? styles.floatingChromeAbove : null,
      ]}
      testID="workspace-mini-app-music-transport"
    >
      {/* 大封面：操作组钉在底部 chrome（进度条上方居中），绝不插在封面/歌词中间 */}
      {!coverHidden ? (
        <View style={styles.compactActionRailBottom} testID="music-compact-action-rail-bottom">
          {actionRail}
        </View>
      ) : null}
      {seekRow}
      <View style={styles.compactControls}>
        <TransportModeControl
          {...transportControlContext}
          playMode={playMode}
          playModeLabel={playModeLabel}
          ModeIcon={ModeIcon}
          accentColor={accent}
          iconSize={20}
          onCycleMode={handleCycleMode}
        />
        {renderPlaybackCluster({ density: "compact" })}
        <TransportQueueControl
          {...transportControlContext}
          queueOpen={queueOpen}
          accentColor={accent}
          mutedIconColor={mutedIcon}
          iconSize={20}
          onToggleQueue={handleToggleQueue}
        />
      </View>
    </View>
  ) : (
    <View
      style={[styles.transport, styles.transportNoDivider]}
      testID="workspace-mini-app-music-transport"
    >
      {seekRow}
      <View style={styles.transportControls}>
        <View style={styles.transportSide}>{actionRail}</View>
        {renderPlaybackCluster({ density: "desktop" })}
        {transportRight}
      </View>
    </View>
  );

  const playerStageNode = isCompact ? (
    <View style={styles.compactStage} pointerEvents={inSearch ? "none" : "auto"}>
      {/*
        移动端舞台只放内容，底部 chrome 留给 transport：
        大封面：封面+歌名艺人一体 identity + 歌词(flex)
        小封面：歌词 + dock(identity 左/操作右)
      */}
      {coverHidden ? null : <View style={styles.compactUnderCoverMeta}>{playerIdentity}</View>}
      <View style={styles.compactLyricsRow} testID="workspace-mini-app-music-compact-lyrics">
        <View style={styles.compactLyricsMain}>{lyricsBlock}</View>
      </View>
      {coverHidden ? (
        <View style={styles.compactDock}>
          <View style={styles.compactDockRow}>
            {playerIdentity}
            <View style={styles.actionRailCompactInline}>{actionRail}</View>
          </View>
        </View>
      ) : null}
    </View>
  ) : (
    <View
      style={[styles.stage, styles.stageDesktop]}
      pointerEvents={inSearch ? "none" : "auto"}
      onLayout={handleDesktopStageLayout}
    >
      {coverHidden ? null : (
        <View
          style={[
            styles.heroColumn,
            {
              width: desktopStageSplit.coverWidthPx,
              minWidth: desktopStageSplit.coverWidthPx,
              maxWidth: desktopStageSplit.coverWidthPx,
              flexGrow: 0,
              flexShrink: 0,
            },
          ]}
          testID="music-desktop-hero-column"
        >
          {playerIdentity}
        </View>
      )}
      <View
        style={[
          styles.lyricsColumn,
          coverHidden ? styles.lyricsColumnExpanded : null,
          coverHidden
            ? { flex: 1 }
            : {
                width: desktopStageSplit.lyricsWidthPx,
                minWidth: desktopStageSplit.lyricsWidthPx,
                maxWidth: desktopStageSplit.lyricsWidthPx,
                flexGrow: 0,
                flexShrink: 0,
              },
        ]}
        testID="workspace-mini-app-music-desktop-lyrics"
      >
        {coverHidden ? <View style={styles.desktopExpandedMeta}>{playerIdentity}</View> : null}
        <View style={styles.lyricsRow}>
          <View style={styles.lyricsMain}>{lyricsBlock}</View>
        </View>
      </View>
    </View>
  );

  const topLeadingChrome =
    !inSearch && showShellSearch ? (
      <View style={styles.topLeadingChrome} pointerEvents="box-none">
        <IconHit
          label="搜索"
          tipLabel={stripShortcutSuffix(
            controlTitles.search ?? controlTitles["action:search"] ?? "搜索",
          )}
          shortcutKeys={
            resolveControlShortcutKeys("action:search") ?? resolveControlShortcutKeys("search")
          }
          onPress={handleOpenSearch}
          testID="music-top-search-toggle"
        >
          <Search size={20} color={theme.colors.foreground} />
        </IconHit>
      </View>
    ) : null;

  // 与左上搜索对称：右上常驻；仅用户滚动离开跟唱（触发态）时冰蓝，默认 muted。
  // 播放列表打开时由队列抽屉更高 zIndex 自然挡住，无需条件隐藏。
  const topTrailingChrome = !inSearch ? (
    <View style={styles.topTrailingChrome} pointerEvents="box-none">
      <IconHit
        label="恢复滚动"
        tipLabel="恢复滚动"
        shortcutKeys={resolveControlShortcutKeys("lyrics:resumeFollow")}
        onPress={handleResumeLyricsFollow}
        testID="music-lyrics-follow-fab"
      >
        <LocateFixed
          size={20}
          color={
            lyricsUserBrowsing ? MUSIC_LYRICS_FOLLOW_ACTIVE_COLOR : theme.colors.foregroundMuted
          }
        />
      </IconHit>
    </View>
  ) : null;

  const searchSurfaceNode = inSearch ? (
    <View style={styles.searchSurface} testID="music-search-drawer">
      <MusicSearchView
        onBack={handleBackToPlayer}
        onPlayLocalTrack={handleSearchPlayLocal}
        onSelectTrackHit={handleSearchSelectTrackHit}
        onPlayAllTrackHits={handleSearchPlayAllTrackHits}
        onEnqueueTrackHits={handleSearchEnqueueTrackHits}
        onPlayNextTrackHit={handleSearchPlayNextTrackHit}
        onEnqueueTrackHit={handleSearchEnqueueTrackHit}
        onSaveTrackHit={handleSearchSaveTrackHit}
      />
    </View>
  ) : null;

  return (
    <View
      style={[
        styles.root,
        isCompact ? styles.rootCompact : null,
        inSearch ? styles.rootSearch : null,
      ]}
      testID="workspace-mini-app-music-player"
    >
      {topLeadingChrome}
      {topTrailingChrome}
      {compactFloatingOverlayVisible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭浮层"
          onPress={dismissFloatingControls}
          style={styles.floatingDismissOverlay}
        />
      ) : null}
      <View style={styles.playerBody}>
        <View style={styles.playerBodyForeground}>
          {inSearch ? searchSurfaceNode : playerStageNode}
        </View>
      </View>
      {transport}
      <MusicQueueDrawer
        open={queueOpen}
        compact={isCompact}
        tracks={queueTracks}
        activeId={track.id}
        playModeLabel={playModeLabel(playMode)}
        ModeIcon={ModeIcon}
        onClose={() => setQueueOpen(false)}
        onCyclePlayMode={handleCycleMode}
        onSelect={handleQueueSelect}
        onRemove={handleQueueRemove}
        onMove={handleQueueMove}
        onTrackMenuAction={handleTrackMenuAction}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  searchDrawer: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  searchSurface: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  playerBody: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    // 吃掉中间全部高度，把 transport 顶到真底部
    width: "100%",
  },
  playerBodyForeground: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    zIndex: 1,
  },
  topLeadingChrome: {
    // 浮层：不参与布局、不占一整行；叠在封面/歌词左上
    position: "absolute",
    top: theme.spacing[1],
    left: theme.spacing[2],
    zIndex: 30,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 与 topLeadingChrome（搜索）左右对称；zIndex 须低于 MusicQueueDrawer，否则压住列表循环钮 */
  topTrailingChrome: {
    position: "absolute",
    top: theme.spacing[1],
    right: theme.spacing[2],
    zIndex: 30,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  compactUnderCoverMeta: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: theme.spacing[3],
    marginTop: 2,
    marginBottom: 2,
    flexGrow: 0,
    flexShrink: 0,
  },
  /** @deprecated 名称保留：大封面操作组改贴底部，见 compactActionRailBottom */
  compactActionRailCentered: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0,
  },
  /** 移动端大封面：操作组在底部 transport 内、进度条上方；全宽均匀分布 */
  compactActionRailBottom: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginTop: 0,
    marginBottom: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: theme.spacing[1],
  },
  titleSingleLineRowCompactUnderCover: {
    // 移动大封面：占满可用宽，歌名 marquee 才能溢出滚动
    width: "100%",
    maxWidth: 360,
    flexGrow: 0,
    flexShrink: 1,
    justifyContent: "center",
  },
  headlineCompactUnderCoverSingle: {
    textAlign: "left",
    fontSize: theme.fontSize.lg,
    lineHeight: 24,
  },
  artistMutedInlineCompactUnderCover: {
    maxWidth: "36%",
    flexShrink: 0,
  },
  titleTextColumn: {
    minWidth: 0,
    maxWidth: "100%",
    width: "100%",
    alignSelf: "stretch",
    // stretch：marquee 必须拿到列宽；center 会 shrink-wrap 导致测不到溢出
    alignItems: "stretch",
    overflow: "hidden",
    gap: 2,
  },
  titleSingleLineRow: {
    // 必须有确定宽度上限，MarqueeText 才能测到溢出并滚动
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "nowrap",
    gap: 10,
  },
  titleSingleLineRowDesktop: {
    // 短文案随内容收窄以便整组居中；长文案封顶后走 marquee
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 360,
    width: "auto",
  },
  titleSingleLineRowCompact: {
    // 移动小封面：标题行左起吃满，右侧操作组
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
  },
  /** 单行歌名：吃满剩余宽，溢出走 marquee（勿再 fitContent shrink-wrap） */
  headlineSingleLineMarquee: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: "auto",
    maxWidth: "100%",
    textAlign: "left",
  },
  titleRowUnderCover: {
    justifyContent: "center",
    width: "100%",
  },
  headlineUnderCover: {
    textAlign: "center",
    width: "100%",
  },
  headlineUnderCoverLarge: {
    // 大封面：歌名更大，居中可滚
    textAlign: "center",
    width: "100%",
    lineHeight: 32,
  },
  artistMuted: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
  },
  artistMutedUnderCoverLarge: {
    width: "100%",
    textAlign: "center",
    lineHeight: 24,
  },
  artistMutedInlineOnLine: {
    flexShrink: 0,
    flexGrow: 0,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    maxWidth: "38%",
  },
  artistMutedInlineOnLineDesktop: {
    // 歌名与艺人间距：gap 之外再加一点左内边距，视觉更疏
    marginLeft: 2,
    maxWidth: 180,
  },
  inlineVolumeBar: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  compactControlsLeading: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "42%",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  compactControlsCenter: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
  },
  root: {
    flex: 1,
    position: "relative",
    paddingTop: theme.spacing[4],
    // 播放器底栏与窗体边缘留 8px，避免控件贴底
    paddingBottom: 8,
    // 左右留白由歌词区自行 paddingHorizontal，不再用两侧 gutter 触控条
    paddingLeft: 0,
    paddingRight: 0,
    gap: theme.spacing[3],
    // 透明：让宿主氛围 wash / pane 画布底色透出；沉浸染色否则被不透明 background 盖死。
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  /** 搜索面去掉根节点上 padding；底边仍留 8px，与普通播放器一致 */
  rootSearch: {
    paddingTop: 0,
    paddingBottom: 8,
    gap: 0,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  emptyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    marginTop: theme.spacing[4],
  },
  emptySearchHit: {
    marginTop: 0,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.22)", // 氛围壳 inset；禁止 Theme surface2 灰岛
  },
  emptySearchText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.medium,
  },
  miniNowPlaying: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    minWidth: 0,
    maxWidth: 360,
    flexGrow: 1,
    flexShrink: 1,
    alignSelf: "center",
  },
  transportIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  transportIdentityRowDesktop: {
    flexGrow: 0,
    flexShrink: 0,
  },
  transportIdentityRowCompact: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "100%",
  },
  miniNowPlayingDesktopSearch: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "none" as unknown as number,
    width: "auto" as unknown as number,
    alignSelf: "center",
  },
  miniNowPlayingCompactSearch: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "100%",
    width: "100%",
    alignSelf: "stretch",
  },
  miniCoverHit: {
    flexGrow: 0,
    flexShrink: 0,
  },
  miniNowPlayingMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 200,
  },
  miniNowPlayingMainDesktopSearch: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: 220,
  },
  miniNowPlayingMainCompactSearch: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "100%",
  },
  miniCover: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.22)", // 氛围壳 inset；禁止 Theme surface2 灰岛
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 0,
    flexShrink: 0,
    overflow: "hidden",
    position: "relative",
  },
  miniCoverImage: {
    width: "100%",
    height: "100%",
  },
  miniCoverGlyph: {
    fontSize: 16,
    color: theme.colors.foregroundMuted,
  },
  miniCoverLoading: {
    ...RNStyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  miniMeta: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 180,
    justifyContent: "center",
    gap: 2,
  },
  miniMetaDesktopSearch: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: 200,
  },
  miniMetaCompactSearch: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "100%",
  },
  miniTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.foreground,
  },
  miniArtist: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
  compactScroll: {
    flex: 1,
    minHeight: 0,
  },
  compactScrollContent: {
    alignItems: "center",
    gap: theme.spacing[3],
    paddingBottom: theme.spacing[2],
  },
  compactStage: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: theme.spacing[1],
    // 搜索绝对浮层，不占整行；内容顶对齐，底部 chrome 由 root 的 transport 钉死
    paddingTop: 0,
  },
  compactLyricsRow: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: theme.spacing[4],
  },
  compactLyricsMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  compactDock: {
    width: "100%",
    maxWidth: 420,
    alignItems: "stretch",
    gap: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: theme.spacing[2],
  },
  compactDockRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2],
    minWidth: 0,
    minHeight: 44,
  },
  actionRailCompactInline: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "center",
  },
  rootCompact: {
    gap: 0,
    paddingTop: 0,
    paddingBottom: theme.spacing[1],
    paddingLeft: 0,
    justifyContent: "flex-start",
  },
  transportCompact: {
    gap: theme.spacing[1],
    paddingTop: theme.spacing[1],
    paddingBottom: theme.spacing[1],
    borderTopWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
  },
  transportNoDivider: {
    borderTopWidth: 0,
    borderTopColor: "transparent",
  },
  transportSearch: {
    // 与播放器底栏控制行同高感：保留一点顶 padding，中区 minHeight 56
    paddingTop: theme.spacing[1],
    gap: theme.spacing[1],
  },
  searchEdgeSeekRow: {
    width: "100%",
    marginRight: -theme.spacing[4],
    paddingRight: theme.spacing[4],
    marginTop: 0,
  },
  transportSideSearch: {
    flex: 1,
    maxWidth: "100%",
  },
  transportSideSearchDesktop: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: "58%",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  transportSideSearchCompact: {
    flex: 1,
    maxWidth: "100%",
  },
  transportControlsSearchDesktop: {
    alignItems: "center",
    minHeight: 56,
    width: "100%",
  },
  transportControlsSearchCompact: {
    width: "100%",
  },
  /** 左：封面+标题+三点（三点紧贴标题，不留大空白） */
  searchTransportLeft: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: theme.spacing[1],
  },
  /** 中：剩余空间；歌词在此区域内水平居中 */
  searchTransportCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[3],
  },
  /** 右：模式+队列，右对齐 */
  searchTransportRight: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing[1],
  },
  searchDesktopLyricStrip: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    zIndex: 1,
    overflow: "hidden",
    paddingHorizontal: theme.spacing[2],
  },
  searchDesktopLyricStack: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  searchDesktopLyricCentered: {
    textAlign: "center",
    width: "100%",
  },
  searchDesktopLyricWord: {
    // Web：禁止单词内断行；RN Text 嵌套时以词为换行单元
    flexShrink: 0,
    ...({ whiteSpace: "nowrap" } as object),
  },
  searchDesktopCenter: {
    position: "relative",
    width: "100%",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  searchDesktopCenterDismiss: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  searchDesktopCenterControlsRow: {
    zIndex: 1,
    overflow: "visible",
  },
  searchDesktopLyricText: {
    textAlign: "center",
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.foreground,
  },
  searchDesktopLyricTextSecondary: {
    textAlign: "center",
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
    fontWeight: theme.fontWeight.normal,
    color: theme.colors.foregroundMuted,
  },
  searchDesktopLyricCharLit: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.bold,
  },
  searchDesktopLyricCharPending: {
    color: theme.colors.foreground,
    opacity: 0.38,
  },
  floatingChromeAbove: {
    zIndex: 6,
  },
  titleInlineCover: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.22)", // 氛围壳 inset；禁止 Theme surface2 灰岛
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexGrow: 0,
    flexShrink: 0,
  },
  titleInlineCoverDesktop: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  titleInlineCoverImage: {
    width: "100%",
    height: "100%",
  },
  titleInlineCoverGlyph: {
    fontSize: 14,
    color: theme.colors.foregroundMuted,
  },
  titleInlineCoverGlyphDesktop: {
    fontSize: 12,
  },
  metaColumnDesktopCollapsed: {
    alignItems: "center",
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  titleRowDesktopCollapsed: {
    // 桌面收起：整组（小封面+歌名艺人）shrink-wrap 后居中；间距约半个字
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    minHeight: 28,
    paddingVertical: 0,
    width: "auto",
    maxWidth: "90%",
    alignSelf: "center",
    flexGrow: 0,
  },
  headlineDesktopCollapsed: {
    textAlign: "left",
    fontSize: 24,
    lineHeight: 30,
  },
  compactMiniRow: {
    width: "100%",
    alignItems: "flex-start",
  },
  stage: {
    flex: 1,
    minHeight: 0,
    gap: theme.spacing[4],
  },
  stageDesktop: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  heroColumn: {
    gap: theme.spacing[3],
    justifyContent: "center",
    // 裁切交给标题 marquee 视口；列本身 hidden 会在测宽失败时「静默截断」
    overflow: "visible",
    // 左缘留白：与歌词区右缘呼吸感对称；勿贴死播放器左边界
    paddingLeft: theme.spacing[4],
    paddingRight: theme.spacing[2],
  },
  heroColumnCompact: {
    alignItems: "stretch",
  },
  lyricsColumn: {
    minWidth: 0,
    borderLeftWidth: RNStyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
    paddingLeft: theme.spacing[2],
    paddingRight: theme.spacing[2],
  },
  lyricsColumnExpanded: {
    flex: 1,
    borderLeftWidth: 0,
    paddingLeft: 0,
  },
  lyricsRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: theme.spacing[4],
  },
  lyricsMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  desktopExpandedMeta: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    marginBottom: theme.spacing[2],
    flexGrow: 0,
    flexShrink: 0,
  },
  cover: {
    width: 280,
    height: 280,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    alignSelf: "center",
    flexGrow: 0,
    flexShrink: 0,
  },
  coverDesktop: {
    width: 280,
    height: 280,
    alignSelf: "center",
  },
  coverCompact: {
    width: 120,
    height: 120,
    marginTop: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0,
  },
  coverArt: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: theme.borderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.22)", // 氛围壳 inset；禁止 Theme surface2 灰岛
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  coverImage: {
    ...RNStyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  coverGlyph: {
    fontSize: 48,
    color: theme.colors.foregroundMuted,
  },
  metaColumn: {
    gap: theme.spacing[1],
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    alignSelf: "stretch",
    alignItems: "stretch",
    overflow: "hidden",
  },
  playerIdentityHero: {
    width: "100%",
    minWidth: 0,
    alignSelf: "stretch",
    alignItems: "center",
    overflow: "hidden",
    gap: theme.spacing[2],
  },
  playerIdentityHeroCompact: {
    gap: theme.spacing[1],
    alignItems: "center",
  },
  metaColumnCompact: {
    maxWidth: 420,
    width: "100%",
    alignItems: "center",
  },
  metaColumnCompactInline: {
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
    alignItems: "flex-start",
    alignSelf: "center",
    justifyContent: "center",
    // 与右侧 40px 图标行同一垂直中线，避免标题视觉偏上
    minHeight: 44,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    width: "100%",
    minWidth: 0,
    flexWrap: "nowrap",
    overflow: "visible",
    paddingVertical: 2,
  },
  titleRowCompactInline: {
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
    maxWidth: "100%",
    minHeight: 44,
    height: 44,
    paddingVertical: 0,
  },
  headline: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: "100%",
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
    textAlign: "center",
    lineHeight: 28,
  },
  headlineCompact: {
    textAlign: "center",
    fontSize: theme.fontSize["2xl"],
    lineHeight: 36,
  },
  headlineCompactInline: {
    // 勿加 maxWidth：否则 dock 单行歌名被掐死，Marquee 测不到溢出 / 可视区过窄
    textAlign: "left",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: theme.fontWeight.semibold,
  },
  artist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  artistCompact: {
    textAlign: "center",
  },
  lyricsFadeHost: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    overflow: "hidden",
  },
  lyricsPane: {
    flex: 1,
    minHeight: 0,
  },
  lyricsContent: {
    flexGrow: 1,
    paddingTop: LYRIC_LIST_TOP_LEAD_PX,
    paddingBottom: LYRIC_LIST_BOTTOM_LEAD_PX,
    paddingHorizontal: 0,
    gap: 0,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  lyricsContentRelaxed: {
    gap: theme.spacing[3],
  },
  lyricsContentCompact: {
    paddingTop: LYRIC_LIST_TOP_LEAD_PX,
    paddingBottom: LYRIC_LIST_BOTTOM_LEAD_PX,
    paddingHorizontal: 0,
    gap: 0,
  },
  lyricsContentCompactRelaxed: {
    gap: theme.spacing[2],
  },
  lyricsContentSearchTransport: {
    paddingTop: Math.round(LYRIC_LIST_TOP_LEAD_PX * 0.75),
    paddingBottom: Math.round(LYRIC_LIST_BOTTOM_LEAD_PX * 0.75),
    gap: 0,
    justifyContent: "flex-start",
  },
  lyricsContentSearchTransportRelaxed: {
    gap: theme.spacing[1],
  },
  lyricsEmptyWrap: {
    flexGrow: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[8],
  },
  lyricsEmpty: {
    fontSize: theme.fontSize.base,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
  },
  lyricLine: {
    width: "100%",
    fontSize: theme.fontSize.lg,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 32,
  },
  lyricLineHit: {
    position: "relative",
    width: "100%",
    alignSelf: "stretch",
    paddingVertical: theme.spacing[2],
    // 仅留一点给时间/播放钮，高亮框尽量拉满横向
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    // 预留边框占位，避免点选绿框时行高跳动
    borderWidth: 1,
    borderColor: "transparent",
  },
  lyricLineHitBilingual: {
    gap: 2,
    paddingVertical: theme.spacing[1.5],
  },
  lyricLineBilingualSecondary: {
    fontSize: theme.fontSize.base,
    lineHeight: 24,
    opacity: 0.78,
  },
  lyricLineHitCompact: {
    paddingHorizontal: theme.spacing[2],
  },
  lyricLineHitSearchTransport: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing[2],
  },
  lyricLineHovered: {
    backgroundColor: "rgba(0,0,0,0.22)", // 氛围壳 inset；禁止 Theme surface2 灰岛
  },
  lyricLineSelected: {
    backgroundColor: "rgba(0,0,0,0.22)", // 氛围壳 inset；禁止 Theme surface2 灰岛
    borderColor: theme.colors.accent,
  },
  lyricSelectPlay: {
    position: "absolute",
    right: theme.spacing[1],
    top: "50%",
    marginTop: -14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  lyricSelectTime: {
    position: "absolute",
    left: theme.spacing[1],
    top: "50%",
    marginTop: -8,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.foregroundMuted,
  },
  lyricActive: {
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize["2xl"],
    lineHeight: 40,
    letterSpacing: 0.3,
  },
  lyricActiveBilingualSecondary: {
    fontSize: theme.fontSize.lg,
    lineHeight: 28,
    letterSpacing: 0.15,
    opacity: 1,
  },
  lyricLineSearchTransport: {
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
  },
  lyricActiveSearchTransport: {
    fontSize: theme.fontSize.base,
    lineHeight: 24,
  },
  lyricCharLit: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.bold,
  },
  lyricCharPending: {
    color: theme.colors.foreground,
    opacity: 0.38,
  },
  actionRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexWrap: "nowrap",
  },
  actionRailCompact: {
    // dock 右对齐时保持 auto；大封面底栏在 compactActionRailBottom 内再拉满宽
    width: "auto",
    maxWidth: "100%",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    marginTop: 0,
    gap: theme.spacing[1],
    flexWrap: "nowrap",
  },
  actionRailCompactEven: {
    width: "100%",
    maxWidth: "100%",
    justifyContent: "space-evenly",
    gap: 0,
  },
  transport: {
    // 进度条与控制行贴紧，不要大块水平空白
    gap: 0,
    paddingTop: theme.spacing[2],
    paddingLeft: theme.spacing[4],
    paddingRight: theme.spacing[4],
    borderTopWidth: 0,
    borderTopColor: "transparent",
  },
  transportTimes: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  volumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  compactControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    gap: 0,
    width: "100%",
    paddingHorizontal: theme.spacing[1],
    minHeight: 56,
  },
  transportControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2],
  },
  transportSide: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: theme.spacing[2],
  },
  transportSideDivider: {
    width: RNStyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginVertical: theme.spacing[1],
    backgroundColor: "rgba(255,255,255,0.18)",
    flexGrow: 0,
    flexShrink: 0,
  },
  transportSideRight: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing[1],
    flexWrap: "nowrap",
  },
  transportSideRightSearch: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "center",
  },
  transportCenter: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    minHeight: 56,
    overflow: "visible",
  },
  volumeSlot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
  },
  volumeSlotRaised: {
    zIndex: 8,
  },
  menuVolumePanel: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.28)", // 氛围壳更深 inset；禁止 Theme surface1 灰岛
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    minWidth: 132,
    alignSelf: "center",
  },
  volumePopover: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.22)", // 氛围壳 inset；禁止 Theme surface2 灰岛
    borderWidth: RNStyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    zIndex: 7,
  },
  volumePopoverCompact: {
    left: "50%",
    bottom: 44,
    width: 44,
    marginLeft: -22,
  },
  volumePopoverDesktop: {
    left: "50%",
    bottom: 40,
    width: 40,
    marginLeft: -20,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  iconHitWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  iconHitWrapPlay: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    overflow: "visible",
  },
  iconHit: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconHitPlay: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  iconHitLabeled: {
    width: "auto",
    minWidth: 40,
    paddingHorizontal: theme.spacing[2],
    flexDirection: "row",
    // 图标与文案约半个字
    gap: 7,
  },
  iconHitLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    maxWidth: 88,
  },
  iconHitDisabled: {
    opacity: 0.4,
  },
  floatingDismissOverlay: {
    ...RNStyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  chipText: {
    fontSize: 11,
    color: theme.colors.foregroundMuted,
  },
  progressHit: {
    flex: 1,
    height: 28,
    justifyContent: "center",
    position: "relative",
  },
  progressHitEdge: {
    flex: 1,
    height: 16,
    justifyContent: "center",
  },
  progressTooltip: {
    position: "absolute",
    top: -30,
    minWidth: 44,
    marginLeft: -22,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.22)", // 氛围壳 inset；禁止 Theme surface2 灰岛
    borderWidth: RNStyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  progressTooltipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foreground,
  },
  progressTrack: {
    position: "relative",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  progressTrackEdge: {
    // 与非搜索进度条同厚（4），仅保留 edge：无拇指、顶缘铺满
    height: 4,
    borderRadius: 2,
  },
  progressBuffered: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 4,
    // 勿用 muted：多数主题下与 border 几乎同色，缓冲带会「看不见」
    backgroundColor: theme.colors.foregroundMuted,
    borderRadius: 2,
    opacity: 0.45,
  },
  progressBufferedEdge: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
    zIndex: 1,
  },
  progressFillEdge: {
    height: 4,
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: 9,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    backgroundColor: theme.colors.foreground,
  },
  volumeHit: {
    width: 72,
    flexGrow: 0,
    flexShrink: 0,
    height: 28,
    justifyContent: "center",
  },
  // inlineVolumeBar 内拉满，与进度条同宽手感
  volumeHitVertical: {
    width: 28,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  volumeTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 2,
    overflow: "hidden",
  },
  volumeFill: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  /** 叠在 progressFill 几何上时只覆盖颜色，不改高度/定位 */
  volumeFillColor: {
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  volumeTrackVertical: {
    width: 4,
    flex: 1,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 2,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  volumeFillVertical: {
    width: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
    alignSelf: "stretch",
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.foregroundMuted,
    minWidth: 40,
  },
  meta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  overflowBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[4],
  },
  overflowSheet: {
    width: "100%",
    maxWidth: 320,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.28)", // 氛围壳更深 inset；禁止 Theme surface1 灰岛
    paddingVertical: theme.spacing[2],
    zIndex: 2,
  },
  overflowEmpty: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  overflowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  overflowLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
}));

function openMusicPlayerTab(
  track: Pick<DemoTrack, "id" | "title"> | null,
  context?: WorkspaceAppRunContext,
  options?: { autoPlay?: boolean },
): boolean {
  if (track) {
    const state = useMusicDemoStore.getState();
    state.setNowPlaying(track.id);
    // 关 Tab 再开：按 wantsPlaying 恢复，不强制从头起播；上传/点曲才 explicitAutoPlay。
    if (
      shouldRequestAutoPlayOnOpenPlayer({
        explicitAutoPlay: options?.autoPlay,
        wantsPlaying: state.wantsPlaying,
      })
    ) {
      requestTrackAutoPlay(track.id);
    } else {
      clearPendingTrackAutoPlay();
    }
  }
  return host().openMiniAppTab({
    appId: MUSIC_APP_ID,
    panelId: MUSIC_PANEL_ID,
    entityId: MUSIC_PLAYER_ENTITY_ID,
    serverId: context?.serverId,
    workspaceId: context?.workspaceId,
    currentPathname: context?.currentPathname,
  });
}

async function uploadAndOpenTracks(context?: WorkspaceAppRunContext): Promise<DemoTrack[]> {
  const sources = await host().files.pickAndImport({
    title: "上传音乐",
    multiple: true,
    extensions: ["mp3", "m4a", "aac", "wav", "flac", "ogg", "opus", "webm"],
    accept: "audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,.webm",
    filterLabel: "音频",
    appId: MUSIC_APP_ID,
  });
  if (sources.length === 0) {
    return [];
  }
  const created = useMusicDemoStore.getState().importTracksFromSources(
    sources.map((source) => ({
      title: source.title,
      sourceUri: source.uri,
      kind: source.origin === "remote" ? "cloud" : "local",
    })),
  );
  const first = created[0];
  if (first) {
    openMusicPlayerTab(first, context, { autoPlay: true });
  }
  return created;
}

function getEntityTitle(entityId: string): string | null {
  const state = useMusicDemoStore.getState();
  const id = entityId === MUSIC_PLAYER_ENTITY_ID ? state.nowPlayingId : entityId;
  if (!id) {
    return null;
  }
  return state.tracks.find((track) => track.id === id)?.title?.trim() || null;
}

function subscribeEntityTitle(entityId: string, listener: () => void): () => void {
  void entityId;
  return useMusicDemoStore.subscribe(listener);
}

/** 注册完整 Music：列表 + 播放器 + 命令 + 快捷键 + item 菜单。 */

/** 供 Tab 右键「配置」与播放器内「编辑布局」共用：player surface entity-menu（与侧栏 item-menu 独立）。 */
export function openMusicPlayerActionLayoutEditor(hostApi: WorkspaceAppHostApi): void {
  openMusicTrackEntityMenuLayoutEditor(hostApi, MUSIC_TRACK_MENU_SURFACE.player);
}

export function registerMusicApp(nextHost: WorkspaceAppHostApi): void {
  setMusicHostApi(nextHost);
  setMusicSidecarFetchJson(async (url, init) =>
    nextHost.http.fetchJson(url, {
      method: init?.method,
      headers: init?.headers,
      body: init?.body,
      timeoutMs: init?.timeoutMs ?? 15_000,
    }),
  );
  setMusicHostMediaApis({
    createMediaProxyUrl: nextHost.http.createMediaProxyUrl
      ? (input) => nextHost.http.createMediaProxyUrl!(input)
      : null,
    captureBrowserMedia: nextHost.browserSession?.captureMedia
      ? (input) => nextHost.browserSession!.captureMedia(input)
      : null,
  });
  ensureMusicColdRestoreWatch();
  // Tab 卸载时固化进度（与 player unmount 互补；LRU 卸面板也会走到）。
  nextHost.tabs.onClose((event) => {
    if (event.appId !== MUSIC_APP_ID) {
      return;
    }
    syncMusicPlaybackPositionToStore(true);
  });
  nextHost.lifecycle.onSuspend(() => {
    syncMusicPlaybackPositionToStore(true);
  });
  nextHost.lifecycle.onResume(() => {
    // 回前台：若仍 wantsPlaying 但 Audio 被策略/挂起打断，再抢一次。
    void maybeRestoreMusicPlaybackAfterColdStart();
  });
  startMusicPerfSelfReport(nextHost);
  // 单次水合后登记 audio session；HostReady 冷恢复相位或晚注册补跑都会调 restore。
  void bindMusicHostStorage(nextHost.storage, nextHost.sync, nextHost.config).then(() => {
    seedMusicTrackEntityMenuLayouts(nextHost);
    seedMusicSearchMenuLayouts(nextHost);
    nextHost.background.registerSession({
      appId: MUSIC_APP_ID,
      kind: "audio",
      restore: async () => {
        await maybeRestoreMusicPlaybackAfterColdStart();
      },
    });
    // 曲库水合后立刻推封面背景：刷新落在其它 Tab 时播放器未挂载也能恢复宿主层。
    void syncMusicContentBackdropToHost(nextHost);
    return undefined;
  });
  // nowPlaying / 开关变化时同步（不依赖播放器挂载）。
  useMusicDemoStore.subscribe((state, prev) => {
    if (
      state.coverBackdropEnabled === prev.coverBackdropEnabled &&
      state.coverBackdropBlur === prev.coverBackdropBlur &&
      state.coverBackdropOpacity === prev.coverBackdropOpacity &&
      state.coverBackdropIncludeTabBar === prev.coverBackdropIncludeTabBar &&
      state.nowPlayingId === prev.nowPlayingId
    ) {
      return;
    }
    void syncMusicContentBackdropToHost(nextHost);
  });
  registerMusicListContributions(nextHost);
  registerMusicPlayerShortcuts(nextHost);
  startMusicUiSmokeWatcher(nextHost);
  nextHost.registerListItemOpenPreparer(MUSIC_APP_ID, (itemId) => {
    requestTrackAutoPlay(itemId);
    useMusicDemoStore.getState().setNowPlaying(itemId);
  });
  // 卸载后再安装需完整重注册；registry 同 key 覆盖即可。
  nextHost.registerMiniApp({
    id: MUSIC_PANEL_ID,
    appId: MUSIC_APP_ID,
    title: "播放器",
    icon: MusicTabIcon,
    component: MusicPlayerContent,
    getEntityTitle,
    subscribeEntityTitle,
    isPanelBootReady: getMusicHostHydrationCompleted,
    subscribePanelBootReady: subscribeMusicHostHydration,
  });

  const runSidebarTrackMenu = (action: MusicTrackMenuActionId, itemId: string) => {
    void runMusicTrackMenuAction({
      hostApi: host(),
      action,
      trackId: itemId,
    });
  };

  for (const actionId of MUSIC_SIDEBAR_TRACK_MENU_IDS) {
    nextHost.registerItemMenu({
      id: MUSIC_TRACK_MENU_CONTRIBUTION_IDS[actionId],
      appId: MUSIC_APP_ID,
      segmentId: MUSIC_SEGMENT_ID,
      label: MUSIC_TRACK_MENU_ACTION_LABELS[actionId],
      icon: MUSIC_TRACK_MENU_ICONS[actionId],
      shortcutKeys: MUSIC_TRACK_MENU_SHORTCUT_KEYS[actionId],
      shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[actionId],
      resolveLabel: actionId === "pin" ? (item) => (item.pinned ? "取消置顶" : "置顶") : undefined,
      resolveIcon:
        actionId === "pin"
          ? (item) => resolveMusicTrackMenuIcon("pin", Boolean(item.pinned))
          : undefined,
      run: (item) => {
        runSidebarTrackMenu(actionId, item.id);
      },
    });
  }
  nextHost.registerShortcut({
    id: "view-music",
    appId: MUSIC_APP_ID,
    actionId: "workspace.app.view.music",
    helpId: "sidebar-wechat-view-music",
    label: "切换到音乐主视图",
    sectionId: "music",
    sectionTitle: "音乐",
    macCombo: "Cmd+6",
    nonMacCombo: "Ctrl+6",
    helpKeys: ["mod", "6"],
    run: () => {
      host().requestPrimaryView(MUSIC_SEGMENT_ID);
    },
  });
  // 开/关与歌词疏密走宿主 declarative segmented（与设置页 onCard 同壳）；
  // 高亮由宿主 live map 扛，不再私画 surface1 radiogroup。
  const MUSIC_ON_OFF_OPTIONS = [
    { value: "on", label: "开" },
    { value: "off", label: "关" },
  ] as const;
  nextHost.ui.registerDetailSheetExtras({
    appId: MUSIC_APP_ID,
    surface: "config",
    buildRows: () => {
      const state = useMusicDemoStore.getState();
      const store = useMusicDemoStore.getState;
      return [
        {
          label: "沉浸模式",
          value: state.atmospherePushEnabled ? "开" : "关",
          helpText: "开启后按当前封面主色染色整窗；关闭则清除本 App 推送的氛围色。",
          control: {
            type: "segmented",
            options: [...MUSIC_ON_OFF_OPTIONS],
            value: state.atmospherePushEnabled ? "on" : "off",
            testID: "music-detail-immersion",
            onValueChange: (next) => {
              if (next === "on") {
                store().setAtmospherePushEnabled(true);
                return;
              }
              store().setAtmospherePushEnabled(false);
              try {
                host().ui.clearAtmosphere(MUSIC_APP_ID);
              } catch {
                // host 未就绪时只落 store
              }
            },
          },
        },
        {
          label: "封面背景",
          value: state.coverBackdropEnabled ? "开" : "关",
          helpText:
            "开启后在工作区中间区铺当前封面朦胧背景（切到其它 Tab 仍粘滞）；与沉浸模式（整窗取色）独立。",
          control: {
            type: "segmented",
            options: [...MUSIC_ON_OFF_OPTIONS],
            value: state.coverBackdropEnabled ? "on" : "off",
            testID: "music-detail-cover-backdrop",
            onValueChange: (next) => {
              store().setCoverBackdropEnabled(next === "on");
            },
          },
        },
        {
          label: "背景模糊",
          value: String(state.coverBackdropBlur),
          helpText: "封面朦胧模糊半径（0–24）。越大越糊；0 接近清晰底图。",
          valueContent: <MusicCoverBackdropBlurDetailField />,
        },
        {
          label: "背景透明度",
          value: `${Math.round(state.coverBackdropOpacity * 100)}%`,
          helpText: "封面图可见度。越大封面越清晰；越小则更偏暗罩、利于读字。",
          valueContent: <MusicCoverBackdropOpacityDetailField />,
        },
        {
          label: "Tab 一体",
          value: state.coverBackdropIncludeTabBar ? "开" : "关",
          helpText:
            "开启后工作区 Tab 条半透深罩并透出同一封面（比内容区略深、更好扫读）；关闭则 Tab 条保持实底。",
          control: {
            type: "segmented",
            options: [...MUSIC_ON_OFF_OPTIONS],
            value: state.coverBackdropIncludeTabBar ? "on" : "off",
            testID: "music-detail-cover-backdrop-tab-bar",
            onValueChange: (next) => {
              store().setCoverBackdropIncludeTabBar(next === "on");
            },
          },
        },
        {
          label: "搜索缓存",
          value: `${state.searchCacheTtlMinutes} 分钟`,
          helpText:
            "同一关键词在此时间内再次搜索走本地结果；超时才重新打网。不会定时清空缓存，也不会删除搜索历史。改完点「保存」。",
          valueContent: <MusicSearchCacheTtlDetailField />,
        },
        {
          label: "歌词行距",
          value: state.lyricsDensity === "relaxed" ? "宽松" : "紧凑",
          helpText: "点「紧凑/宽松」切换；紧凑仅行内 padding，宽松恢复行间 gap。",
          control: {
            type: "segmented",
            options: [
              { value: "compact", label: "紧凑" },
              { value: "relaxed", label: "宽松" },
            ],
            value: state.lyricsDensity === "relaxed" ? "relaxed" : "compact",
            testID: "music-detail-lyrics-density",
            onValueChange: (next) => {
              store().setLyricsDensity(next === "relaxed" ? "relaxed" : "compact");
            },
          },
        },
      ];
    },
  });
  // 曲目元数据 → 公共详情「元数据」；切歌时重注册以 bump extras revision。
  let musicPublicDetailDataRoot = "—";
  const registerMusicPublicDetailExtras = () => {
    nextHost.ui.registerDetailSheetExtras({
      appId: MUSIC_APP_ID,
      surface: "public",
      buildRows: (context) =>
        buildMusicTrackPublicDetailExtraRows({
          hostApi: host(),
          context,
          dataRoot: musicPublicDetailDataRoot,
        }),
    });
  };
  registerMusicPublicDetailExtras();
  void (async () => {
    try {
      const root = await nextHost.storage.getDataRoot(MUSIC_APP_ID);
      const next = root.trim() || "—";
      if (next === musicPublicDetailDataRoot) {
        return;
      }
      musicPublicDetailDataRoot = next;
      registerMusicPublicDetailExtras();
    } catch {
      // ignore
    }
  })();
  // 仅切歌时重注册：tracks 数组引用在 host sync 等路径会高频换新，若跟听会狂 bump 全局 extrasRevision。
  useMusicDemoStore.subscribe((state, prev) => {
    if (state.nowPlayingId === prev.nowPlayingId) {
      return;
    }
    registerMusicPublicDetailExtras();
  });
  nextHost.registerCommand({
    id: MUSIC_OPEN_PLAYER_COMMAND_ID,
    appId: MUSIC_APP_ID,
    title: "芬达音乐",
    keywords: ["music", "player", "播放器", "音乐", "打开播放器", "芬达", "芬达音乐"],
    icon: MusicTabIcon,
    shortcutHelpId: "music-open-player",
    sidebarAction: {
      defaultVisible: true,
      label: "芬达音乐",
      order: 40,
    },
    run: (context) => {
      const state = useMusicDemoStore.getState();
      const playing =
        (state.nowPlayingId ? state.getTrack(state.nowPlayingId) : undefined) ??
        state.tracks[0] ??
        null;
      openMusicPlayerTab(playing, context);
    },
  });
  nextHost.registerShortcut({
    id: "open-music-player",
    appId: MUSIC_APP_ID,
    actionId: "workspace.app.music.open-player",
    helpId: "music-open-player",
    label: "芬达音乐",
    sectionId: "music",
    sectionTitle: "音乐",
    macCombo: "Cmd+Shift+M",
    nonMacCombo: "Ctrl+Shift+M",
    helpKeys: ["mod", "shift", "M"],
    run: (context) => {
      const state = useMusicDemoStore.getState();
      const playing =
        (state.nowPlayingId ? state.getTrack(state.nowPlayingId) : undefined) ??
        state.tracks[0] ??
        null;
      openMusicPlayerTab(playing, context);
    },
  });
}

export function resetMusicAppRegistrationForTests(): void {
  stopMusicPerfSelfReport();
  resetMusicHostApi();
  pendingPlayerSurface = null;
}
