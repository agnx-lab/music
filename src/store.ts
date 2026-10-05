// 场景：Music 曲目 store（外置包内）— 曲库经 host.storage 三端共享；播放态/进度/队列仅存本端 AsyncStorage。
// 曲库真相源：`$AGNX_HOME/apps/data/music/state/music-v1.json`（P4 短 appId；迁盘脚本会重命名 data 目录）
// hmr-bust: atmosphere-hydrate-gate-default-off
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type {
  WorkspaceAppConfigApi,
  WorkspaceAppListItem,
  WorkspaceAppStorageApi,
  WorkspaceAppSyncApi,
  WorkspaceAppSyncEvent,
} from "@getagnx/app-sdk";
import { getMusicLegacyStorageAppId, getMusicRuntimeAppId } from "./music-runtime-app-id";
import {
  MUSIC_PLAYBACK_FOCUS_CHANNEL,
  shouldHandleRemotePlaybackFocusClaim,
} from "./playback-leader";
import {
  getDefaultMusicPlayerActionLayout,
  normalizeMusicPlayerActionLayout,
  type MusicPlayerActionLayout,
} from "./player-action-layout";
import { coverUrlForStorage } from "./cover-url-quality";
import {
  getDefaultSearchProviderSelection,
  normalizeSearchProviderSelection,
} from "./resource/platform-registry";
import {
  DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES,
  listQueriesFromMusicSearchCaches,
  type MusicSearchResultCacheEntry,
  upsertMusicSearchCacheEntry,
} from "./resource/search-result-cache";
import {
  type MusicCollectionDetailCacheEntry,
  upsertMusicCollectionCacheEntry,
} from "./resource/collection-detail-cache";
import type {
  CollectionKind,
  RemoteRef,
  SearchActiveCollection,
  SearchHitTrack,
  SearchResultPage,
  SearchScope,
} from "./resource/types";
import { sameSearchHitForDownloadBadge, sameSearchHitIdentity } from "./search-hit-identity";
import { getMusicHostApi } from "./music-host";
import {
  loadMusicAppPrefs,
  MUSIC_CONFIG_KEY,
  normalizeMusicAppPrefsDocument,
  saveMusicAppPrefs,
  saveMusicAppPrefsToLocalStorage,
  type MusicAppPrefsDocument,
} from "./app-prefs";

export type MusicTrackSourceKind = "local" | "cloud";

export type MusicPlayMode = "sequence" | "loop-one" | "shuffle";

export interface MusicLastSearchCache {
  query: string;
  scope: SearchScope;
  providerIds: string[];
  page: SearchResultPage | null;
  updatedAt: number;
}

const SEARCH_SCOPES: readonly SearchScope[] = ["all", "track", "artist", "album", "playlist"];

function normalizeSearchScope(value: unknown): SearchScope {
  if (typeof value === "string" && (SEARCH_SCOPES as readonly string[]).includes(value)) {
    return value as SearchScope;
  }
  return "all";
}

export interface DemoTrackAtmosphereBand {
  primary: string;
  secondary?: string;
  tertiary?: string;
}

/** 开沉浸时缓存 light/dark 双套；切 Theme 只选用对应套。 */
export interface DemoTrackAtmospherePalette {
  dark: DemoTrackAtmosphereBand;
  light: DemoTrackAtmosphereBand;
  /** 与 coverUri 对齐；封面换了才允许重算 */
  coverKey: string;
  /** 取色算法版本；双套为 3，旧单套无效 */
  extractVersion?: number;
}

export interface DemoTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUri?: string | null;
  lyrics?: string | null;
  /** 歌词落盘路径；详情/导出复用，禁止每次新写 file_xxx.lrc */
  lyricsUri?: string | null;
  /** 封面首次取色结果；同 coverKey 禁止重复算 */
  atmospherePalette?: DemoTrackAtmospherePalette | null;
  remoteRef?: RemoteRef | null;
  liked?: boolean;
  bookmarked?: boolean;
  /** 侧栏列表置顶 */
  pinned?: boolean;
  sourceUri: string | null;
  sourceKind: MusicTrackSourceKind;
  updatedAt: number;
}

interface MusicDemoState {
  tracks: DemoTrack[];
  nowPlayingId: string | null;
  queueIds: string[];
  playMode: MusicPlayMode;
  volume: number;
  muted: boolean;
  /** 歌词面是否隐藏封面；热更新与重启后恢复 */
  coverHidden: boolean;
  /** 移动端操作按钮组是否显示；热更新与重启后恢复 */
  compactActionRailVisible: boolean;
  /** 歌词行距：紧凑（仅行内 padding）/ 宽松（额外 gap） */
  lyricsDensity: "compact" | "relaxed";
  /** 是否把封面主色推给宿主整窗氛围；默认开 */
  atmospherePushEnabled: boolean;
  /** 是否在宿主中间区铺朦胧封面背景；默认开 */
  coverBackdropEnabled: boolean;
  /** 封面背景模糊 0–24；默认 10 */
  coverBackdropBlur: number;
  /** 封面图透明度 0.15–0.95；默认 0.55 */
  coverBackdropOpacity: number;
  /** Tab 条是否透出封面；默认关 */
  coverBackdropIncludeTabBar: boolean;
  playbackPositionSec: number;
  /** 热更新 / 重挂载后是否应自动续播 */
  wantsPlaying: boolean;
  /** 当前驱动 HTMLAudio 的 daemon clientId；跨端共享，非 leader 端只 mirror UI。 */
  playbackLeaderClientId: string | null;
  /** 播放器主表面：player | search；热更新与重启后恢复 */
  playerSurface: "player" | "search";
  actionLayout: MusicPlayerActionLayout;
  searchHistory: string[];
  /** 搜索页勾选的来源站点（local / netease / qq …），持久化 */
  searchProviderIds: string[];
  /** 最近一次搜索结果快照（防 HMR / 重进搜索页丢结果） */
  lastSearchCache: MusicLastSearchCache | null;
  /** 搜索框草稿（与已提交 query 分开，HMR 后恢复） */
  searchDraft: string;
  /** 搜索 scope tab：综合/歌曲/…（与 lastSearchCache.scope 同步，HMR 后恢复） */
  searchScope: SearchScope;
  /** 搜索结果列表纵向滚动位置 */
  searchResultsScrollY: number;
  /** 按关键词缓存完整搜索结果 */
  searchResultCaches: MusicSearchResultCacheEntry[];
  /** 合集详情曲目缓存（按 kind+provider+remoteId；浏览器本地，不进 host） */
  collectionDetailCaches: MusicCollectionDetailCacheEntry[];
  /** 搜索内当前打开的合集详情（浏览器本地，抗 HMR） */
  searchActiveCollection: SearchActiveCollection | null;
  /** 进入合集前主列表滚动位置（返回时恢复） */
  searchCollectionReturnScrollY: number;
  /** 搜索结果缓存有效分钟数，默认 15 */
  searchCacheTtlMinutes: number;
  createTrack: (input?: {
    title?: string;
    artist?: string;
    album?: string;
    coverUri?: string | null;
    lyrics?: string | null;
    remoteRef?: RemoteRef | null;
    sourceUri?: string | null;
    sourceKind?: MusicTrackSourceKind;
  }) => DemoTrack;
  importTracksFromSources: (
    sources: readonly {
      title: string;
      sourceUri: string;
      artist?: string;
      album?: string;
      coverUri?: string | null;
      lyrics?: string | null;
      remoteRef?: RemoteRef | null;
      kind?: MusicTrackSourceKind;
    }[],
  ) => DemoTrack[];
  updateTrack: (
    id: string,
    patch: {
      title?: string;
      artist?: string;
      album?: string;
      coverUri?: string | null;
      lyrics?: string | null;
      lyricsUri?: string | null;
      atmospherePalette?: DemoTrackAtmospherePalette | null;
      remoteRef?: RemoteRef | null;
      sourceUri?: string | null;
      sourceKind?: MusicTrackSourceKind;
    },
  ) => DemoTrack | null;
  upsertTrackFromSearchHit: (hit: SearchHitTrack) => DemoTrack;
  deleteTrack: (id: string) => boolean;
  getTrack: (id: string) => DemoTrack | undefined;
  setNowPlaying: (id: string | null) => void;
  setQueueIds: (ids: string[]) => void;
  addToQueue: (id: string, position?: "end" | "next") => boolean;
  removeFromQueue: (id: string) => boolean;
  moveQueueItem: (fromIndex: number, toIndex: number) => boolean;
  setPlayMode: (mode: MusicPlayMode) => void;
  cyclePlayMode: () => MusicPlayMode;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setCoverHidden: (coverHidden: boolean) => void;
  setCompactActionRailVisible: (visible: boolean) => void;
  setLyricsDensity: (density: "compact" | "relaxed") => void;
  setAtmospherePushEnabled: (enabled: boolean) => void;
  setCoverBackdropEnabled: (enabled: boolean) => void;
  setCoverBackdropBlur: (blur: number) => void;
  setCoverBackdropOpacity: (opacity: number) => void;
  setCoverBackdropIncludeTabBar: (enabled: boolean) => void;
  setPlaybackPosition: (seconds: number) => void;
  setWantsPlaying: (wantsPlaying: boolean) => void;
  setPlayerSurface: (surface: "player" | "search") => void;
  setActionLayout: (layout: MusicPlayerActionLayout) => void;
  pushSearchHistory: (query: string) => void;
  removeSearchHistory: (query: string) => void;
  setSearchProviderIds: (ids: string[]) => void;
  toggleSearchProviderId: (id: string) => void;
  setLastSearchCache: (cache: MusicLastSearchCache | null) => void;
  setSearchDraft: (draft: string) => void;
  setSearchScope: (scope: SearchScope) => void;
  setSearchResultsScrollY: (y: number) => void;
  upsertSearchResultCache: (entry: MusicSearchResultCacheEntry) => void;
  clearSearchResultCache: (input?: {
    query: string;
    scope: SearchScope;
    providerIds: string[];
  }) => void;
  upsertCollectionDetailCache: (entry: MusicCollectionDetailCacheEntry) => void;
  clearCollectionDetailCache: () => void;
  setSearchActiveCollection: (collection: SearchActiveCollection | null) => void;
  setSearchCollectionReturnScrollY: (y: number) => void;
  setSearchCacheTtlMinutes: (minutes: number) => void;
  toggleLiked: (id: string) => boolean | null;
  toggleBookmarked: (id: string) => boolean | null;
  togglePinned: (id: string) => boolean | null;
  playNext: () => DemoTrack | null;
  playPrevious: () => DemoTrack | null;
}

const PERSIST_NAME = "workspace-demo-music";
const STATE_KEY = "music-v1";
const MAX_SEARCH_HISTORY = 12;

async function readMusicHostStateDoc(): Promise<unknown | null> {
  if (!boundStorage) {
    return null;
  }
  const primary = getMusicRuntimeAppId();
  try {
    const primaryDoc = await boundStorage.readJson(primary, STATE_KEY);
    if (primaryDoc != null) {
      return primaryDoc;
    }
  } catch {
    // fall through
  }
  const legacy = getMusicLegacyStorageAppId();
  if (!legacy) {
    return null;
  }
  try {
    return await boundStorage.readJson(legacy, STATE_KEY);
  } catch {
    return null;
  }
}

let boundStorage: WorkspaceAppStorageApi | null = null;
let boundConfig: WorkspaceAppConfigApi | null = null;
let boundSync: WorkspaceAppSyncApi | null = null;
let syncUnsubscribe: (() => void) | null = null;
let playbackFocusUnsubscribe: (() => void) | null = null;
let configUnsubscribe: (() => void) | null = null;
/** 仅首轮 bind 前拦截「空列表写回」；sync 再水合不得清此标志，否则会丢并发写盘。 */
let hostHydrationCompleted = false;
const hostHydrationListeners = new Set<() => void>();

/** host 写失败熔断：超时后短时跳过，避免控制台被 Timeout 刷爆。 */
const HOST_WRITE_CIRCUIT_COOLDOWN_MS = 30_000;
let hostWriteCircuitOpenUntil = 0;
let hostWriteFailLoggedAt = 0;
let hostWriteChain: Promise<void> = Promise.resolve();
/** 上次已落到 host 的曲库 JSON。相同则跳过读盘、写盘和 sync。 */
let lastHostTracksJson: string | null = null;

function hostTracksJson(tracks: DemoTrack[]): string {
  return JSON.stringify(tracks);
}

function sameStringList(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function isHostWriteCircuitOpen(): boolean {
  return Date.now() < hostWriteCircuitOpenUntil;
}

function openHostWriteCircuit(error: unknown): void {
  hostWriteCircuitOpenUntil = Date.now() + HOST_WRITE_CIRCUIT_COOLDOWN_MS;
  if (Date.now() - hostWriteFailLoggedAt < HOST_WRITE_CIRCUIT_COOLDOWN_MS) {
    return;
  }
  hostWriteFailLoggedAt = Date.now();
  console.warn(
    "[com.example.music] host.storage 超时/失败，30s 内跳过后续 host 写（AsyncStorage 仍更新）",
    error,
  );
}

function enqueueHostWrite(task: () => Promise<void>): Promise<void> {
  const run = hostWriteChain.then(task, task);
  hostWriteChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function notifyMusicHostHydrationListeners(): void {
  for (const listener of hostHydrationListeners) {
    listener();
  }
}

/** 供播放器 UI 区分「曲库水合中」与「真的没有曲目」。 */
export function getMusicHostHydrationCompleted(): boolean {
  return hostHydrationCompleted;
}

export function subscribeMusicHostHydration(listener: () => void): () => void {
  hostHydrationListeners.add(listener);
  return () => {
    hostHydrationListeners.delete(listener);
  };
}
let configPersistTimer: ReturnType<typeof setTimeout> | null = null;

function musicPrefsFromStore(
  state: Pick<
    MusicDemoState,
    | "lyricsDensity"
    | "atmospherePushEnabled"
    | "coverBackdropEnabled"
    | "coverBackdropBlur"
    | "coverBackdropOpacity"
    | "coverBackdropIncludeTabBar"
    | "searchProviderIds"
    | "searchCacheTtlMinutes"
  >,
): MusicAppPrefsDocument {
  return normalizeMusicAppPrefsDocument({
    version: 1,
    lyricsDensity: state.lyricsDensity,
    atmospherePushEnabled: state.atmospherePushEnabled,
    coverBackdropEnabled: state.coverBackdropEnabled,
    coverBackdropBlur: state.coverBackdropBlur,
    coverBackdropOpacity: state.coverBackdropOpacity,
    coverBackdropIncludeTabBar: state.coverBackdropIncludeTabBar,
    searchProviderIds: state.searchProviderIds,
    searchCacheTtlMinutes: state.searchCacheTtlMinutes,
  });
}

function scheduleMusicConfigPersist(
  state: Pick<
    MusicDemoState,
    | "lyricsDensity"
    | "atmospherePushEnabled"
    | "coverBackdropEnabled"
    | "coverBackdropBlur"
    | "coverBackdropOpacity"
    | "coverBackdropIncludeTabBar"
    | "searchProviderIds"
    | "searchCacheTtlMinutes"
  >,
): void {
  // 本端适配器必写；不再因未绑定 host.config 而跳过落盘。
  const prefs = musicPrefsFromStore(state);
  if (configPersistTimer) {
    clearTimeout(configPersistTimer);
  }
  configPersistTimer = setTimeout(() => {
    void saveMusicAppPrefs(boundConfig, prefs);
  }, 250);
}

function applyMusicAppPrefsToStore(prefs: MusicAppPrefsDocument): void {
  useMusicDemoStore.setState({
    lyricsDensity: prefs.lyricsDensity,
    atmospherePushEnabled: prefs.atmospherePushEnabled,
    coverBackdropEnabled: prefs.coverBackdropEnabled,
    coverBackdropBlur: prefs.coverBackdropBlur,
    coverBackdropOpacity: prefs.coverBackdropOpacity,
    coverBackdropIncludeTabBar: prefs.coverBackdropIncludeTabBar,
    searchProviderIds: prefs.searchProviderIds,
    searchCacheTtlMinutes: prefs.searchCacheTtlMinutes,
  });
  // 清掉急开配置时按水合前快照种下的分段 live 值，避免 UI 仍显示「开」。
  try {
    getMusicHostApi().ui.clearDetailSheetSegmentedLiveValues();
  } catch {
    // host 未就绪时忽略
  }
}

function createTrackId(): string {
  return `track_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortTracks(tracks: DemoTrack[]): DemoTrack[] {
  return [...tracks].sort((left, right) => right.updatedAt - left.updatedAt);
}

function isEphemeralMediaUri(uri: string | null | undefined): boolean {
  return typeof uri === "string" && uri.startsWith("blob:");
}

function normalizePersistedTrack(track: DemoTrack): DemoTrack {
  const next = Object.assign({}, track) as DemoTrack;
  next.album = track.album ?? "";
  next.coverUri = isEphemeralMediaUri(track.coverUri) ? null : (track.coverUri ?? null);
  next.lyrics = track.lyrics ?? null;
  next.lyricsUri =
    typeof track.lyricsUri === "string" && !isEphemeralMediaUri(track.lyricsUri)
      ? track.lyricsUri
      : (track.lyricsUri ?? null);
  next.atmospherePalette = track.atmospherePalette ?? null;
  next.artist = track.artist ?? "";
  next.liked = Boolean(track.liked);
  next.bookmarked = Boolean(track.bookmarked);
  next.remoteRef = track.remoteRef ?? null;
  next.sourceKind = track.sourceKind ?? "local";
  next.sourceUri = track.sourceUri ?? null;
  return next;
}

function normalizePlayMode(value: unknown): MusicPlayMode {
  if (value === "loop-one" || value === "shuffle") {
    return value;
  }
  return "sequence";
}

function normalizePlayerSurface(value: unknown): "player" | "search" {
  return value === "search" ? "search" : "player";
}

export const MUSIC_MAX_VOLUME = 2;

function normalizeVolume(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(MUSIC_MAX_VOLUME, Math.max(0, value));
  }
  return 1;
}

function normalizePlaybackPosition(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  return 0;
}

function mergeSearchHistory(history: string[], query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return history;
  }
  return [trimmed, ...history.filter((item) => item !== trimmed)].slice(0, MAX_SEARCH_HISTORY);
}

export function mergeMusicSearchHistoryForTest(history: string[], query: string): string[] {
  return mergeSearchHistory(history, query);
}

function normalizeSearchHistory(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    items.push(trimmed);
    if (items.length >= MAX_SEARCH_HISTORY) {
      break;
    }
  }
  return items;
}

/** 丢掉不可跨端的 blob: sourceUri；nowPlaying 若指向已删曲目则清空。 */
// oxlint-disable-next-line eslint(complexity) -- persist shape 归一化字段多
function sanitizeMusicPersistDoc(doc: unknown): {
  state: {
    tracks: DemoTrack[];
    nowPlayingId: string | null;
    queueIds: string[];
    playMode: MusicPlayMode;
    volume: number;
    muted: boolean;
    coverHidden: boolean;
    compactActionRailVisible: boolean;
    playbackPositionSec: number;
    wantsPlaying: boolean;
    playbackLeaderClientId: string | null;
    playerSurface: "player" | "search";
    actionLayout: MusicPlayerActionLayout;
  };
  version: number;
} | null {
  if (!doc || typeof doc !== "object") {
    return null;
  }
  const raw = doc as {
    state?: {
      tracks?: DemoTrack[];
      nowPlayingId?: string | null;
      queueIds?: string[];
      playMode?: MusicPlayMode;
      volume?: number;
      muted?: boolean;
      coverHidden?: boolean;
      compactActionRailVisible?: boolean;
      playbackPositionSec?: number;
      wantsPlaying?: boolean;
      playbackLeaderClientId?: string | null;
      playerSurface?: "player" | "search";
      actionLayout?: Partial<MusicPlayerActionLayout>;
    };
    version?: number;
  };
  const tracks = Array.isArray(raw.state?.tracks)
    ? raw.state.tracks
        .filter((track) => !isEphemeralMediaUri(track?.sourceUri))
        .map((track) => normalizePersistedTrack(track))
    : [];
  const trackIds = new Set(tracks.map((track) => track.id));
  const playing = raw.state?.nowPlayingId ?? null;
  const nowPlayingId = playing && trackIds.has(playing) ? playing : (tracks[0]?.id ?? null);
  const queueIds = Array.isArray(raw.state?.queueIds)
    ? raw.state.queueIds.filter((id) => trackIds.has(id))
    : tracks.map((track) => track.id);
  return {
    state: {
      tracks,
      nowPlayingId,
      queueIds,
      playMode: normalizePlayMode(raw.state?.playMode),
      volume: normalizeVolume(raw.state?.volume),
      muted: Boolean(raw.state?.muted),
      coverHidden: Boolean(raw.state?.coverHidden),
      compactActionRailVisible: raw.state?.compactActionRailVisible !== false,
      playbackPositionSec: normalizePlaybackPosition(raw.state?.playbackPositionSec),
      wantsPlaying: Boolean(raw.state?.wantsPlaying),
      playbackLeaderClientId:
        typeof raw.state?.playbackLeaderClientId === "string" &&
        raw.state.playbackLeaderClientId.trim()
          ? raw.state.playbackLeaderClientId.trim()
          : null,
      playerSurface: normalizePlayerSurface(raw.state?.playerSurface),
      actionLayout: normalizeMusicPlayerActionLayout(raw.state?.actionLayout),
    },
    version: typeof raw.version === "number" ? raw.version : 6,
  };
}

function readLastSearchCache(state: Record<string, unknown> | null): MusicLastSearchCache | null {
  const raw = state?.lastSearchCache;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  if (typeof (raw as MusicLastSearchCache).query !== "string") {
    return null;
  }
  return raw as MusicLastSearchCache;
}

function readSearchResultCaches(
  state: Record<string, unknown> | null,
): MusicSearchResultCacheEntry[] {
  if (!Array.isArray(state?.searchResultCaches)) {
    return [];
  }
  return (state.searchResultCaches as MusicSearchResultCacheEntry[]).filter(
    (entry) => entry && typeof entry === "object" && typeof entry.query === "string",
  );
}

function readCollectionDetailCaches(
  state: Record<string, unknown> | null,
): MusicCollectionDetailCacheEntry[] {
  if (!Array.isArray(state?.collectionDetailCaches)) {
    return [];
  }
  return (state.collectionDetailCaches as MusicCollectionDetailCacheEntry[]).filter(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof entry.remoteId === "string" &&
      typeof entry.providerId === "string" &&
      Array.isArray(entry.tracks),
  );
}

const COLLECTION_KINDS: readonly CollectionKind[] = ["artist", "album", "playlist"];

function readSearchActiveCollection(
  state: Record<string, unknown> | null,
): SearchActiveCollection | null {
  const raw = state?.searchActiveCollection;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Partial<SearchActiveCollection>;
  if (
    typeof record.kind !== "string" ||
    !(COLLECTION_KINDS as readonly string[]).includes(record.kind) ||
    typeof record.title !== "string" ||
    typeof record.providerId !== "string" ||
    typeof record.remoteId !== "string"
  ) {
    return null;
  }
  return {
    kind: record.kind as CollectionKind,
    title: record.title,
    subtitle: typeof record.subtitle === "string" ? record.subtitle : (record.subtitle ?? null),
    coverUrl: typeof record.coverUrl === "string" ? record.coverUrl : undefined,
    providerId: record.providerId,
    remoteId: record.remoteId,
    derived: Boolean(record.derived),
  };
}

function readSearchDraft(draftRaw: unknown, lastSearchCache: MusicLastSearchCache | null): string {
  if (typeof draftRaw === "string") {
    return draftRaw;
  }
  if (typeof lastSearchCache?.query === "string") {
    return lastSearchCache.query;
  }
  return "";
}

function readSearchCacheTtlMinutes(ttlRaw: unknown): number {
  if (typeof ttlRaw === "number" && Number.isFinite(ttlRaw) && ttlRaw >= 1) {
    return Math.min(24 * 60, Math.floor(ttlRaw));
  }
  return DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES;
}

/** 从完整 persist payload 抽出仅浏览器本地的搜索 UI 字段。 */
function extractBrowserSearchUiState(doc: unknown): {
  searchHistory: string[];
  searchDraft: string;
  searchScope: SearchScope;
  searchResultsScrollY: number;
  lastSearchCache: MusicLastSearchCache | null;
  searchResultCaches: MusicSearchResultCacheEntry[];
  collectionDetailCaches: MusicCollectionDetailCacheEntry[];
  searchActiveCollection: SearchActiveCollection | null;
  searchCollectionReturnScrollY: number;
  searchCacheTtlMinutes: number;
} {
  const state =
    doc && typeof doc === "object" && "state" in doc
      ? ((doc as { state?: Record<string, unknown> }).state ?? null)
      : null;
  const lastSearchCache = readLastSearchCache(state);
  const scrollRaw = state?.searchResultsScrollY;
  const collectionReturnRaw = state?.searchCollectionReturnScrollY;
  const searchResultCaches = readSearchResultCaches(state);
  const persistedHistory = normalizeSearchHistory(state?.searchHistory);
  return {
    searchHistory:
      persistedHistory.length > 0
        ? persistedHistory
        : listQueriesFromMusicSearchCaches(searchResultCaches),
    searchDraft: readSearchDraft(state?.searchDraft, lastSearchCache),
    searchScope: normalizeSearchScope(state?.searchScope ?? lastSearchCache?.scope),
    searchResultsScrollY:
      typeof scrollRaw === "number" && Number.isFinite(scrollRaw) ? Math.max(0, scrollRaw) : 0,
    lastSearchCache,
    searchResultCaches,
    collectionDetailCaches: readCollectionDetailCaches(state),
    searchActiveCollection: readSearchActiveCollection(state),
    searchCollectionReturnScrollY:
      typeof collectionReturnRaw === "number" && Number.isFinite(collectionReturnRaw)
        ? Math.max(0, collectionReturnRaw)
        : 0,
    searchCacheTtlMinutes: readSearchCacheTtlMinutes(state?.searchCacheTtlMinutes),
  };
}

// oxlint-disable-next-line eslint(complexity) -- host 曲库 + 本端播放态 + 搜索 UI 三路合并
function mergeHostAndBrowserPersist(hostDoc: unknown, browserRaw: string | null): string | null {
  const browserDoc = browserRaw ? safeParseJson(browserRaw) : null;
  const browserSanitized = parseSanitizedPersist(browserRaw);
  const browserUi = extractBrowserSearchUiState(browserDoc);
  const hostSanitized = sanitizeMusicPersistDoc(hostDoc);
  const hostTracks = hostSanitized?.state.tracks ?? [];
  const hostCount = hostTracks.length;

  if (!browserSanitized && hostCount === 0) {
    return browserRaw;
  }

  const localState = browserSanitized?.state;
  return JSON.stringify({
    state: {
      tracks: hostCount > 0 ? hostTracks : (localState?.tracks ?? []),
      nowPlayingId: localState?.nowPlayingId ?? null,
      queueIds: localState?.queueIds ?? [],
      playMode: localState?.playMode ?? "sequence",
      volume: localState?.volume ?? 1,
      muted: localState?.muted ?? false,
      coverHidden: localState?.coverHidden ?? false,
      compactActionRailVisible: localState?.compactActionRailVisible ?? true,
      playbackPositionSec: localState?.playbackPositionSec ?? 0,
      wantsPlaying: localState?.wantsPlaying ?? false,
      playbackLeaderClientId: null,
      playerSurface: localState?.playerSurface ?? "player",
      actionLayout: localState?.actionLayout ?? getDefaultMusicPlayerActionLayout(),
      ...browserUi,
    },
    version: browserSanitized?.version ?? hostSanitized?.version ?? 6,
  });
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function resolveQueue(state: Pick<MusicDemoState, "tracks" | "queueIds">): string[] {
  const known = new Set(state.tracks.map((track) => track.id));
  const filtered = state.queueIds.filter((id) => known.has(id));
  if (filtered.length > 0) {
    return filtered;
  }
  return state.tracks.map((track) => track.id);
}

function pickAdjacentTrackId(
  state: Pick<MusicDemoState, "tracks" | "queueIds" | "nowPlayingId" | "playMode">,
  direction: 1 | -1,
): string | null {
  const queue = resolveQueue(state);
  if (queue.length === 0) {
    return null;
  }
  if (state.playMode === "shuffle" && queue.length > 1) {
    const others = queue.filter((id) => id !== state.nowPlayingId);
    return others[Math.floor(Math.random() * others.length)] ?? queue[0] ?? null;
  }
  const currentIndex = state.nowPlayingId ? queue.indexOf(state.nowPlayingId) : -1;
  if (currentIndex < 0) {
    return queue[0] ?? null;
  }
  const nextIndex = (currentIndex + direction + queue.length) % queue.length;
  return queue[nextIndex] ?? null;
}

const PLAY_MODE_ORDER: MusicPlayMode[] = ["sequence", "loop-one", "shuffle"];

function countTracksInPersistPayload(raw: string | null | undefined): number {
  if (!raw) {
    return 0;
  }
  try {
    const sanitized = sanitizeMusicPersistDoc(JSON.parse(raw));
    return sanitized?.state.tracks.length ?? 0;
  } catch {
    return 0;
  }
}

function rawTrackCountInDoc(doc: unknown): number {
  if (!doc || typeof doc !== "object") {
    return 0;
  }
  const tracks = (doc as { state?: { tracks?: unknown } }).state?.tracks;
  return Array.isArray(tracks) ? tracks.length : 0;
}

function parseSanitizedPersist(
  raw: string | null | undefined,
): ReturnType<typeof sanitizeMusicPersistDoc> {
  if (!raw) {
    return null;
  }
  try {
    return sanitizeMusicPersistDoc(JSON.parse(raw));
  } catch {
    return null;
  }
}

function pickPreferredSearchHitMatch(
  tracks: readonly DemoTrack[],
  hit: SearchHitTrack,
): DemoTrack | undefined {
  const matches = tracks.filter((track) => sameSearchHitIdentity(track, hit));
  return (
    matches.find((track) => isMusicTrackDownloadedLocally(track)) ??
    matches.find((track) => track.pinned) ??
    matches.find((track) => track.liked || track.bookmarked) ??
    matches[0]
  );
}

function collapseDuplicateSearchHits(
  get: () => MusicDemoState,
  set: (
    partial: Partial<MusicDemoState> | ((state: MusicDemoState) => Partial<MusicDemoState>),
  ) => void,
  keepId: string,
  hit: SearchHitTrack,
): DemoTrack | undefined {
  const kept = get().tracks.find((track) => track.id === keepId);
  if (!kept) {
    return undefined;
  }
  const dupes = get().tracks.filter(
    (track) => track.id !== keepId && sameSearchHitIdentity(track, hit),
  );
  if (dupes.length === 0) {
    return kept;
  }
  const liked = Boolean(kept.liked) || dupes.some((track) => track.liked);
  const bookmarked = Boolean(kept.bookmarked) || dupes.some((track) => track.bookmarked);
  const pinned = Boolean(kept.pinned) || dupes.some((track) => track.pinned);
  const localDupe = dupes.find((track) => isMusicTrackDownloadedLocally(track));
  set((state) => ({
    tracks: sortTracks(
      state.tracks.map((track) =>
        track.id === keepId
          ? Object.assign({}, track, {
              liked,
              bookmarked,
              pinned,
              ...(localDupe && !isMusicTrackDownloadedLocally(track)
                ? {
                    sourceUri: localDupe.sourceUri,
                    sourceKind: "local" as const,
                    coverUri: localDupe.coverUri ?? track.coverUri,
                    lyrics: localDupe.lyrics ?? track.lyrics,
                  }
                : {}),
              updatedAt: Date.now(),
            })
          : track,
      ),
    ),
  }));
  for (const dupe of dupes) {
    get().deleteTrack(dupe.id);
  }
  return get().getTrack(keepId) ?? kept;
}

function applySearchHitToExistingTrack(
  updateTrack: MusicDemoState["updateTrack"],
  current: DemoTrack,
  hit: SearchHitTrack,
  playableUrl: string | null,
  lyrics: string | null,
): DemoTrack {
  const keepLocalFile = shouldKeepLocalSourceUri(current, hit.localTrackId);
  return (
    updateTrack(current.id, {
      title: hit.title.trim(),
      artist: (hit.artist ?? "").trim(),
      album: hit.album,
      coverUri: hit.coverUrl ? coverUrlForStorage(hit.coverUrl) : current.coverUri,
      lyrics: lyrics ?? current.lyrics,
      remoteRef: hit.ref,
      sourceKind: keepLocalFile ? "local" : "cloud",
      sourceUri: keepLocalFile ? current.sourceUri : playableUrl || current.sourceUri,
    }) ?? current
  );
}

function createTrackFromSearchHit(
  createTrack: MusicDemoState["createTrack"],
  hit: SearchHitTrack,
  playableUrl: string | null,
  lyrics: string | null,
): DemoTrack {
  return createTrack({
    title: hit.title.trim(),
    artist: (hit.artist ?? "").trim(),
    album: hit.album,
    coverUri: hit.coverUrl ? coverUrlForStorage(hit.coverUrl) : hit.coverUrl,
    lyrics,
    remoteRef: hit.ref,
    sourceKind: hit.localTrackId ? "local" : "cloud",
    sourceUri: hit.localTrackId ? null : playableUrl,
  });
}

function shouldKeepLocalSourceUri(track: DemoTrack, hitLocalTrackId?: string): boolean {
  if (hitLocalTrackId) {
    return true;
  }
  return (
    track.sourceKind === "local" &&
    Boolean(track.sourceUri) &&
    !/^https?:\/\//.test(track.sourceUri ?? "")
  );
}

function scrubPlatformArtistPlaceholder(artist: string): string {
  const raw = artist.trim();
  if (!raw || /^(pixabay|sound\s*stripe|soundstripe)$/i.test(raw)) {
    return "";
  }
  return raw;
}

function buildDemoTrack(
  input: {
    id?: string;
    title?: string;
    artist?: string;
    album?: string;
    coverUri?: string | null;
    lyrics?: string | null;
    remoteRef?: RemoteRef | null;
    sourceUri?: string | null;
    sourceKind?: MusicTrackSourceKind;
    updatedAt?: number;
  } = {},
): DemoTrack {
  return {
    id: input.id ?? createTrackId(),
    title: (input.title ?? "").trim() || "未命名曲目",
    artist: scrubPlatformArtistPlaceholder(input.artist ?? ""),
    album: (input.album ?? "").trim() || "",
    coverUri: input.coverUri?.trim() || null,
    lyrics: input.lyrics ?? null,
    remoteRef: input.remoteRef ?? null,
    liked: false,
    bookmarked: false,
    pinned: false,
    sourceUri: input.sourceUri?.trim() || null,
    sourceKind: input.sourceKind ?? "local",
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

async function persistSanitizedToHost(
  storage: WorkspaceAppStorageApi,
  doc: NonNullable<ReturnType<typeof sanitizeMusicPersistDoc>>,
): Promise<void> {
  if (isHostWriteCircuitOpen()) {
    return;
  }
  const hostTracksDoc = toHostTracksPersistDoc(doc);
  const nextJson = hostTracksJson(hostTracksDoc.state.tracks);
  if (nextJson === lastHostTracksJson) {
    return;
  }
  try {
    const written = await storage.writeJson(
      getMusicRuntimeAppId(),
      STATE_KEY,
      hostTracksDoc,
    );
    lastHostTracksJson = nextJson;
    void written;
  } catch (error) {
    openHostWriteCircuit(error);
  }
}

/** host 共享文件只存曲库；播放态各端 AsyncStorage 本地。 */
function toHostTracksPersistDoc(doc: NonNullable<ReturnType<typeof sanitizeMusicPersistDoc>>): {
  state: { tracks: DemoTrack[] };
  version: number;
} {
  return {
    state: { tracks: doc.state.tracks },
    version: doc.version,
  };
}

function applyHostTracksToStore(tracks: DemoTrack[]): void {
  const state = useMusicDemoStore.getState();
  const trackIds = new Set(tracks.map((track) => track.id));
  let nowPlayingId = state.nowPlayingId;
  if (nowPlayingId && !trackIds.has(nowPlayingId)) {
    nowPlayingId = tracks[0]?.id ?? null;
  }
  const queueIds = state.queueIds.filter((id) => trackIds.has(id));
  if (
    nowPlayingId === state.nowPlayingId &&
    sameStringList(queueIds, state.queueIds) &&
    hostTracksJson(tracks) === hostTracksJson(state.tracks)
  ) {
    return;
  }
  useMusicDemoStore.setState({ tracks, nowPlayingId, queueIds });
}

async function mergeMusicTracksFromHostStorage(): Promise<void> {
  if (!boundStorage) {
    return;
  }
  if (isHostWriteCircuitOpen()) {
    return;
  }
  try {
    const hostDoc = await readMusicHostStateDoc();
    const sanitized = sanitizeMusicPersistDoc(hostDoc);
    if (!sanitized) {
      return;
    }
    applyHostTracksToStore(sanitized.state.tracks);
  } catch (error) {
    openHostWriteCircuit(error);
  }
}

function shouldSkipHostWrite(value: string): boolean {
  // 只拦截首轮水合完成前的空态抹盘；有曲目的写始终放行（含 sync 再水合窗口）。
  if (hostHydrationCompleted) {
    return false;
  }
  return countTracksInPersistPayload(value) === 0;
}

const hostBackedStorage: StateStorage = {
  getItem: async (name) => {
    if (!boundStorage) {
      // skipHydration：activate 前不读 AsyncStorage，避免空态先入内存再写爆 host。
      return null;
    }
    let hostDoc: unknown | null = null;
    try {
      hostDoc = await readMusicHostStateDoc();
    } catch (error) {
      console.warn("[com.example.music] host.storage.readJson failed, falling back", error);
    }
    const legacyRaw = await AsyncStorage.getItem(name);
    const sanitizedHost = sanitizeMusicPersistDoc(hostDoc);
    const sanitizedLegacy = parseSanitizedPersist(legacyRaw);
    const hostCount = sanitizedHost?.state.tracks.length ?? 0;
    const legacyCount = sanitizedLegacy?.state.tracks.length ?? 0;

    // 曲库等以 host 为准；搜索框/历史/tab/结果缓存只从浏览器 AsyncStorage 合并回来
    if (hostCount > 0 && sanitizedHost != null) {
      if (rawTrackCountInDoc(hostDoc) !== hostCount) {
        await persistSanitizedToHost(boundStorage, sanitizedHost);
      }
      return mergeHostAndBrowserPersist(hostDoc, legacyRaw);
    }
    if (legacyCount > 0 && sanitizedLegacy) {
      await persistSanitizedToHost(boundStorage, sanitizedLegacy);
      return mergeHostAndBrowserPersist(hostDoc, legacyRaw);
    }
    if (sanitizedHost != null) {
      return mergeHostAndBrowserPersist(hostDoc, legacyRaw);
    }
    return sanitizedLegacy ? JSON.stringify(sanitizedLegacy) : legacyRaw;
  },
  setItem: async (name, value) => {
    // 水合完成前丢弃一切写盘，避免 HMR/重挂载默认态（音量=1、进度=0）把真实偏好冲掉。
    if (!hostHydrationCompleted) {
      return;
    }
    // 浏览器本地：完整 payload（含搜索框/历史/tab/缓存）
    await AsyncStorage.setItem(name, value);
    if (!boundStorage) {
      return;
    }
    // 共享文件：只写曲库；播放态仅存本端 AsyncStorage
    let hostDoc: ReturnType<typeof sanitizeMusicPersistDoc> = null;
    try {
      hostDoc = sanitizeMusicPersistDoc(JSON.parse(value));
    } catch {
      return;
    }
    if (!hostDoc) {
      return;
    }
    const docToWrite = hostDoc;
    if (shouldSkipHostWrite(JSON.stringify(docToWrite))) {
      return;
    }
    if (isHostWriteCircuitOpen()) {
      return;
    }
    const hostTracksDocPreview = toHostTracksPersistDoc(docToWrite);
    const previewTracksJson = hostTracksJson(hostTracksDocPreview.state.tracks);
    if (previewTracksJson === lastHostTracksJson) {
      return;
    }
    await enqueueHostWrite(async () => {
      if (!boundStorage || isHostWriteCircuitOpen()) {
        return;
      }
      try {
        const hostTracksDoc = toHostTracksPersistDoc(docToWrite);
        const nextJson = hostTracksJson(hostTracksDoc.state.tracks);
        if (nextJson === lastHostTracksJson) {
          return;
        }
        // 防护：内存短列表（HMR/半水合/误删）不得把 host 上已有大曲库冲掉。
        // 单首删除（差 1）与小幅编辑仍放行；骤降 ≥5 且不足原库一半则拒写并回读 host。
        const existingHost = await readMusicHostStateDoc();
        const existingSanitized = sanitizeMusicPersistDoc(existingHost);
        const existingCount = existingSanitized?.state.tracks.length ?? 0;
        const nextCount = docToWrite.state.tracks.length;
        if (
          existingCount >= 10 &&
          nextCount < existingCount &&
          existingCount - nextCount >= 5 &&
          nextCount / existingCount < 0.5
        ) {
          console.warn(
            `[com.example.music] refused host library shrink ${existingCount} → ${nextCount}; rehydrate from host`,
          );
          void mergeMusicTracksFromHostStorage();
          return;
        }
        const existingJson = existingSanitized
          ? hostTracksJson(existingSanitized.state.tracks)
          : null;
        if (existingJson === nextJson) {
          lastHostTracksJson = nextJson;
          return;
        }
        const written = await boundStorage.writeJson(
          getMusicRuntimeAppId(),
          STATE_KEY,
          hostTracksDoc,
        );
        lastHostTracksJson = nextJson;
        if (!written) {
          return;
        }
        boundSync?.publish({
          appId: getMusicRuntimeAppId(),
          channel: STATE_KEY,
          revision: Date.now(),
        });
      } catch (error) {
        openHostWriteCircuit(error);
      }
    });
  },
  removeItem: async (name) => {
    await AsyncStorage.removeItem(name);
    if (!boundStorage || !hostHydrationCompleted) {
      return;
    }
    if (isHostWriteCircuitOpen()) {
      return;
    }
    try {
      await boundStorage.writeJson(getMusicRuntimeAppId(), STATE_KEY, {
        state: { tracks: [] },
        version: 6,
      });
      lastHostTracksJson = hostTracksJson([]);
    } catch (error) {
      openHostWriteCircuit(error);
    }
  },
};

export const useMusicDemoStore = create<MusicDemoState>()(
  persist(
    (set, get) => ({
      tracks: [],
      nowPlayingId: null,
      queueIds: [],
      playMode: "sequence",
      volume: 1,
      muted: false,
      coverHidden: false,
      compactActionRailVisible: true,
      lyricsDensity: "compact",
      // 水合前保持关：避免 F5 后 prefs 未到就推氛围；急开配置也会种子错误 live 高亮。
      atmospherePushEnabled: false,
      coverBackdropEnabled: true,
      coverBackdropBlur: 10,
      coverBackdropOpacity: 0.55,
      coverBackdropIncludeTabBar: false,
      playbackPositionSec: 0,
      wantsPlaying: false,
      playbackLeaderClientId: null,
      playerSurface: "player",
      actionLayout: getDefaultMusicPlayerActionLayout(),
      searchHistory: [],
      searchProviderIds: getDefaultSearchProviderSelection(),
      lastSearchCache: null,
      searchDraft: "",
      searchScope: "all",
      searchResultsScrollY: 0,
      searchResultCaches: [],
      collectionDetailCaches: [],
      searchActiveCollection: null,
      searchCollectionReturnScrollY: 0,
      searchCacheTtlMinutes: DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES,
      createTrack: (input) => {
        const track = buildDemoTrack(input);
        set((state) => ({
          tracks: sortTracks([track, ...state.tracks]),
          queueIds: [track.id, ...resolveQueue(state).filter((id) => id !== track.id)],
        }));
        return track;
      },
      importTracksFromSources: (sources) => {
        if (sources.length === 0) {
          return [];
        }
        const now = Date.now();
        const created = sources.map((source, index) =>
          buildDemoTrack({
            title: source.title,
            artist: source.artist,
            album: source.album,
            coverUri: source.coverUri,
            lyrics: source.lyrics,
            remoteRef: source.remoteRef,
            sourceUri: source.sourceUri,
            sourceKind: source.kind,
            updatedAt: now - index,
          }),
        );
        set((state) => {
          const createdIds = created.map((track) => track.id);
          return {
            tracks: sortTracks([...created, ...state.tracks]),
            queueIds: [
              ...createdIds,
              ...resolveQueue(state).filter((id) => !createdIds.includes(id)),
            ],
          };
        });
        return created;
      },
      updateTrack: (id, patch) => {
        const current = get().tracks.find((track) => track.id === id);
        if (!current) {
          return null;
        }
        const next: DemoTrack = {
          ...current,
          title: patch.title !== undefined ? patch.title.trim() || "未命名曲目" : current.title,
          artist:
            patch.artist !== undefined
              ? scrubPlatformArtistPlaceholder(patch.artist.trim())
              : current.artist,
          album: patch.album !== undefined ? patch.album.trim() : (current.album ?? ""),
          coverUri: patch.coverUri !== undefined ? patch.coverUri : (current.coverUri ?? null),
          lyrics: patch.lyrics !== undefined ? patch.lyrics : (current.lyrics ?? null),
          lyricsUri: patch.lyricsUri !== undefined ? patch.lyricsUri : (current.lyricsUri ?? null),
          atmospherePalette: (() => {
            if (patch.atmospherePalette !== undefined) {
              return patch.atmospherePalette;
            }
            if (patch.coverUri !== undefined) {
              const nextCover =
                typeof patch.coverUri === "string" &&
                patch.coverUri.trim() &&
                !patch.coverUri.startsWith("blob:")
                  ? patch.coverUri.trim()
                  : null;
              if (!nextCover || nextCover !== current.atmospherePalette?.coverKey) {
                return null;
              }
            }
            return current.atmospherePalette ?? null;
          })(),
          remoteRef: patch.remoteRef !== undefined ? patch.remoteRef : (current.remoteRef ?? null),
          liked: current.liked ?? false,
          bookmarked: current.bookmarked ?? false,
          pinned: current.pinned ?? false,
          sourceUri: patch.sourceUri !== undefined ? patch.sourceUri : current.sourceUri,
          sourceKind: patch.sourceKind ?? current.sourceKind,
          updatedAt: Date.now(),
        };
        set((state) => ({
          tracks: sortTracks(state.tracks.map((track) => (track.id === id ? next : track))),
        }));
        return next;
      },
      upsertTrackFromSearchHit: (hit) => {
        const playableUrl = hit.playableUrl?.trim() || null;
        const lyrics = hit.lyrics?.trim() || null;
        const current = pickPreferredSearchHitMatch(get().tracks, hit);
        const kept = current
          ? applySearchHitToExistingTrack(get().updateTrack, current, hit, playableUrl, lyrics)
          : createTrackFromSearchHit(get().createTrack, hit, playableUrl, lyrics);
        return collapseDuplicateSearchHits(get, set, kept.id, hit) ?? kept;
      },
      deleteTrack: (id) => {
        const state = get();
        const exists = state.tracks.some((track) => track.id === id);
        if (!exists) {
          return false;
        }
        const wasPlaying = state.nowPlayingId === id;
        const queueBefore = resolveQueue(state);
        const currentIndex = queueBefore.indexOf(id);
        const remainingQueue = queueBefore.filter((queueId) => queueId !== id);
        let nextPlayingId: string | null = wasPlaying ? null : state.nowPlayingId;
        if (wasPlaying && remainingQueue.length > 0) {
          nextPlayingId =
            (currentIndex >= 0 ? remainingQueue[currentIndex] : null) ??
            remainingQueue[Math.max(0, currentIndex - 1)] ??
            remainingQueue[0] ??
            null;
        }
        set({
          tracks: state.tracks.filter((track) => track.id !== id),
          queueIds: state.queueIds.filter((queueId) => queueId !== id),
          nowPlayingId: nextPlayingId,
          playbackPositionSec: wasPlaying ? 0 : state.playbackPositionSec,
        });
        return true;
      },
      getTrack: (id) => get().tracks.find((track) => track.id === id),
      setNowPlaying: (id) =>
        set((state) => {
          if (!id) {
            return { nowPlayingId: null, playbackPositionSec: 0 };
          }
          const queue = resolveQueue(state);
          return {
            nowPlayingId: id,
            queueIds: queue.includes(id) ? queue : [...queue, id],
            playbackPositionSec: state.nowPlayingId === id ? state.playbackPositionSec : 0,
          };
        }),
      setQueueIds: (ids) => set({ queueIds: ids }),
      addToQueue: (id, position = "end") => {
        const state = get();
        if (!state.tracks.some((track) => track.id === id)) {
          return false;
        }
        const queue = resolveQueue(state).filter((queueId) => queueId !== id);
        if (position === "next") {
          const currentIndex = state.nowPlayingId ? queue.indexOf(state.nowPlayingId) : -1;
          const insertAt = currentIndex >= 0 ? currentIndex + 1 : 0;
          queue.splice(insertAt, 0, id);
        } else {
          queue.push(id);
        }
        set({ queueIds: queue });
        return true;
      },
      removeFromQueue: (id) => {
        const state = get();
        const queue = resolveQueue(state);
        if (!queue.includes(id)) {
          return false;
        }
        const wasPlaying = state.nowPlayingId === id;
        const currentIndex = queue.indexOf(id);
        const nextQueue = queue.filter((queueId) => queueId !== id);
        let nextPlayingId: string | null = wasPlaying ? null : state.nowPlayingId;
        if (wasPlaying && nextQueue.length > 0) {
          nextPlayingId =
            (currentIndex >= 0 ? nextQueue[currentIndex] : null) ??
            nextQueue[Math.max(0, currentIndex - 1)] ??
            nextQueue[0] ??
            null;
        }
        set({
          queueIds: nextQueue,
          nowPlayingId: nextPlayingId,
          playbackPositionSec: wasPlaying ? 0 : state.playbackPositionSec,
        });
        return true;
      },
      moveQueueItem: (fromIndex, toIndex) => {
        const queue = [...resolveQueue(get())];
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= queue.length ||
          toIndex >= queue.length ||
          fromIndex === toIndex
        ) {
          return false;
        }
        const [item] = queue.splice(fromIndex, 1);
        if (!item) {
          return false;
        }
        queue.splice(toIndex, 0, item);
        set({ queueIds: queue });
        return true;
      },
      setPlayMode: (mode) => set({ playMode: mode }),
      cyclePlayMode: () => {
        const current = get().playMode;
        const index = PLAY_MODE_ORDER.indexOf(current);
        const next = PLAY_MODE_ORDER[(index + 1) % PLAY_MODE_ORDER.length] ?? "sequence";
        set({ playMode: next });
        return next;
      },
      setVolume: (volume) =>
        set({
          volume: Math.min(MUSIC_MAX_VOLUME, Math.max(0, volume)),
          muted: volume <= 0,
        }),
      setMuted: (muted) => set({ muted }),
      setCoverHidden: (coverHidden) => set({ coverHidden: Boolean(coverHidden) }),
      setCompactActionRailVisible: (visible) => set({ compactActionRailVisible: Boolean(visible) }),
      setLyricsDensity: (density) => {
        const next = density === "relaxed" ? "relaxed" : "compact";
        set({ lyricsDensity: next });
        scheduleMusicConfigPersist({ ...get(), lyricsDensity: next });
      },
      setAtmospherePushEnabled: (enabled) => {
        const next = Boolean(enabled);
        set({ atmospherePushEnabled: next });
        scheduleMusicConfigPersist({ ...get(), atmospherePushEnabled: next });
      },
      setCoverBackdropEnabled: (enabled) => {
        const next = Boolean(enabled);
        set({ coverBackdropEnabled: next });
        scheduleMusicConfigPersist({ ...get(), coverBackdropEnabled: next });
      },
      setCoverBackdropBlur: (blur) => {
        const next = Math.min(24, Math.max(0, Math.round(Number(blur) || 0)));
        set({ coverBackdropBlur: next });
        scheduleMusicConfigPersist({ ...get(), coverBackdropBlur: next });
      },
      setCoverBackdropOpacity: (opacity) => {
        const raw = Number(opacity);
        const next = Math.min(
          0.95,
          Math.max(0.15, Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0.55),
        );
        set({ coverBackdropOpacity: next });
        scheduleMusicConfigPersist({ ...get(), coverBackdropOpacity: next });
      },
      setCoverBackdropIncludeTabBar: (enabled) => {
        const next = Boolean(enabled);
        set({ coverBackdropIncludeTabBar: next });
        scheduleMusicConfigPersist({ ...get(), coverBackdropIncludeTabBar: next });
      },
      setPlaybackPosition: (seconds) =>
        set({
          playbackPositionSec: normalizePlaybackPosition(seconds),
        }),
      setWantsPlaying: (wantsPlaying) =>
        set({
          wantsPlaying: Boolean(wantsPlaying),
        }),
      setPlayerSurface: (surface) => set({ playerSurface: normalizePlayerSurface(surface) }),
      setActionLayout: (layout) => set({ actionLayout: normalizeMusicPlayerActionLayout(layout) }),
      pushSearchHistory: (query) => {
        set((state) => ({
          searchHistory: mergeSearchHistory(state.searchHistory, query),
        }));
      },
      removeSearchHistory: (query) => {
        const trimmed = query.trim();
        if (!trimmed) {
          return;
        }
        set((state) => ({
          searchHistory: state.searchHistory.filter((item) => item !== trimmed),
        }));
      },
      setSearchProviderIds: (ids) => {
        const next = normalizeSearchProviderSelection(ids);
        set({ searchProviderIds: next });
        scheduleMusicConfigPersist({ ...get(), searchProviderIds: next });
      },
      toggleSearchProviderId: (id) => {
        const trimmed = id.trim();
        if (!trimmed) {
          return;
        }
        set((state) => {
          const current = normalizeSearchProviderSelection(state.searchProviderIds);
          const exists = current.includes(trimmed);
          let next: string[];
          if (exists) {
            next = current.length <= 1 ? current : current.filter((item) => item !== trimmed);
          } else {
            next = normalizeSearchProviderSelection([...current, trimmed]);
          }
          scheduleMusicConfigPersist({ ...state, searchProviderIds: next });
          return { searchProviderIds: next };
        });
      },
      setLastSearchCache: (cache) => {
        set({ lastSearchCache: cache });
      },
      setSearchDraft: (draft) => {
        set({ searchDraft: draft });
      },
      setSearchScope: (scope) => {
        set({ searchScope: normalizeSearchScope(scope) });
      },
      setSearchResultsScrollY: (y) => {
        const next = Number.isFinite(y) ? Math.max(0, y) : 0;
        set({ searchResultsScrollY: next });
      },
      upsertSearchResultCache: (entry) => {
        set((state) => ({
          searchResultCaches: upsertMusicSearchCacheEntry(state.searchResultCaches, entry),
          lastSearchCache: {
            query: entry.query,
            scope: entry.scope,
            providerIds: entry.providerIds,
            page: entry.page,
            updatedAt: entry.updatedAt,
          },
          // 结果缓存写入时同步草稿；不改 searchScope（tab 只做展示过滤，避免搜完被打回「综合」）
          searchDraft: entry.query,
        }));
      },
      clearSearchResultCache: (input) => {
        // 只清结果缓存，绝不碰 searchHistory（TTL/刷新与历史胶囊无关）
        if (!input) {
          set({ searchResultCaches: [], lastSearchCache: null });
          return;
        }
        const keyQuery = input.query.trim().toLowerCase();
        set((state) => ({
          searchResultCaches: state.searchResultCaches.filter((entry) => {
            if (entry.scope !== input.scope) {
              return true;
            }
            if (entry.query.trim().toLowerCase() !== keyQuery) {
              return true;
            }
            const left = [...entry.providerIds].sort().join(",");
            const right = [...input.providerIds].sort().join(",");
            return left !== right;
          }),
          lastSearchCache:
            state.lastSearchCache &&
            state.lastSearchCache.query.trim().toLowerCase() === keyQuery &&
            state.lastSearchCache.scope === input.scope
              ? null
              : state.lastSearchCache,
        }));
      },
      upsertCollectionDetailCache: (entry) => {
        set((state) => ({
          collectionDetailCaches: upsertMusicCollectionCacheEntry(
            state.collectionDetailCaches,
            entry,
          ),
        }));
      },
      clearCollectionDetailCache: () => {
        set({ collectionDetailCaches: [] });
      },
      setSearchActiveCollection: (collection) => {
        set({ searchActiveCollection: collection });
      },
      setSearchCollectionReturnScrollY: (y) => {
        const next = Number.isFinite(y) ? Math.max(0, y) : 0;
        set({ searchCollectionReturnScrollY: next });
      },
      setSearchCacheTtlMinutes: (minutes) => {
        // 仅改「多久算过期需重拉」；禁止顺带清空历史或结果缓存
        const next = Math.max(
          1,
          Math.min(24 * 60, Math.floor(minutes) || DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES),
        );
        set({ searchCacheTtlMinutes: next });
        scheduleMusicConfigPersist({ ...get(), searchCacheTtlMinutes: next });
      },
      toggleLiked: (id) => {
        const current = get().tracks.find((track) => track.id === id);
        if (!current) {
          return null;
        }
        const liked = !current.liked;
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === id ? Object.assign({}, track, { liked, updatedAt: Date.now() }) : track,
          ),
        }));
        return liked;
      },
      toggleBookmarked: (id) => {
        const current = get().tracks.find((track) => track.id === id);
        if (!current) {
          return null;
        }
        const bookmarked = !current.bookmarked;
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === id
              ? Object.assign({}, track, { bookmarked, updatedAt: Date.now() })
              : track,
          ),
        }));
        return bookmarked;
      },
      togglePinned: (id) => {
        const current = get().tracks.find((track) => track.id === id);
        if (!current) {
          return null;
        }
        const pinned = !current.pinned;
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === id ? Object.assign({}, track, { pinned, updatedAt: Date.now() }) : track,
          ),
        }));
        return pinned;
      },
      playNext: () => {
        const state = get();
        // 下一首按钮始终前进；单曲循环只影响播完自动续播。
        const nextId = pickAdjacentTrackId(
          { ...state, playMode: state.playMode === "loop-one" ? "sequence" : state.playMode },
          1,
        );
        if (!nextId) {
          return null;
        }
        state.setNowPlaying(nextId);
        return state.getTrack(nextId) ?? null;
      },
      playPrevious: () => {
        const state = get();
        const prevId = pickAdjacentTrackId(state, -1);
        if (!prevId) {
          return null;
        }
        state.setNowPlaying(prevId);
        return state.getTrack(prevId) ?? null;
      },
    }),
    {
      name: PERSIST_NAME,
      storage: createJSONStorage(() => hostBackedStorage),
      version: 6,
      skipHydration: true,
      // oxlint-disable-next-line eslint(complexity) -- persist migrate 字段多
      migrate: (persistedState) => {
        const state = persistedState as
          | {
              tracks?: DemoTrack[];
              nowPlayingId?: string | null;
              queueIds?: string[];
              playMode?: MusicPlayMode;
              volume?: number;
              muted?: boolean;
              coverHidden?: boolean;
              compactActionRailVisible?: boolean;
              playbackPositionSec?: number;
              wantsPlaying?: boolean;
              playerSurface?: "player" | "search";
              actionLayout?: Partial<MusicPlayerActionLayout>;
              searchHistory?: string[];
              searchProviderIds?: string[];
              lastSearchCache?: MusicLastSearchCache | null;
              searchResultCaches?: MusicSearchResultCacheEntry[];
              searchCacheTtlMinutes?: number;
            }
          | undefined;
        const tracks = (state?.tracks ?? []).map((track) => {
          const next = Object.assign({}, track) as DemoTrack;
          next.sourceUri = track.sourceUri ?? null;
          next.sourceKind = track.sourceKind ?? "local";
          next.remoteRef = track.remoteRef ?? null;
          next.artist = track.artist ?? "";
          next.album = track.album ?? "";
          next.coverUri = track.coverUri ?? null;
          next.lyrics = track.lyrics ?? null;
          next.lyricsUri = track.lyricsUri ?? null;
          next.atmospherePalette = track.atmospherePalette ?? null;
          next.liked = Boolean(track.liked);
          next.bookmarked = Boolean(track.bookmarked);
          next.pinned = Boolean(track.pinned);
          return next;
        });
        const queueIds =
          Array.isArray(state?.queueIds) && state.queueIds.length > 0
            ? state.queueIds
            : tracks.map((track) => track.id);
        return {
          ...state,
          tracks,
          queueIds,
          playMode: state?.playMode ?? "sequence",
          volume: typeof state?.volume === "number" ? state.volume : 1,
          muted: Boolean(state?.muted),
          coverHidden: Boolean(state?.coverHidden),
          compactActionRailVisible: state?.compactActionRailVisible !== false,
          lyricsDensity:
            (state as { lyricsDensity?: string } | undefined)?.lyricsDensity === "relaxed"
              ? "relaxed"
              : "compact",
          // prefs 不走 zustand partialize；migrate 缺字段时勿默认 true（否则水合窗口误开沉浸）。
          atmospherePushEnabled:
            (state as { atmospherePushEnabled?: boolean } | undefined)?.atmospherePushEnabled ===
            true,
          coverBackdropEnabled:
            (state as { coverBackdropEnabled?: boolean } | undefined)?.coverBackdropEnabled !==
            false,
          coverBackdropBlur: (() => {
            const raw = (state as { coverBackdropBlur?: unknown; coverBackdropIntensity?: unknown })
              ?.coverBackdropBlur;
            if (typeof raw === "number" && Number.isFinite(raw)) {
              return Math.min(24, Math.max(0, Math.round(raw)));
            }
            const legacy = (state as { coverBackdropIntensity?: unknown })?.coverBackdropIntensity;
            if (legacy === "light") {
              return 4;
            }
            if (legacy === "vivid") {
              return 16;
            }
            return 10;
          })(),
          coverBackdropOpacity: (() => {
            const raw = (
              state as { coverBackdropOpacity?: unknown; coverBackdropIntensity?: unknown }
            )?.coverBackdropOpacity;
            if (typeof raw === "number" && Number.isFinite(raw)) {
              return Math.min(0.95, Math.max(0.15, Math.round(raw * 100) / 100));
            }
            const legacy = (state as { coverBackdropIntensity?: unknown })?.coverBackdropIntensity;
            if (legacy === "light") {
              return 0.72;
            }
            if (legacy === "vivid") {
              return 0.38;
            }
            return 0.55;
          })(),
          coverBackdropIncludeTabBar:
            (state as { coverBackdropIncludeTabBar?: boolean } | undefined)
              ?.coverBackdropIncludeTabBar === true,
          playbackPositionSec: normalizePlaybackPosition(state?.playbackPositionSec),
          wantsPlaying: Boolean(state?.wantsPlaying),
          playbackLeaderClientId:
            typeof (state as { playbackLeaderClientId?: string | null })?.playbackLeaderClientId ===
              "string" &&
            (state as { playbackLeaderClientId: string }).playbackLeaderClientId.trim()
              ? (state as { playbackLeaderClientId: string }).playbackLeaderClientId.trim()
              : null,
          playerSurface: normalizePlayerSurface(state?.playerSurface),
          actionLayout: normalizeMusicPlayerActionLayout(state?.actionLayout),
          searchHistory: (() => {
            const persisted = normalizeSearchHistory(state?.searchHistory);
            if (persisted.length > 0) {
              return persisted;
            }
            const caches = Array.isArray(state?.searchResultCaches) ? state.searchResultCaches : [];
            return listQueriesFromMusicSearchCaches(caches);
          })(),
          searchProviderIds: normalizeSearchProviderSelection(state?.searchProviderIds),
          lastSearchCache:
            state?.lastSearchCache &&
            typeof state.lastSearchCache === "object" &&
            typeof (state.lastSearchCache as MusicLastSearchCache).query === "string"
              ? (state.lastSearchCache as MusicLastSearchCache)
              : null,
          searchDraft: (() => {
            const raw = (state as { searchDraft?: string })?.searchDraft;
            if (typeof raw === "string") {
              return raw;
            }
            const cache = state?.lastSearchCache as MusicLastSearchCache | null | undefined;
            return typeof cache?.query === "string" ? cache.query : "";
          })(),
          searchScope: normalizeSearchScope(
            (state as { searchScope?: SearchScope })?.searchScope ??
              (state?.lastSearchCache as MusicLastSearchCache | null | undefined)?.scope,
          ),
          searchResultsScrollY: (() => {
            const raw = (state as { searchResultsScrollY?: number })?.searchResultsScrollY;
            return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, raw) : 0;
          })(),
          searchResultCaches: Array.isArray(
            (state as { searchResultCaches?: MusicSearchResultCacheEntry[] })?.searchResultCaches,
          )
            ? (state as { searchResultCaches: MusicSearchResultCacheEntry[] }).searchResultCaches
            : [],
          collectionDetailCaches: readCollectionDetailCaches(
            (state as Record<string, unknown> | undefined) ?? null,
          ),
          searchActiveCollection: readSearchActiveCollection(
            (state as Record<string, unknown> | undefined) ?? null,
          ),
          searchCollectionReturnScrollY: (() => {
            const raw = (state as { searchCollectionReturnScrollY?: number })
              ?.searchCollectionReturnScrollY;
            return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, raw) : 0;
          })(),
          searchCacheTtlMinutes: (() => {
            const raw = (state as { searchCacheTtlMinutes?: number })?.searchCacheTtlMinutes;
            return typeof raw === "number" && Number.isFinite(raw) && raw >= 1
              ? Math.min(24 * 60, Math.floor(raw))
              : DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES;
          })(),
        };
      },
      partialize: (state) => ({
        tracks: state.tracks,
        nowPlayingId: state.nowPlayingId,
        queueIds: state.queueIds,
        playMode: state.playMode,
        volume: state.volume,
        muted: state.muted,
        coverHidden: state.coverHidden,
        compactActionRailVisible: state.compactActionRailVisible,
        // prefs（lyricsDensity / atmosphere / searchProviderIds / searchCacheTtl）只走本端适配器
        playbackPositionSec: state.playbackPositionSec,
        wantsPlaying: state.wantsPlaying,
        playbackLeaderClientId: state.playbackLeaderClientId,
        playerSurface: state.playerSurface,
        actionLayout: state.actionLayout,
        searchHistory: state.searchHistory,
        lastSearchCache: state.lastSearchCache,
        searchDraft: state.searchDraft,
        searchScope: state.searchScope,
        searchResultsScrollY: state.searchResultsScrollY,
        searchResultCaches: state.searchResultCaches,
        collectionDetailCaches: state.collectionDetailCaches,
        searchActiveCollection: state.searchActiveCollection,
        searchCollectionReturnScrollY: state.searchCollectionReturnScrollY,
      }),
    },
  ),
);

/** 绑定宿主 storage/config/sync，并完成一轮 persist 水合；调用方应 await 后再做冷启动续播。 */
export function bindMusicHostStorage(
  storage: WorkspaceAppStorageApi,
  sync?: WorkspaceAppSyncApi | null,
  config?: WorkspaceAppConfigApi | null,
): Promise<void> {
  boundStorage = storage;
  boundConfig = config ?? null;
  boundSync = sync ?? null;
  syncUnsubscribe?.();
  playbackFocusUnsubscribe?.();
  configUnsubscribe?.();
  syncUnsubscribe =
    boundSync?.subscribe({
      appId: getMusicRuntimeAppId(),
      channel: STATE_KEY,
      onEvent: () => {
        refreshMusicListFromHostStorage();
      },
    }) ?? null;
  playbackFocusUnsubscribe =
    boundSync?.subscribe({
      appId: getMusicRuntimeAppId(),
      channel: MUSIC_PLAYBACK_FOCUS_CHANNEL,
      onEvent: (event) => {
        if (!shouldHandleRemotePlaybackFocusClaim(event.publisherClientId)) {
          return;
        }
        void import("./playback-runtime").then((module) =>
          module.yieldMusicPlaybackToRemoteClient(),
        );
      },
    }) ?? null;
  configUnsubscribe =
    boundConfig?.subscribe({
      scope: "app",
      appId: getMusicRuntimeAppId(),
      key: MUSIC_CONFIG_KEY,
      emitCurrent: false,
      listener: (event) => {
        if (event.source === "local") {
          return;
        }
        applyMusicAppPrefsToStore(normalizeMusicAppPrefsDocument(event.value));
        void saveMusicAppPrefsToLocalStorage(normalizeMusicAppPrefsDocument(event.value));
      },
    }) ?? null;
  hostHydrationCompleted = false;
  notifyMusicHostHydrationListeners();
  const legacyHostDocPromise = boundStorage
    ? readMusicHostStateDoc().catch(() => null)
    : Promise.resolve(null);
  // 只跑一轮 rehydrate：并发第二次会 bump hydrationVersion，导致先完成的那轮丢弃 setState。
  return (async () => {
    const [legacyHostDoc] = await Promise.all([
      legacyHostDocPromise,
      Promise.resolve(useMusicDemoStore.persist.rehydrate()),
    ]);
    const legacyState =
      legacyHostDoc && typeof legacyHostDoc === "object"
        ? ((legacyHostDoc as { state?: { searchProviderIds?: string[] } }).state ?? null)
        : null;
    const prefs = await loadMusicAppPrefs(boundConfig, {
      searchProviderIds: legacyState?.searchProviderIds,
    });
    applyMusicAppPrefsToStore(prefs);
    // 同步会话块立刻合并进 store（勿丢进 finally 里异步 import，否则播放器会先按进度 0 hard-load）。
    const playbackRuntime = await import("./playback-runtime");
    playbackRuntime.applyMusicPlaybackSessionSnapshotAfterHydrate();
  })().finally(() => {
    hostHydrationCompleted = true;
    lastHostTracksJson = hostTracksJson(useMusicDemoStore.getState().tracks);
    notifyMusicHostHydrationListeners();
  });
}

/** 宿主在 daemon 上线 / sync ping / 打开命令面板时调用，拉取共享曲库（不碰本端播放态）。 */
export function refreshMusicListFromHostStorage(_syncEvent?: WorkspaceAppSyncEvent): void {
  void mergeMusicTracksFromHostStorage();
}

export function getMusicBoundSync(): WorkspaceAppSyncApi | null {
  return boundSync;
}

export function isMusicTrackDownloadedLocally(track: DemoTrack | undefined | null): boolean {
  if (!track) {
    return false;
  }
  return (
    track.sourceKind === "local" &&
    Boolean(track.sourceUri) &&
    !/^https?:\/\//i.test(track.sourceUri ?? "") &&
    !track.sourceUri?.startsWith("blob:")
  );
}

/** 搜索命中是否已在曲库且本地落盘（用于搜索列表「已下载」角标）。 */
export function isSearchHitDownloadedLocally(hit: SearchHitTrack): boolean {
  const tracks = useMusicDemoStore.getState().tracks;
  const matched = tracks.find((track) => sameSearchHitForDownloadBadge(track, hit));
  return isMusicTrackDownloadedLocally(matched);
}

/** 搜索命中对应曲库条目是否置顶（用于搜索列表置顶角标）。 */
export function isSearchHitPinnedLocally(hit: SearchHitTrack): boolean {
  const tracks = useMusicDemoStore.getState().tracks;
  const matched = tracks.find((track) => sameSearchHitForDownloadBadge(track, hit));
  return Boolean(matched?.pinned);
}

/**
 * 用曲库已落盘封面补搜索命中缺 coverUrl 的项（单曲封面，不是艺人头像）。
 * 仅 remoteId / localTrackId 精确匹配时才补，避免串封面。
 */
export function enrichSearchHitCoversFromLibrary(
  hits: readonly SearchHitTrack[],
): SearchHitTrack[] {
  const library = useMusicDemoStore.getState().tracks;
  return hits.map((hit) => {
    if (hit.coverUrl?.trim()) {
      return hit;
    }
    const matched = library.find((track) => sameSearchHitForDownloadBadge(track, hit));
    const cover = matched?.coverUri?.trim();
    if (!cover) {
      return hit;
    }
    return { ...hit, coverUrl: cover };
  });
}

export function trackToListItem(
  track: DemoTrack,
  nowPlayingId: string | null = null,
): WorkspaceAppListItem {
  const cover = track.coverUri?.trim();
  return {
    id: track.id,
    title: track.title,
    subtitle: track.artist || undefined,
    updatedAt: track.updatedAt,
    pinned: Boolean(track.pinned),
    active: Boolean(nowPlayingId && track.id === nowPlayingId),
    keywords: ["music", "曲目", "歌曲", track.title, track.artist],
    ...(cover ? { imageUrl: cover } : {}),
    open: {
      // 播放器 Tab 全局唯一：实体固定 now-playing，曲目由 nowPlayingId 决定。
      panelId: "player",
      entityId: "now-playing",
      titleHint: track.title,
    },
  };
}

export function listTracksAsWorkspaceItems(query = ""): WorkspaceAppListItem[] {
  const state = useMusicDemoStore.getState();
  const nowPlayingId = state.nowPlayingId;
  const items = state.tracks
    .map((track) => trackToListItem(track, nowPlayingId))
    .sort((a, b) => {
      const pinDelta = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDelta !== 0) {
        return pinDelta;
      }
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }
  return items.filter((item) => {
    const haystack = [item.title, item.subtitle, ...(item.keywords ?? [])].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}
