// 场景：汽水式搜索页 — 先复刻歌曲/音乐人/专辑/歌单四区块，并加入平台字段。
/* oxlint-disable eslint-plugin-react-perf(jsx-no-new-array-as-prop, jsx-no-new-function-as-prop, jsx-no-new-object-as-prop, jsx-no-jsx-as-prop), eslint-plugin-react(no-array-index-key), eslint(complexity) -- search shell */
declare const __DEV__: boolean | undefined;

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet as RNStyleSheet,
  Text,
  TextInput,
  View,
  Image,
  Animated,
  Easing,
} from "react-native";
import {
  Bug,
  ChevronLeft,
  ChevronDown,
  CornerDownLeft,
  HardDrive,
  Pin,
  Search,
  Trash2,
  RefreshCw,
} from "lucide-react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { coverUrlForThumb } from "./cover-url-quality";
import { getMusicPlatformLabel, listSearchFilterPlatforms } from "./resource/platform-registry";
import { searchPlayableMusic } from "./resource/service";
import { mergeSearchResultPages } from "./resource/search-page-merge";
import {
  findMusicSearchCacheEntry,
  findMusicSearchCacheEntryForQuery,
  isMusicSearchCacheFresh,
} from "./resource/search-result-cache";
import {
  collectionTrackCountSuffix,
  collectionTrackSourceHint,
  filterTracksForCollection,
  isDerivedCollectionRemoteId,
} from "./resource/collection-resolve";
import { MusicProviderBrandIcon } from "./provider-icons";
import {
  useMusicDemoStore,
  isSearchHitDownloadedLocally,
  isSearchHitPinnedLocally,
  enrichSearchHitCoversFromLibrary,
} from "./store";
import { getMusicHostApi, tryGetMusicHostApi } from "./music-host";
import type { WorkspaceAppActionBarProps, WorkspaceAppActionContribution } from "@getagnx/app-sdk";
import {
  MUSIC_SEARCH_COLLECTION_MENU_ID,
  MUSIC_SEARCH_HIT_MENU_ID,
  useMusicSearchCollectionMenuLayout,
  useMusicSearchHitMenuLayout,
} from "./search-menu-surfaces";
import { MUSIC_APP_ID } from "./music-ids";
import {
  MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS,
  MUSIC_SEARCH_COLLECTION_MENU_ICONS,
  MUSIC_SEARCH_COLLECTION_MENU_IDS,
  MUSIC_SEARCH_HIT_MENU_ACTION_LABELS,
  MUSIC_SEARCH_HIT_MENU_ICONS,
  MUSIC_SEARCH_HIT_MENU_IDS,
  type MusicSearchCollectionMenuActionId,
  type MusicSearchHitMenuActionId,
} from "./track-menu";
import type {
  CollectionKind,
  SearchActiveCollection,
  SearchDebugRequest,
  SearchHitAlbum,
  SearchHitArtist,
  SearchHitPlaylist,
  SearchHitTrack,
  SearchResultPage,
  SearchScope,
} from "./resource/types";

const SCOPES: { id: SearchScope; label: string }[] = [
  { id: "all", label: "综合" },
  { id: "track", label: "歌曲" },
  { id: "artist", label: "歌手" },
  { id: "album", label: "专辑" },
  { id: "playlist", label: "歌单" },
];

/** 网络搜索固定拉综合结果；tab 只做前端过滤 */
const SEARCH_FETCH_SCOPE: SearchScope = "all";

type SearchCollectionKind = CollectionKind;

function collectionKindLabel(kind: SearchCollectionKind): string {
  if (kind === "artist") {
    return "音乐人";
  }
  if (kind === "album") {
    return "专辑";
  }
  return "歌单";
}

function formatDebugUrlDisplay(url: string): string {
  // 百分号编码（UTF-8）还原成可读中文，便于对照；不是 base64
  try {
    return decodeURIComponent(url.replace(/\+/g, " "));
  } catch {
    return url;
  }
}

function SearchDebugUrls(props: { requests: SearchDebugRequest[]; visible: boolean }) {
  // 开发态：只展示实际爬虫/聚合请求，不展示官网对照页
  if (typeof __DEV__ === "undefined" || !__DEV__ || !props.visible || props.requests.length === 0) {
    return null;
  }
  return (
    <View style={styles.debugUrlCard} testID="music-search-debug-urls">
      <Text style={styles.debugUrlHeading}>开发：实际爬虫请求</Text>
      {props.requests.map((item, index) => (
        <View key={`${item.providerId}:${index}:${item.url}`} style={styles.debugUrlBlock}>
          <Text style={styles.debugUrlLabel}>{getMusicPlatformLabel(item.providerId)}</Text>
          <Text
            style={styles.debugUrlText}
            selectable
            accessibilityLabel={`${getMusicPlatformLabel(item.providerId)} 爬虫地址`}
          >
            {formatDebugUrlDisplay(item.url)}
          </Text>
          {item.note ? <Text style={styles.debugUrlNote}>{item.note}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function SpinningRefreshIcon(props: { spinning: boolean; color: string; size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!props.spinning) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [props.spinning, spin]);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <RefreshCw size={props.size ?? 16} color={props.color} />
    </Animated.View>
  );
}

function SearchProviderErrors(props: { errors: { providerId: string; message: string }[] }) {
  if (props.errors.length === 0) {
    return null;
  }
  return (
    <View style={styles.errorCard} testID="music-search-provider-errors">
      {props.errors.map((item) => (
        <Text key={`${item.providerId}:${item.message}`} style={styles.errorText}>
          {getMusicPlatformLabel(item.providerId)}：{item.message}
        </Text>
      ))}
    </View>
  );
}

function SearchResultsBody(props: {
  scope: SearchScope;
  page: SearchResultPage | null;
  derivedArtists: SearchHitArtist[];
  derivedAlbums: SearchHitAlbum[];
  loadingMore?: boolean;
  debugPanelOpen: boolean;
  onSelect: (hit: SearchHitTrack) => void;
  onPlayNext?: (hit: SearchHitTrack) => void;
  onEnqueue?: (hit: SearchHitTrack) => void;
  onSave?: (hit: SearchHitTrack) => void;
  onLoadMore?: () => void;
  onOpenArtist: (artist: SearchHitArtist) => void;
  onOpenAlbum: (album: SearchHitAlbum) => void;
  onOpenPlaylist: (playlist: SearchHitPlaylist) => void;
  onPlayArtist?: (artist: SearchHitArtist) => void;
  onEnqueueArtist?: (artist: SearchHitArtist) => void;
  onPlayAlbum?: (album: SearchHitAlbum) => void;
  onEnqueueAlbum?: (album: SearchHitAlbum) => void;
  onPlayPlaylist?: (playlist: SearchHitPlaylist) => void;
  onEnqueuePlaylist?: (playlist: SearchHitPlaylist) => void;
}) {
  const showTracks = props.scope === "all" || props.scope === "track";
  const showArtists = props.scope === "all" || props.scope === "artist";
  const showAlbums = props.scope === "all" || props.scope === "album";
  const showPlaylists = props.scope === "all" || props.scope === "playlist";
  return (
    <View style={styles.sections}>
      <SearchDebugUrls
        requests={props.page?.debugSearchRequests ?? []}
        visible={props.debugPanelOpen}
      />
      <SearchProviderErrors errors={props.page?.providerErrors ?? []} />
      {showTracks ? (
        <SongTableSection
          tracks={props.page?.tracks ?? []}
          hasMore={props.page?.hasMore}
          loadingMore={props.loadingMore}
          onSelect={props.onSelect}
          onPlayNext={props.onPlayNext}
          onEnqueue={props.onEnqueue}
          onSave={props.onSave}
          onLoadMore={props.onLoadMore}
        />
      ) : null}
      {showArtists ? (
        <SearchSectionCard title="音乐人">
          <ArtistList
            artists={props.derivedArtists}
            onOpen={props.onOpenArtist}
            onPlayAll={props.onPlayArtist}
            onEnqueue={props.onEnqueueArtist}
          />
        </SearchSectionCard>
      ) : null}
      {showAlbums ? (
        <SearchSectionCard title="专辑">
          <AlbumList
            albums={props.derivedAlbums}
            onOpen={props.onOpenAlbum}
            onPlayAll={props.onPlayAlbum}
            onEnqueue={props.onEnqueueAlbum}
          />
        </SearchSectionCard>
      ) : null}
      {showPlaylists ? (
        <SearchSectionCard title="歌单">
          <PlaylistList
            playlists={props.page?.playlists ?? []}
            onOpen={props.onOpenPlaylist}
            onPlayAll={props.onPlayPlaylist}
            onEnqueue={props.onEnqueuePlaylist}
          />
        </SearchSectionCard>
      ) : null}
    </View>
  );
}

function CollectionDetailBody(props: {
  collection: SearchActiveCollection;
  tracks: SearchHitTrack[];
  hasMore?: boolean;
  loadingMore?: boolean;
  onSelect: (hit: SearchHitTrack) => void;
  onPlayNext?: (hit: SearchHitTrack) => void;
  onEnqueue?: (hit: SearchHitTrack) => void;
  onSave?: (hit: SearchHitTrack) => void;
  onPlayAll: () => void;
  onEnqueueAll: () => void;
  onLoadMore?: () => void;
  onSearchName: () => void;
}) {
  const kindLabel = collectionKindLabel(props.collection.kind);
  const hasTracks = props.tracks.length > 0;
  const empty = !hasTracks;
  const hint = collectionTrackSourceHint({
    kind: props.collection.kind,
    source: hasTracks ? "local" : "empty",
    derived: props.collection.derived,
    title: props.collection.title,
    empty,
  });
  const countSuffix = collectionTrackCountSuffix("local");
  return (
    <View style={styles.sections} testID="music-search-collection-detail">
      <View style={styles.sectionCard}>
        <View style={styles.collectionHeader}>
          <View style={styles.collectionCoverWrap}>
            <MediaCoverThumb
              coverUrl={props.collection.coverUrl}
              sizeStyle="square"
              size={Math.round(SQUARE_COVER_SIZE * 0.75)}
            />
            <View style={styles.squarePlatformBadge} pointerEvents="none">
              <MusicProviderBrandIcon providerId={props.collection.providerId} size="sm" />
            </View>
          </View>
          <View style={styles.collectionMeta}>
            <Text style={styles.collectionKind}>{kindLabel}</Text>
            <Text style={styles.collectionTitle} numberOfLines={2}>
              {props.collection.title}
            </Text>
            {props.collection.subtitle ? (
              <Text style={styles.collectionSubtitle} numberOfLines={1}>
                {props.collection.subtitle}
              </Text>
            ) : null}
            {hasTracks ? (
              <Text style={styles.collectionCount}>
                {props.tracks.length} 首{countSuffix}
              </Text>
            ) : null}
            {hasTracks ? (
              <View style={styles.collectionActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="播放全部"
                  onPress={props.onPlayAll}
                  style={styles.collectionActionBtn}
                  testID="music-search-collection-play-all"
                >
                  <Text style={styles.collectionSearchCtaText}>播放全部</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="加入队列"
                  onPress={props.onEnqueueAll}
                  style={styles.collectionActionBtn}
                  testID="music-search-collection-enqueue-all"
                >
                  <Text style={styles.collectionActionBtnMuted}>加入队列</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={styles.collectionHint}>{hint}</Text>
        {empty ? (
          <View style={styles.collectionEmptyActions}>
            <Text style={styles.emptyBlock}>当前搜索结果里暂无匹配歌曲</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`搜索 ${props.collection.title}`}
              onPress={props.onSearchName}
              style={styles.collectionSearchCta}
              testID="music-search-collection-research"
            >
              <Text style={styles.collectionSearchCtaText}>搜索「{props.collection.title}」</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {hasTracks ? (
        <SongTableSection
          tracks={props.tracks}
          hasMore={props.hasMore}
          loadingMore={props.loadingMore}
          onSelect={props.onSelect}
          onPlayNext={props.onPlayNext}
          onEnqueue={props.onEnqueue}
          onSave={props.onSave}
          onLoadMore={props.onLoadMore}
        />
      ) : null}
    </View>
  );
}

function SearchConditionChips(props: {
  history: string[];
  onSelectHistory: (query: string) => void;
  onRemoveHistory: (query: string) => void;
  filterPlatforms: ReturnType<typeof listSearchFilterPlatforms>;
  selectedProviderIds: string[];
  sourcesOpen: boolean;
  onToggleSourcesOpen: () => void;
  onCloseSources: () => void;
  onToggleProvider: (id: string) => void;
  onInteract: () => void;
}) {
  const {
    history,
    onSelectHistory,
    onRemoveHistory,
    filterPlatforms,
    selectedProviderIds,
    sourcesOpen,
    onToggleSourcesOpen,
    onCloseSources,
    onToggleProvider,
    onInteract,
  } = props;
  const { theme } = useUnistyles();
  const muted = theme.colors.foregroundMuted;
  const accent = theme.colors.accent;
  const [armedQuery, setArmedQuery] = useState<string | null>(null);
  const rowRef = useRef<View>(null);

  const selectedPlatforms = useMemo(
    () => filterPlatforms.filter((platform) => selectedProviderIds.includes(platform.id)),
    [filterPlatforms, selectedProviderIds],
  );

  useEffect(() => {
    if ((!armedQuery && !sourcesOpen) || typeof document === "undefined") {
      return;
    }
    const dismiss = (event: Event) => {
      const node = rowRef.current as unknown as HTMLElement | null;
      if (node?.contains(event.target as Node)) {
        return;
      }
      setArmedQuery(null);
      onCloseSources();
    };
    const timer = setTimeout(() => document.addEventListener("pointerdown", dismiss), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [armedQuery, sourcesOpen, onCloseSources]);

  const handleChipPress = useCallback(
    (query: string) => {
      if (armedQuery === query) {
        onRemoveHistory(query);
        setArmedQuery(null);
        return;
      }
      if (armedQuery) {
        setArmedQuery(null);
        return;
      }
      onSelectHistory(query);
    },
    [armedQuery, onRemoveHistory, onSelectHistory],
  );

  return (
    <View
      ref={rowRef}
      collapsable={false}
      style={styles.conditionChipsRoot}
      testID="music-search-provider-picker"
    >
      <View style={styles.chipWrapRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: sourcesOpen }}
          accessibilityLabel={`来源，已选 ${selectedPlatforms.map((item) => item.label).join("、") || "无"}`}
          onPressIn={onInteract}
          onPress={onToggleSourcesOpen}
          style={[
            styles.historyChip,
            styles.sourceSummaryChip,
            sourcesOpen ? styles.sourceChipOpen : null,
          ]}
          testID="music-search-provider-summary"
        >
          <Text style={styles.historyChipText}>来源</Text>
          {selectedPlatforms.map((platform) => (
            <MusicProviderBrandIcon key={platform.id} providerId={platform.id} size="sm" />
          ))}
          <ChevronDown
            size={12}
            color={muted}
            style={sourcesOpen ? styles.providerChevronOpen : undefined}
          />
        </Pressable>

        {sourcesOpen
          ? filterPlatforms.map((platform) => {
              const selected = selectedProviderIds.includes(platform.id);
              return (
                <Pressable
                  key={`pick-${platform.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${platform.label}${selected ? "已选" : "未选"}`}
                  onPressIn={onInteract}
                  onPress={() => onToggleProvider(platform.id)}
                  style={[styles.historyChip, selected ? styles.sourcePickChipSelected : null]}
                  testID={`music-search-provider-${platform.id}`}
                >
                  <MusicProviderBrandIcon providerId={platform.id} size="sm" />
                  <Text
                    style={[
                      styles.historyChipText,
                      selected ? { color: accent, fontWeight: theme.fontWeight.medium } : null,
                    ]}
                    numberOfLines={1}
                  >
                    {platform.label}
                  </Text>
                </Pressable>
              );
            })
          : history.map((query) => {
              const armed = armedQuery === query;
              return (
                <Pressable
                  key={query}
                  accessibilityRole="button"
                  accessibilityLabel={
                    armed ? `再次点击删除搜索记录 ${query}` : `搜索 ${query}，长按进入删除`
                  }
                  delayLongPress={320}
                  onPressIn={onInteract}
                  onLongPress={() => setArmedQuery(query)}
                  onPress={() => handleChipPress(query)}
                  style={[styles.historyChip, armed ? styles.historyChipArmed : null]}
                  testID={
                    armed ? `music-search-history-armed-${query}` : `music-search-history-${query}`
                  }
                >
                  {armed ? <Trash2 size={12} color={theme.colors.foreground} /> : null}
                  <Text
                    style={[styles.historyChipText, armed ? styles.historyChipTextArmed : null]}
                    numberOfLines={1}
                  >
                    {query}
                  </Text>
                </Pressable>
              );
            })}
      </View>
    </View>
  );
}

export function MusicSearchView(props: {
  onBack: () => void;
  onPlayLocalTrack: (trackId: string) => void;
  onSelectTrackHit: (hit: SearchHitTrack) => void | Promise<void>;
  /** 合集「播放全部」：入库后以列表替换队列并播第一首 */
  onPlayAllTrackHits?: (hits: SearchHitTrack[]) => void;
  /** 合集「加入队列」：入库后追加到队尾 */
  onEnqueueTrackHits?: (hits: SearchHitTrack[]) => void;
  /** 搜索行「下一首播放」：入库后插到下一首 */
  onPlayNextTrackHit?: (hit: SearchHitTrack) => void;
  /** 搜索行「加入播放列表」：入库后追加到队尾 */
  onEnqueueTrackHit?: (hit: SearchHitTrack) => void;
  /** 搜索行「保存歌曲」：解析并落盘，不切播放 */
  onSaveTrackHit?: (hit: SearchHitTrack) => void | Promise<void>;
}) {
  const { theme, rt } = useUnistyles();
  const isCompact = rt.breakpoint === "xs" || rt.breakpoint === "sm";
  const muted = theme.colors.foregroundMuted;
  const accent = theme.colors.accent;
  const searchHistory = useMusicDemoStore((state) => state.searchHistory);
  const pushSearchHistory = useMusicDemoStore((state) => state.pushSearchHistory);
  const removeSearchHistory = useMusicDemoStore((state) => state.removeSearchHistory);
  const searchProviderIds = useMusicDemoStore((state) => state.searchProviderIds);
  const toggleSearchProviderId = useMusicDemoStore((state) => state.toggleSearchProviderId);
  const lastSearchCache = useMusicDemoStore((state) => state.lastSearchCache);
  const upsertSearchResultCache = useMusicDemoStore((state) => state.upsertSearchResultCache);
  const clearSearchResultCache = useMusicDemoStore((state) => state.clearSearchResultCache);
  const persistedDraft = useMusicDemoStore((state) => state.searchDraft);
  const persistedScope = useMusicDemoStore((state) => state.searchScope);
  const persistedScrollY = useMusicDemoStore((state) => state.searchResultsScrollY);
  const setSearchDraft = useMusicDemoStore((state) => state.setSearchDraft);
  const setSearchScope = useMusicDemoStore((state) => state.setSearchScope);
  const setSearchResultsScrollY = useMusicDemoStore((state) => state.setSearchResultsScrollY);
  const activeCollection = useMusicDemoStore((state) => state.searchActiveCollection);
  const setSearchActiveCollection = useMusicDemoStore((state) => state.setSearchActiveCollection);
  // 合集封面回填依赖曲库；订阅 tracks 以便落盘后刷新封面
  useMusicDemoStore((state) => state.tracks);
  const searchCollectionReturnScrollY = useMusicDemoStore(
    (state) => state.searchCollectionReturnScrollY,
  );
  const setSearchCollectionReturnScrollY = useMusicDemoStore(
    (state) => state.setSearchCollectionReturnScrollY,
  );
  const [draft, setDraftState] = useState(() => persistedDraft || lastSearchCache?.query || "");
  const [submittedQuery, setSubmittedQuery] = useState(
    () => lastSearchCache?.query || persistedDraft || "",
  );
  /** 仅回车/点搜索/刷新时递增；切换来源不触发重新搜索 */
  const [searchEpoch, setSearchEpoch] = useState(0);
  const [forceRefreshToken, setForceRefreshToken] = useState(0);
  const forceNextSearchRef = useRef(false);
  const [scope, setScopeState] = useState<SearchScope>(
    () => persistedScope || lastSearchCache?.scope || "all",
  );
  const [page, setPage] = useState<SearchResultPage | null>(() => lastSearchCache?.page ?? null);
  const [loadingPhase, setLoadingPhase] = useState<"idle" | "searching" | "verifying">("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  /** 点播解析音流中：刷新图标旋转，旧列表仍可见 */
  const [resolvingPlay, setResolvingPlay] = useState(false);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const restoredCacheRef = useRef(Boolean(lastSearchCache?.query && lastSearchCache.page));
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipsInteractingRef = useRef(false);
  const sourcesOpenRef = useRef(false);
  const resultsScrollRef = useRef<ScrollView | null>(null);
  const restoreScrollOnceRef = useRef(true);
  const skipScrollPersistRef = useRef(false);
  /** 实时滚动位置；进入合集前写入 store，返回时恢复 */
  const liveScrollYRef = useRef(persistedScrollY);
  /** 当前结果页已对应的关键词；切 tab / effect 重跑时若相同且非强制刷新则绝不打网 */
  const loadedQueryRef = useRef(
    lastSearchCache?.query?.trim() && lastSearchCache.page
      ? lastSearchCache.query.trim().toLowerCase()
      : "",
  );
  const scrollPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 仅首次进入且无草稿时自动聚焦，避免 HMR/重挂载抢焦点把列表滚乱 */
  const shouldAutoFocus = !persistedDraft && !lastSearchCache?.query;

  const setDraft = useCallback(
    (value: string) => {
      setDraftState(value);
      setSearchDraft(value);
    },
    [setSearchDraft],
  );

  const setScope = useCallback(
    (next: SearchScope) => {
      // 只改展示过滤 + 记住 tab；不要动 submittedQuery / searchEpoch，禁止任何重搜
      setSearchActiveCollection(null);
      setScopeState(next);
      setSearchScope(next);
      setSearchResultsScrollY(0);
      skipScrollPersistRef.current = true;
      resultsScrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [setSearchActiveCollection, setSearchResultsScrollY, setSearchScope],
  );

  const filterPlatforms = useMemo(() => listSearchFilterPlatforms(), []);
  // 紧凑端：聚焦、展开来源、或正在点胶囊时显示
  const showConditionChips = !isCompact || inputFocused || sourcesOpen;

  sourcesOpenRef.current = sourcesOpen;

  /** 网络搜索固定拉综合结果；tab 只做前端过滤，避免切 tab / 点历史反复打网 */
  const applyCachedPage = useCallback(
    (text: string, cachedPage: NonNullable<typeof page>) => {
      const normalized = text.trim();
      loadedQueryRef.current = normalized.toLowerCase();
      setDraft(normalized);
      setSubmittedQuery(normalized);
      setPage(cachedPage);
      setLoadingPhase("idle");
      setSearchResultsScrollY(0);
      skipScrollPersistRef.current = true;
      resultsScrollRef.current?.scrollTo({ y: 0, animated: false });
      pushSearchHistory(normalized);
    },
    [pushSearchHistory, setDraft, setSearchResultsScrollY],
  );

  const submitSearch = useCallback(
    (nextDraft?: string) => {
      const text = (nextDraft ?? draft).trim();
      if (!text) {
        setDraft("");
        setSubmittedQuery("");
        setPage(null);
        setSearchActiveCollection(null);
        return;
      }
      setSearchActiveCollection(null);
      const providerIds = useMusicDemoStore.getState().searchProviderIds;
      const ttl = useMusicDemoStore.getState().searchCacheTtlMinutes;
      const caches = useMusicDemoStore.getState().searchResultCaches;
      const cached = findMusicSearchCacheEntryForQuery(caches, { query: text, providerIds });
      if (cached?.page) {
        // 有缓存先上屏；TTL 内不打网，过期则保留旧结果并后台刷新（不清历史、不删缓存条目）
        applyCachedPage(text, cached.page);
        if (isMusicSearchCacheFresh(cached, ttl)) {
          return;
        }
        loadedQueryRef.current = "";
        forceNextSearchRef.current = true;
        setSearchEpoch((epoch) => epoch + 1);
        return;
      }
      setDraft(text);
      setSubmittedQuery(text);
      loadedQueryRef.current = "";
      setSearchEpoch((epoch) => epoch + 1);
      setSearchResultsScrollY(0);
      skipScrollPersistRef.current = true;
      resultsScrollRef.current?.scrollTo({ y: 0, animated: false });
      pushSearchHistory(text);
    },
    [
      applyCachedPage,
      draft,
      pushSearchHistory,
      setDraft,
      setSearchActiveCollection,
      setSearchResultsScrollY,
    ],
  );

  const handleHistorySelect = useCallback(
    (query: string) => {
      submitSearch(query);
    },
    [submitSearch],
  );

  const handleRefreshSearch = useCallback(() => {
    const text = submittedQuery.trim() || draft.trim();
    if (!text) {
      return;
    }
    setSearchActiveCollection(null);
    const providerIds = useMusicDemoStore.getState().searchProviderIds;
    clearSearchResultCache({ query: text, scope: SEARCH_FETCH_SCOPE, providerIds });
    // 同 query 其它 scope 旧缓存一并清掉，避免刷新后仍命中过期条目
    const caches = useMusicDemoStore.getState().searchResultCaches;
    for (const entry of caches) {
      if (entry.query.trim().toLowerCase() === text.toLowerCase()) {
        clearSearchResultCache({
          query: text,
          scope: entry.scope,
          providerIds: entry.providerIds,
        });
      }
    }
    forceNextSearchRef.current = true;
    loadedQueryRef.current = "";
    setDraft(text);
    setSubmittedQuery(text);
    setForceRefreshToken((token) => token + 1);
    setSearchEpoch((epoch) => epoch + 1);
    pushSearchHistory(text);
  }, [
    clearSearchResultCache,
    draft,
    pushSearchHistory,
    setDraft,
    setSearchActiveCollection,
    submittedQuery,
  ]);

  useEffect(() => {
    let cancelled = false;
    const text = submittedQuery.trim();
    if (!text) {
      loadedQueryRef.current = "";
      setPage(null);
      setLoadingPhase("idle");
      return;
    }
    const normalized = text.toLowerCase();
    const providerIds = useMusicDemoStore.getState().searchProviderIds;
    const ttl = useMusicDemoStore.getState().searchCacheTtlMinutes;
    const caches = useMusicDemoStore.getState().searchResultCaches;
    const force = forceNextSearchRef.current;
    forceNextSearchRef.current = false;

    // 切 tab / persist 回写导致的 effect 重跑：同词已在展，绝对不打网
    if (!force && loadedQueryRef.current === normalized) {
      setLoadingPhase("idle");
      return;
    }

    const cachedEntry =
      findMusicSearchCacheEntry(caches, {
        query: text,
        scope: SEARCH_FETCH_SCOPE,
        providerIds,
      }) ?? findMusicSearchCacheEntryForQuery(caches, { query: text, providerIds });
    const cacheFresh = isMusicSearchCacheFresh(cachedEntry, ttl);
    if (!force && cacheFresh && cachedEntry?.page) {
      restoredCacheRef.current = false;
      loadedQueryRef.current = normalized;
      setPage(cachedEntry.page);
      setLoadingPhase("idle");
      return;
    }
    // 过期缓存：先展示旧页再打网；禁止因 TTL 把页面清空
    if (cachedEntry?.page) {
      setPage(cachedEntry.page);
    }
    if (
      restoredCacheRef.current &&
      !force &&
      !cachedEntry?.page &&
      lastSearchCache?.query === text &&
      lastSearchCache.page
    ) {
      restoredCacheRef.current = false;
      loadedQueryRef.current = normalized;
      setPage(lastSearchCache.page);
      setLoadingPhase("idle");
      return;
    }
    restoredCacheRef.current = false;
    // 已有可见结果时用 verifying，避免「搜索中」空态误以为历史被清
    setLoadingPhase(cachedEntry?.page ? "verifying" : "searching");
    const host = tryGetMusicHostApi();
    const progress =
      host != null
        ? host.ui.progress.create({
            title: "搜索音乐",
            message: text,
            appId: MUSIC_APP_ID,
          })
        : null;
    void (async () => {
      try {
        if (!cachedEntry?.page) {
          setLoadingPhase("verifying");
        }
        const nextPage = await searchPlayableMusic(
          {
            text,
            scope: SEARCH_FETCH_SCOPE,
            providerIds,
            page: 1,
          },
          {
            onPartial: (partial) => {
              if (cancelled) {
                return;
              }
              progress?.report({ message: "验证可播地址…" });
              // 快源 / 先完成的浏览器源先上屏；慢源或失败源不得清掉已有结果
              setPage(partial);
              setLoadingPhase("verifying");
            },
          },
        );
        if (!cancelled) {
          loadedQueryRef.current = normalized;
          setPage(nextPage);
          upsertSearchResultCache({
            query: text,
            scope: SEARCH_FETCH_SCOPE,
            providerIds: providerIds.slice(),
            page: nextPage,
            updatedAt: Date.now(),
          });
          setLoadingPhase("idle");
          progress?.end({ kind: "success" });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingPhase("idle");
          progress?.end({
            kind: "error",
            message: error instanceof Error ? error.message : String(error),
          });
          host?.ui.notification.show({
            title: "搜索失败",
            message: error instanceof Error ? error.message : String(error),
            kind: "error",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      progress?.end({ kind: "cancelled" });
    };
    // 故意不依赖 scope：tab 只过滤 UI，不触发重搜
    // 故意不依赖 lastSearchCache：加载更多会 upsert 缓存，若列入 deps 会整页重搜并滚回顶部
    // 故意不依赖 searchProviderIds：切换来源只改勾选，等用户回车再搜
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastSearchCache 仅首屏 restoredCacheRef 读取
  }, [submittedQuery, searchEpoch, forceRefreshToken, upsertSearchResultCache]);

  const handleLoadMore = useCallback(async () => {
    const text = submittedQuery.trim();
    if (!text || !page?.hasMore || loadingMore) {
      return;
    }
    const nextPageNum = Math.max(1, Math.floor(page.page ?? 1)) + 1;
    const providerIds = useMusicDemoStore.getState().searchProviderIds;
    setLoadingMore(true);
    const host = tryGetMusicHostApi();
    const progress =
      host != null
        ? host.ui.progress.create({
            title: "加载更多",
            message: text,
            appId: MUSIC_APP_ID,
          })
        : null;
    try {
      progress?.report({ message: `第 ${nextPageNum} 页` });
      const more = await searchPlayableMusic({
        text,
        scope: SEARCH_FETCH_SCOPE,
        providerIds,
        page: nextPageNum,
      });
      const merged = mergeSearchResultPages(page, more, nextPageNum);
      setPage(merged);
      upsertSearchResultCache({
        query: text,
        scope: SEARCH_FETCH_SCOPE,
        providerIds: providerIds.slice(),
        page: merged,
        updatedAt: Date.now(),
      });
      progress?.end({ kind: "success" });
    } catch (error) {
      progress?.end({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      host?.ui.notification.show({
        title: "加载更多失败",
        message: error instanceof Error ? error.message : String(error),
        kind: "error",
      });
      throw error;
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, submittedQuery, upsertSearchResultCache]);

  const handleSelect = useCallback(
    (hit: SearchHitTrack) => {
      if (resolvingPlay) {
        return;
      }
      if (hit.localTrackId) {
        props.onPlayLocalTrack(hit.localTrackId);
        return;
      }
      setResolvingPlay(true);
      void Promise.resolve(props.onSelectTrackHit(hit)).finally(() => {
        setResolvingPlay(false);
      });
    },
    [props, resolvingPlay],
  );

  const openCollection = useCallback(
    (next: SearchActiveCollection) => {
      setSearchCollectionReturnScrollY(liveScrollYRef.current);
      setSearchActiveCollection(next);
      skipScrollPersistRef.current = true;
      resultsScrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [setSearchActiveCollection, setSearchCollectionReturnScrollY],
  );

  const handleOpenArtist = useCallback(
    (artist: SearchHitArtist) => {
      openCollection({
        kind: "artist",
        title: artist.name,
        subtitle: artist.trackCount && artist.trackCount > 0 ? `${artist.trackCount} 首` : null,
        coverUrl: artist.coverUrl,
        providerId: artist.ref.providerId,
        remoteId: artist.ref.remoteId,
        derived: isDerivedCollectionRemoteId(artist.ref.remoteId),
      });
    },
    [openCollection],
  );

  const handleOpenAlbum = useCallback(
    (album: SearchHitAlbum) => {
      openCollection({
        kind: "album",
        title: album.title,
        subtitle: album.artist?.trim() || null,
        coverUrl: album.coverUrl,
        providerId: album.ref.providerId,
        remoteId: album.ref.remoteId,
        derived: isDerivedCollectionRemoteId(album.ref.remoteId),
      });
    },
    [openCollection],
  );

  const handleOpenPlaylist = useCallback(
    (playlist: SearchHitPlaylist) => {
      openCollection({
        kind: "playlist",
        title: playlist.title,
        subtitle: playlist.creator?.trim() || null,
        coverUrl: playlist.coverUrl,
        providerId: playlist.ref.providerId,
        remoteId: playlist.ref.remoteId,
        derived: false,
      });
    },
    [openCollection],
  );
  const toCollectionFromArtist = useCallback((artist: SearchHitArtist): SearchActiveCollection => {
    return {
      kind: "artist",
      title: artist.name,
      subtitle: artist.trackCount && artist.trackCount > 0 ? `${artist.trackCount} 首` : null,
      coverUrl: artist.coverUrl,
      providerId: artist.ref.providerId,
      remoteId: artist.ref.remoteId,
      derived: isDerivedCollectionRemoteId(artist.ref.remoteId),
    };
  }, []);

  const toCollectionFromAlbum = useCallback((album: SearchHitAlbum): SearchActiveCollection => {
    return {
      kind: "album",
      title: album.title,
      subtitle: album.artist?.trim() || null,
      coverUrl: album.coverUrl,
      providerId: album.ref.providerId,
      remoteId: album.ref.remoteId,
      derived: isDerivedCollectionRemoteId(album.ref.remoteId),
    };
  }, []);

  const toCollectionFromPlaylist = useCallback(
    (playlist: SearchHitPlaylist): SearchActiveCollection => {
      return {
        kind: "playlist",
        title: playlist.title,
        subtitle: playlist.creator?.trim() || null,
        coverUrl: playlist.coverUrl,
        providerId: playlist.ref.providerId,
        remoteId: playlist.ref.remoteId,
        derived: isDerivedCollectionRemoteId(playlist.ref.remoteId),
      };
    },
    [],
  );

  const resolveCollectionForActions = useCallback(
    (collection: SearchActiveCollection) => {
      const tracks = enrichSearchHitCoversFromLibrary(
        filterTracksForCollection(page?.tracks ?? [], collection),
      );
      return { tracks, source: tracks.length > 0 ? ("local" as const) : ("empty" as const) };
    },
    [page?.tracks],
  );

  const handlePlayArtist = useCallback(
    (artist: SearchHitArtist) => {
      const resolved = resolveCollectionForActions(toCollectionFromArtist(artist));
      if (resolved.tracks.length > 0) {
        props.onPlayAllTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromArtist],
  );

  const handleEnqueueArtist = useCallback(
    (artist: SearchHitArtist) => {
      const resolved = resolveCollectionForActions(toCollectionFromArtist(artist));
      if (resolved.tracks.length > 0) {
        props.onEnqueueTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromArtist],
  );

  const handlePlayAlbum = useCallback(
    (album: SearchHitAlbum) => {
      const resolved = resolveCollectionForActions(toCollectionFromAlbum(album));
      if (resolved.tracks.length > 0) {
        props.onPlayAllTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromAlbum],
  );

  const handleEnqueueAlbum = useCallback(
    (album: SearchHitAlbum) => {
      const resolved = resolveCollectionForActions(toCollectionFromAlbum(album));
      if (resolved.tracks.length > 0) {
        props.onEnqueueTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromAlbum],
  );

  const handlePlayPlaylist = useCallback(
    (playlist: SearchHitPlaylist) => {
      const resolved = resolveCollectionForActions(toCollectionFromPlaylist(playlist));
      if (resolved.tracks.length > 0) {
        props.onPlayAllTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromPlaylist],
  );

  const handleEnqueuePlaylist = useCallback(
    (playlist: SearchHitPlaylist) => {
      const resolved = resolveCollectionForActions(toCollectionFromPlaylist(playlist));
      if (resolved.tracks.length > 0) {
        props.onEnqueueTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromPlaylist],
  );

  const handleCloseCollection = useCallback(() => {
    const y = searchCollectionReturnScrollY;
    setSearchActiveCollection(null);
    skipScrollPersistRef.current = true;
    requestAnimationFrame(() => {
      resultsScrollRef.current?.scrollTo({ y, animated: false });
      liveScrollYRef.current = y;
      setSearchResultsScrollY(y);
    });
  }, [searchCollectionReturnScrollY, setSearchActiveCollection, setSearchResultsScrollY]);

  // 合集 = 过滤当前搜索歌曲列表；加载更多 = 原搜索翻页后再过滤
  const collectionTracks = useMemo(() => {
    if (!activeCollection || !page) {
      return [] as SearchHitTrack[];
    }
    let tracks = filterTracksForCollection(page.tracks, activeCollection);
    if (activeCollection.providerId !== "local") {
      tracks = tracks.filter((track) => track.ref.providerId !== "local");
    }
    return enrichSearchHitCoversFromLibrary(tracks);
  }, [activeCollection, page]);

  const handlePlayAllCollection = () => {
    if (collectionTracks.length === 0) {
      return;
    }
    props.onPlayAllTrackHits?.(collectionTracks);
  };

  const handleEnqueueAllCollection = () => {
    if (collectionTracks.length === 0) {
      return;
    }
    props.onEnqueueTrackHits?.(collectionTracks);
  };

  const refreshBusy = loadingPhase !== "idle" || loadingMore || resolvingPlay;
  let refreshA11yLabel = "刷新搜索结果";
  if (resolvingPlay) {
    refreshA11yLabel = "正在解析播放地址";
  } else if (loadingPhase !== "idle" || loadingMore) {
    refreshA11yLabel = "正在刷新搜索结果";
  }

  const derivedArtists = useMemo(() => {
    if (page?.artists?.length) {
      return page.artists;
    }
    const seen = new Set<string>();
    const artists: SearchHitArtist[] = [];
    for (const track of page?.tracks ?? []) {
      const name = track.artist.trim();
      if (!name || seen.has(name)) {
        continue;
      }
      seen.add(name);
      artists.push({
        kind: "artist",
        ref: {
          providerId: track.ref.providerId,
          remoteId: `artist:${name}`,
        },
        name,
        trackCount: undefined,
        coverUrl: track.coverUrl,
      });
    }
    return artists;
  }, [page?.artists, page?.tracks]);

  const derivedAlbums = useMemo(() => {
    if (page?.albums?.length) {
      return page.albums;
    }
    const seen = new Set<string>();
    const albums: SearchHitAlbum[] = [];
    for (const track of page?.tracks ?? []) {
      const title = track.album?.trim();
      if (!title) {
        continue;
      }
      const key = `${track.ref.providerId}:${title}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      albums.push({
        kind: "album",
        ref: {
          providerId: track.ref.providerId,
          remoteId: `album:${title}`,
        },
        title,
        artist: track.artist,
        coverUrl: track.coverUrl,
      });
    }
    return albums;
  }, [page?.albums, page?.tracks]);

  const toggleSourcesOpen = useCallback(() => {
    setSourcesOpen((open) => !open);
  }, []);
  const closeSources = useCallback(() => {
    setSourcesOpen(false);
  }, []);

  const handleInputFocus = useCallback(() => {
    if (inputBlurTimerRef.current) {
      clearTimeout(inputBlurTimerRef.current);
      inputBlurTimerRef.current = null;
    }
    setInputFocused(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    if (inputBlurTimerRef.current) {
      clearTimeout(inputBlurTimerRef.current);
    }
    inputBlurTimerRef.current = setTimeout(() => {
      inputBlurTimerRef.current = null;
      // 点「来源」时 blur 往往先于 press；来源已展开或正在点胶囊则不收
      if (chipsInteractingRef.current || sourcesOpenRef.current) {
        return;
      }
      setInputFocused(false);
    }, 200);
  }, []);

  /** 点来源/历史/厂家：标记交互并取消待执行的 blur 收起 */
  const keepConditionChipsVisible = useCallback(() => {
    chipsInteractingRef.current = true;
    if (inputBlurTimerRef.current) {
      clearTimeout(inputBlurTimerRef.current);
      inputBlurTimerRef.current = null;
    }
    setInputFocused(true);
    // 下一拍清掉 interacting，让后续真正点空白处的 blur 能收起
    const clearInteracting = () => {
      chipsInteractingRef.current = false;
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(clearInteracting);
    } else {
      setTimeout(clearInteracting, 0);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (inputBlurTimerRef.current) {
        clearTimeout(inputBlurTimerRef.current);
      }
    };
  }, []);

  // 刷新/搜索中保留旧结果；仅首次无缓存时才显示「搜索中…」占位
  let resultsBody: ReactNode;
  if (!submittedQuery.trim()) {
    resultsBody = null;
  } else if (loadingPhase !== "idle" && !page) {
    resultsBody = (
      <Text style={styles.hint}>
        {loadingPhase === "searching" ? "搜索中…" : "正在后台验证可播地址…"}
      </Text>
    );
  } else if (activeCollection) {
    resultsBody = (
      <CollectionDetailBody
        collection={activeCollection}
        tracks={collectionTracks}
        hasMore={Boolean(page?.hasMore)}
        loadingMore={loadingMore}
        onSelect={handleSelect}
        onPlayNext={props.onPlayNextTrackHit}
        onEnqueue={props.onEnqueueTrackHit}
        onSave={props.onSaveTrackHit}
        onPlayAll={handlePlayAllCollection}
        onEnqueueAll={handleEnqueueAllCollection}
        onLoadMore={() => {
          void handleLoadMore();
        }}
        onSearchName={() => {
          submitSearch(activeCollection.title);
        }}
      />
    );
  } else {
    resultsBody = (
      <SearchResultsBody
        scope={scope}
        page={page}
        derivedArtists={derivedArtists}
        derivedAlbums={derivedAlbums}
        loadingMore={loadingMore}
        debugPanelOpen={debugPanelOpen}
        onSelect={handleSelect}
        onPlayNext={props.onPlayNextTrackHit}
        onEnqueue={props.onEnqueueTrackHit}
        onSave={props.onSaveTrackHit}
        onLoadMore={() => {
          void handleLoadMore();
        }}
        onOpenArtist={handleOpenArtist}
        onOpenAlbum={handleOpenAlbum}
        onOpenPlaylist={handleOpenPlaylist}
        onPlayArtist={handlePlayArtist}
        onEnqueueArtist={handleEnqueueArtist}
        onPlayAlbum={handlePlayAlbum}
        onEnqueueAlbum={handleEnqueueAlbum}
        onPlayPlaylist={handlePlayPlaylist}
        onEnqueuePlaylist={handleEnqueuePlaylist}
      />
    );
  }

  return (
    <View style={styles.root} testID="workspace-mini-app-music-search">
      <View style={styles.searchBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={activeCollection ? "返回搜索结果" : "收起搜索"}
          onPress={() => {
            if (activeCollection) {
              handleCloseCollection();
              return;
            }
            props.onBack();
          }}
          style={styles.backHit}
          testID={activeCollection ? "music-search-collection-back" : "music-search-back"}
        >
          {activeCollection ? (
            <ChevronLeft size={22} color={theme.colors.foreground} />
          ) : (
            <ChevronDown size={22} color={theme.colors.foreground} />
          )}
        </Pressable>
        <View style={styles.inputWrap}>
          <Search size={16} color={muted} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => submitSearch()}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            returnKeyType="search"
            blurOnSubmit={false}
            placeholder="搜索歌手、歌曲、专辑…"
            placeholderTextColor={muted}
            style={styles.input}
            autoFocus={shouldAutoFocus}
            testID="music-search-input"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="搜索"
            onPress={() => submitSearch()}
            style={styles.enterBadge}
            testID="music-search-submit"
          >
            <CornerDownLeft size={14} color={muted} />
          </Pressable>
        </View>
      </View>

      {showConditionChips ? (
        <SearchConditionChips
          history={searchHistory}
          onSelectHistory={handleHistorySelect}
          onRemoveHistory={removeSearchHistory}
          filterPlatforms={filterPlatforms}
          selectedProviderIds={searchProviderIds}
          sourcesOpen={sourcesOpen}
          onToggleSourcesOpen={toggleSourcesOpen}
          onCloseSources={closeSources}
          onToggleProvider={toggleSearchProviderId}
          onInteract={keepConditionChipsVisible}
        />
      ) : null}

      <View style={styles.tabsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          style={styles.tabsScroll}
        >
          {SCOPES.map((item) => {
            const active = item.id === scope;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => setScope(item.id)}
                style={[styles.tab, active ? styles.tabActive : null]}
                testID={`music-search-scope-${item.id}`}
              >
                <Text style={[styles.tabText, active ? { color: accent } : null]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.tabsTrailing}>
          {typeof __DEV__ !== "undefined" && __DEV__ ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={debugPanelOpen ? "隐藏搜索调试面板" : "显示搜索调试面板"}
              onPress={() => setDebugPanelOpen((open) => !open)}
              style={[styles.refreshHit, debugPanelOpen ? styles.debugHitActive : null]}
              testID="music-search-debug-toggle"
            >
              <Bug size={16} color={debugPanelOpen ? accent : muted} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={refreshA11yLabel}
            onPress={handleRefreshSearch}
            disabled={refreshBusy && loadingPhase !== "idle"}
            style={styles.refreshHit}
            testID="music-search-refresh"
          >
            <SpinningRefreshIcon spinning={refreshBusy} color={muted} size={16} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={resultsScrollRef}
        style={styles.results}
        contentContainerStyle={styles.resultsContent}
        scrollEventThrottle={16}
        onScroll={(event) => {
          if (skipScrollPersistRef.current) {
            skipScrollPersistRef.current = false;
            return;
          }
          const y = event.nativeEvent.contentOffset.y;
          liveScrollYRef.current = y;
          // 合集详情内滚动不写回主列表持久化位置
          if (activeCollection) {
            return;
          }
          // 滚动位置防抖写入，避免每次 scroll 打 persist/sync 引发重挂载重搜
          if (scrollPersistTimerRef.current) {
            clearTimeout(scrollPersistTimerRef.current);
          }
          scrollPersistTimerRef.current = setTimeout(() => {
            scrollPersistTimerRef.current = null;
            setSearchResultsScrollY(y);
          }, 320);
        }}
        onContentSizeChange={() => {
          if (!restoreScrollOnceRef.current) {
            return;
          }
          const y = persistedScrollY;
          if (y <= 0) {
            restoreScrollOnceRef.current = false;
            return;
          }
          restoreScrollOnceRef.current = false;
          skipScrollPersistRef.current = true;
          requestAnimationFrame(() => {
            resultsScrollRef.current?.scrollTo({ y, animated: false });
          });
        }}
      >
        {resultsBody}
      </ScrollView>
    </View>
  );
}

const SONG_COVER_SIZE = 56;
/** 音乐人 / 专辑 / 歌单封面：歌曲封面的两倍，便于对比观感 */
const SQUARE_COVER_SIZE = SONG_COVER_SIZE * 2;

function SongCoverThumb(props: { coverUrl?: string }) {
  const [failed, setFailed] = useState(false);
  const uri = coverUrlForThumb(props.coverUrl?.trim() || "");
  useEffect(() => {
    setFailed(false);
  }, [uri]);
  if (!uri || failed) {
    return (
      <View style={styles.songCoverFallback}>
        <Text style={styles.rowCoverGlyph}>♪</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.songCoverImage}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

function MediaCoverThumb(props: {
  coverUrl?: string;
  sizeStyle: "media" | "avatar" | "square";
  size?: number;
  /** 正方形铺满父容器（宽 100% + aspectRatio 1） */
  fill?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const uri = coverUrlForThumb(props.coverUrl?.trim() || "") || undefined;
  const squareSize = props.size ?? 96;
  let imageStyle;
  let fallbackStyle;
  if (props.sizeStyle === "square" && props.fill) {
    imageStyle = styles.squareCoverImageFill;
    fallbackStyle = styles.squareCoverFallbackFill;
  } else if (props.sizeStyle === "square") {
    imageStyle = [styles.squareCoverImage, { width: squareSize, height: squareSize }];
    fallbackStyle = [styles.squareCoverFallback, { width: squareSize, height: squareSize }];
  } else if (props.sizeStyle === "avatar") {
    imageStyle = styles.avatarImage;
    fallbackStyle = styles.avatarCircle;
  } else {
    imageStyle = styles.mediaCoverImage;
    fallbackStyle = styles.mediaCoverFallback;
  }
  if (!uri || failed) {
    return (
      <View style={fallbackStyle}>
        <Text style={styles.rowCoverGlyph}>{props.sizeStyle === "avatar" ? "♫" : "♪"}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={imageStyle}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

function SongTableSection(props: {
  tracks: SearchHitTrack[];
  hasMore?: boolean;
  loadingMore?: boolean;
  onSelect: (hit: SearchHitTrack) => void;
  onPlayNext?: (hit: SearchHitTrack) => void;
  onEnqueue?: (hit: SearchHitTrack) => void;
  onSave?: (hit: SearchHitTrack) => void;
  onLoadMore?: () => void;
}) {
  const canLoadMore = Boolean(props.hasMore && props.onLoadMore);
  let footerLabel: string | undefined;
  if (canLoadMore) {
    footerLabel = props.loadingMore ? "加载中…" : "加载更多歌曲";
  }
  return (
    <SearchSectionCard
      title="歌曲"
      footerLabel={footerLabel}
      onFooterPress={canLoadMore && !props.loadingMore ? props.onLoadMore : undefined}
    >
      <SongTable
        tracks={props.tracks}
        onSelect={props.onSelect}
        onPlayNext={props.onPlayNext}
        onEnqueue={props.onEnqueue}
        onSave={props.onSave}
      />
    </SearchSectionCard>
  );
}

function SearchSectionCard(props: {
  title: string;
  children: ReactNode;
  footerLabel?: string;
  onFooterPress?: () => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      {props.children}
      {props.footerLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={props.footerLabel}
          onPress={props.onFooterPress}
          style={styles.sectionFooter}
        >
          <Text style={styles.sectionFooterText}>{props.footerLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SongTable(props: {
  tracks: SearchHitTrack[];
  onSelect: (hit: SearchHitTrack) => void;
  onPlayNext?: (hit: SearchHitTrack) => void;
  onEnqueue?: (hit: SearchHitTrack) => void;
  onSave?: (hit: SearchHitTrack) => void;
}) {
  const { theme, rt } = useUnistyles();
  // xs/sm = 移动端单列（YTM 列表感）；桌面双列提高密度。
  const isCompact = rt.breakpoint === "xs" || rt.breakpoint === "sm";
  const columns = isCompact ? 1 : 2;
  // 订阅曲库：本地落盘变化时刷新「已下载」角标
  useMusicDemoStore((state) => state.tracks);
  // 整机 ActionBar：bar 外露 + 三点 + surface 右键/长按 + showBarLabels + 编辑布局
  const ActionBar = getMusicHostApi().ui.ActionBar as ComponentType<WorkspaceAppActionBarProps>;
  const { layout: searchMenuLayout, openEditLayout } = useMusicSearchHitMenuLayout();

  const handleMenuSelect = useCallback(
    (id: string, hit: SearchHitTrack) => {
      const action = id as MusicSearchHitMenuActionId;
      if (action === "play") {
        props.onSelect(hit);
        return;
      }
      if (action === "playNext") {
        props.onPlayNext?.(hit);
        return;
      }
      if (action === "addPlaylist") {
        props.onEnqueue?.(hit);
        return;
      }
      if (action === "saveSong") {
        void props.onSave?.(hit);
      }
    },
    [props],
  );

  const buildHitActions = useCallback(
    (hit: SearchHitTrack): WorkspaceAppActionContribution[] =>
      MUSIC_SEARCH_HIT_MENU_IDS.map((id) => ({
        id,
        label: MUSIC_SEARCH_HIT_MENU_ACTION_LABELS[id],
        tipLabel: MUSIC_SEARCH_HIT_MENU_ACTION_LABELS[id],
        icon: MUSIC_SEARCH_HIT_MENU_ICONS[id],
        onPress: () => handleMenuSelect(id, hit),
      })),
    [handleMenuSelect],
  );

  if (props.tracks.length === 0) {
    return <Text style={styles.emptyBlock}>暂无结果</Text>;
  }
  const gap = isCompact ? 4 : 10;
  return (
    <View
      style={[
        styles.songTileGrid,
        {
          gap,
          display: "grid",
          gridTemplateColumns: columns <= 1 ? "1fr" : "1fr 1fr",
        } as Record<string, string | number>,
      ]}
    >
      {props.tracks.map((hit, index) => {
        const downloaded = isSearchHitDownloadedLocally(hit);
        const pinned = isSearchHitPinnedLocally(hit);
        const artist = displaySearchArtist(hit.artist);
        const duration = formatDuration(hit.durationMs);
        const metaA11y = [artist, duration !== "—" ? duration : null].filter(Boolean).join("，");
        const rowKey = `${hit.ref.providerId}:${hit.ref.remoteId}:${index}`;
        const surface = (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`播放 ${hit.title}，${metaA11y || "—"}${downloaded ? "，已下载" : ""}${pinned ? "，已置顶" : ""}`}
            onPress={() => props.onSelect(hit)}
            style={styles.songRowSurface}
            testID={`music-search-hit-${hit.ref.remoteId}-${index}`}
          >
            <View style={styles.songCoverWrap}>
              <SongCoverThumb coverUrl={hit.coverUrl} />
              <View style={styles.songPlatformBadge} pointerEvents="none">
                <MusicProviderBrandIcon providerId={hit.ref.providerId} size="sm" />
              </View>
            </View>
            <View style={styles.songMediaMeta}>
              <Text style={styles.songTitleText} numberOfLines={1}>
                {hit.title}
              </Text>
              <View style={styles.songMetaRow}>
                <Text style={styles.songMetaText} numberOfLines={1}>
                  {artist || "—"}
                </Text>
                {downloaded ? (
                  <View style={styles.songMetaIconWrap} accessibilityLabel="已下载到本地曲库">
                    <HardDrive size={12} color={theme.colors.accent} />
                  </View>
                ) : null}
                {pinned ? (
                  <View style={styles.songMetaIconWrap} accessibilityLabel="已置顶">
                    <Pin size={12} color="#EAB308" fill="#EAB308" />
                  </View>
                ) : null}
                {duration !== "—" ? (
                  <Text style={styles.songMetaDuration} numberOfLines={1}>
                    {` · ${duration}`}
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
        return (
          <View key={rowKey} style={[styles.songTile, isCompact ? styles.songTileCompact : null]}>
            <ActionBar
              layout={searchMenuLayout}
              actions={buildHitActions(hit)}
              shortcutEntityMenu={{
                appId: MUSIC_APP_ID,
                menuId: MUSIC_SEARCH_HIT_MENU_ID,
              }}
              surface={surface}
              distribute="end"
              iconSize={16}
              mutedColor={theme.colors.foregroundMuted}
              accentColor={theme.colors.accent}
              testID={`music-search-hit-menu-${hit.ref.remoteId}-${index}`}
              overflowMenu={{
                side: "bottom",
                align: "end",
                moreLabel: `更多操作 ${hit.title}`,
                showEditLayout: true,
                editLayoutLabel: "编辑布局",
                onEditLayout: openEditLayout,
                testID: `music-search-hit-overflow-${hit.ref.remoteId}-${index}`,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

const SQUARE_GRID_GAP = 12;

function SquareHitGrid(props: {
  items: Array<{
    key: string;
    coverUrl?: string;
    providerId: string;
    title: string;
    meta?: string | null;
  }>;
  onOpen: (index: number) => void;
  onPlayAll?: (index: number) => void;
  onEnqueue?: (index: number) => void;
}) {
  const { rt } = useUnistyles();
  const isCompact = rt.breakpoint === "xs" || rt.breakpoint === "sm";
  const ActionBar = getMusicHostApi().ui.ActionBar as ComponentType<WorkspaceAppActionBarProps>;
  const { layout: collectionMenuLayout, openEditLayout } = useMusicSearchCollectionMenuLayout();

  const handleMenuSelect = useCallback(
    (id: string, index: number) => {
      const action = id as MusicSearchCollectionMenuActionId;
      if (action === "open") {
        props.onOpen(index);
        return;
      }
      if (action === "playAll") {
        props.onPlayAll?.(index);
        return;
      }
      if (action === "addPlaylist") {
        props.onEnqueue?.(index);
      }
    },
    [props],
  );

  const buildCollectionActions = useCallback(
    (index: number): WorkspaceAppActionContribution[] =>
      MUSIC_SEARCH_COLLECTION_MENU_IDS.map((id) => ({
        id,
        label: MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS[id],
        tipLabel: MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS[id],
        icon: MUSIC_SEARCH_COLLECTION_MENU_ICONS[id],
        onPress: () => handleMenuSelect(id, index),
      })),
    [handleMenuSelect],
  );

  if (props.items.length === 0) {
    return <Text style={styles.emptyBlock}>暂无结果</Text>;
  }
  // 移动端强制一行 3 个；桌面保持固定封面自然换行
  const mobileThreeCol = isCompact;
  const cover = SQUARE_COVER_SIZE;
  return (
    <View
      style={[
        styles.squareGrid,
        mobileThreeCol
          ? ({
              gap: SQUARE_GRID_GAP,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
            } as Record<string, string | number>)
          : styles.squareGridDesktop,
      ]}
    >
      {props.items.map((item, index) => {
        const surface = (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => props.onOpen(index)}
            style={styles.squareCardSurface}
            testID={`music-search-square-card-${index}`}
          >
            {mobileThreeCol ? (
              <View style={styles.squareCoverFill}>
                <MediaCoverThumb coverUrl={item.coverUrl} sizeStyle="square" size={cover} fill />
                <View style={styles.squarePlatformBadge} pointerEvents="none">
                  <MusicProviderBrandIcon providerId={item.providerId} size="sm" />
                </View>
              </View>
            ) : (
              <View style={[styles.squareCoverWrap, { width: cover, height: cover }]}>
                <MediaCoverThumb coverUrl={item.coverUrl} sizeStyle="square" size={cover} />
                <View style={styles.squarePlatformBadge} pointerEvents="none">
                  <MusicProviderBrandIcon providerId={item.providerId} size="sm" />
                </View>
              </View>
            )}
            <Text style={styles.squareCardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.meta ? (
              <Text style={styles.squareCardMeta} numberOfLines={1}>
                {item.meta}
              </Text>
            ) : null}
          </Pressable>
        );
        return (
          <View
            key={item.key}
            style={mobileThreeCol ? styles.squareCard : [styles.squareCard, { width: cover }]}
          >
            <ActionBar
              layout={collectionMenuLayout}
              actions={buildCollectionActions(index)}
              shortcutEntityMenu={{
                appId: MUSIC_APP_ID,
                menuId: MUSIC_SEARCH_COLLECTION_MENU_ID,
              }}
              surface={surface}
              surfaceLayout="card"
              distribute="end"
              iconSize={16}
              mutedColor="#fff"
              accentColor="#fff"
              testID={`music-search-square-menu-${index}`}
              barButtonStyle={(state: { hovered?: boolean; pressed?: boolean }) =>
                state.hovered || state.pressed ? styles.collectionChromeHitActive : undefined
              }
              overflowMenu={{
                side: "bottom",
                align: "end",
                moreLabel: `更多操作 ${item.title}`,
                showEditLayout: true,
                editLayoutLabel: "编辑布局",
                onEditLayout: openEditLayout,
                triggerColor: "#fff",
                triggerStyle: (state: { hovered?: boolean; pressed?: boolean; open?: boolean }) =>
                  state.hovered || state.pressed || state.open
                    ? styles.collectionChromeHitActive
                    : undefined,
                testID: `music-search-square-overflow-${index}`,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

function ArtistList(props: {
  artists: SearchHitArtist[];
  onOpen: (artist: SearchHitArtist) => void;
  onPlayAll?: (artist: SearchHitArtist) => void;
  onEnqueue?: (artist: SearchHitArtist) => void;
}) {
  const artists = props.artists;
  return (
    <SquareHitGrid
      items={artists.map((artist, index) => ({
        key: `${artist.ref.providerId}:${artist.ref.remoteId}:${index}`,
        coverUrl: artist.coverUrl,
        providerId: artist.ref.providerId,
        title: artist.name,
        meta: artist.trackCount && artist.trackCount > 0 ? `${artist.trackCount} 首` : null,
      }))}
      onOpen={(index) => {
        const artist = artists[index];
        if (artist) {
          props.onOpen(artist);
        }
      }}
      onPlayAll={(index) => {
        const artist = artists[index];
        if (artist) {
          props.onPlayAll?.(artist);
        }
      }}
      onEnqueue={(index) => {
        const artist = artists[index];
        if (artist) {
          props.onEnqueue?.(artist);
        }
      }}
    />
  );
}

function AlbumList(props: {
  albums: SearchHitAlbum[];
  onOpen: (album: SearchHitAlbum) => void;
  onPlayAll?: (album: SearchHitAlbum) => void;
  onEnqueue?: (album: SearchHitAlbum) => void;
}) {
  const albums = props.albums;
  return (
    <SquareHitGrid
      items={albums.map((album, index) => ({
        key: `${album.ref.providerId}:${album.ref.remoteId}:${index}`,
        coverUrl: album.coverUrl,
        providerId: album.ref.providerId,
        title: album.title,
        meta:
          album.artist?.trim() ||
          (album.trackCount && album.trackCount > 0 ? `${album.trackCount} 首` : null),
      }))}
      onOpen={(index) => {
        const album = albums[index];
        if (album) {
          props.onOpen(album);
        }
      }}
      onPlayAll={(index) => {
        const album = albums[index];
        if (album) {
          props.onPlayAll?.(album);
        }
      }}
      onEnqueue={(index) => {
        const album = albums[index];
        if (album) {
          props.onEnqueue?.(album);
        }
      }}
    />
  );
}

function PlaylistList(props: {
  playlists: SearchHitPlaylist[];
  onOpen: (playlist: SearchHitPlaylist) => void;
  onPlayAll?: (playlist: SearchHitPlaylist) => void;
  onEnqueue?: (playlist: SearchHitPlaylist) => void;
}) {
  const playlists = props.playlists;
  return (
    <SquareHitGrid
      items={playlists.map((playlist, index) => ({
        key: `${playlist.ref.providerId}:${playlist.ref.remoteId}:${index}`,
        coverUrl: playlist.coverUrl,
        providerId: playlist.ref.providerId,
        title: playlist.title,
        meta:
          playlist.creator?.trim() ||
          (playlist.trackCount && playlist.trackCount > 0 ? `${playlist.trackCount} 首` : null),
      }))}
      onOpen={(index) => {
        const playlist = playlists[index];
        if (playlist) {
          props.onOpen(playlist);
        }
      }}
      onPlayAll={(index) => {
        const playlist = playlists[index];
        if (playlist) {
          props.onPlayAll?.(playlist);
        }
      }}
      onEnqueue={(index) => {
        const playlist = playlists[index];
        if (playlist) {
          props.onEnqueue?.(playlist);
        }
      }}
    />
  );
}

function formatDuration(durationMs?: number): string {
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
    return "—";
  }
  const totalSec = Math.floor(durationMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  // 与主流播放器一致：2:22，而不是 02:22
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** 平台名不能当艺人展示（缓存里可能仍是旧的 Soundstripe / Pixabay） */
function displaySearchArtist(artist: string | undefined): string | null {
  const raw = artist?.trim() ?? "";
  if (!raw || /^(pixabay|sound\s*stripe|soundstripe|未知|未知艺人)$/i.test(raw)) {
    return null;
  }
  return raw;
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    minHeight: 0,
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingTop: theme.spacing[1],
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  backHit: {
    // 与播放器 topLeadingChrome 同位（40×40，左 padding 由 root 承担）
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    height: 40,
    borderRadius: 999,
    backgroundColor: theme.colors.surface2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    padding: 0,
  },
  historyScroll: {
    flexGrow: 0,
  },
  conditionChipsRoot: {
    gap: theme.spacing[1],
  },
  chipWrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingBottom: theme.spacing[1],
  },
  historyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    maxWidth: 180,
    flexShrink: 0,
    borderRadius: 999,
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: theme.spacing[2],
    minHeight: 28,
  },
  historyChipArmed: {
    backgroundColor: theme.colors.palette?.red?.[500] ?? "#ef4444",
  },
  historyChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    flexShrink: 1,
  },
  historyChipTextArmed: {
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium,
  },
  sourceSummaryChip: {
    maxWidth: 9999,
  },
  sourceChipOpen: {
    backgroundColor: theme.colors.surface1,
  },
  sourcePickChipSelected: {
    backgroundColor: theme.colors.surface1,
    borderWidth: RNStyleSheet.hairlineWidth,
    borderColor: theme.colors.accent,
  },
  providerChevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
  enterBadge: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface1,
  },
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  tabsTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    marginLeft: "auto",
    flexGrow: 0,
    flexShrink: 0,
  },
  refreshHit: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  debugHitActive: {
    backgroundColor: theme.colors.surface2,
  },
  songCoverImage: {
    width: "100%",
    height: "100%",
  },
  songCoverFallback: {
    width: "100%",
    height: "100%",
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  songCoverWrap: {
    width: SONG_COVER_SIZE,
    height: SONG_COVER_SIZE,
    position: "relative",
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: theme.colors.surface3,
  },
  songPlatformBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: RNStyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.35)",
    backgroundColor: "rgba(20,20,22,0.92)",
  },
  songTileGrid: {
    width: "100%",
    alignSelf: "stretch",
  },
  songTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    paddingRight: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  songTileCompact: {
    // 移动端更接近 YTM：更扁、背景更轻，靠分隔感而不是重卡片
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[1],
    backgroundColor: "transparent",
    borderRadius: theme.borderRadius.sm,
  },
  songMediaMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: "center",
  },
  songRowSurface: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  songMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    minWidth: 0,
    gap: 4,
  },
  songMetaIconWrap: {
    flexGrow: 0,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  songTitleText: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium,
    lineHeight: 20,
  },
  songMetaText: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    lineHeight: 16,
  },
  songMetaDuration: {
    flexGrow: 0,
    flexShrink: 0,
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    lineHeight: 16,
  },
  songArtistText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  squareGrid: {
    width: "100%",
    alignSelf: "stretch",
  },
  squareGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[3],
  },
  squareCard: {
    gap: theme.spacing[1],
    minWidth: 0,
    alignItems: "center",
  },
  squareCardSurface: {
    width: "100%",
    gap: theme.spacing[1],
    minWidth: 0,
    alignItems: "center",
  },
  squareCoverWrap: {
    position: "relative",
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
    alignSelf: "center",
  },
  squareCoverFill: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.surface3,
  },
  squareCoverImageFill: {
    width: "100%",
    height: "100%",
  },
  squareCoverFallbackFill: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface3,
  },
  squarePlatformBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: RNStyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.35)",
    backgroundColor: "rgba(20,20,22,0.92)",
  },
  squareCoverImage: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
  },
  squareCoverFallback: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  squareCardTitle: {
    width: "100%",
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium,
    textAlign: "center",
  },
  squareCardMeta: {
    width: "100%",
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
  },
  // 合集封面 chrome：Music 本地；默认透明不挡封面，悬停/按下才 scrim
  collectionChromeHitActive: {
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingVertical: theme.spacing[1],
  },
  tab: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
  },
  tabActive: {
    backgroundColor: theme.colors.surface2,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    fontWeight: theme.fontWeight.medium,
  },
  results: {
    flex: 1,
    minHeight: 0,
  },
  resultsContent: {
    gap: theme.spacing[1],
    paddingBottom: theme.spacing[2],
  },
  sections: {
    gap: theme.spacing[3],
  },
  collectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  collectionCoverWrap: {
    position: "relative",
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
  },
  collectionMeta: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing[1],
  },
  collectionKind: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
  collectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  collectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  collectionCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
  collectionHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    lineHeight: 18,
  },
  collectionEmptyActions: {
    gap: theme.spacing[2],
    alignItems: "flex-start",
  },
  collectionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
    marginTop: theme.spacing[1],
  },
  collectionActionBtn: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
  },
  collectionActionBtnMuted: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium,
  },
  collectionSearchCta: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
  },
  collectionSearchCtaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.medium,
  },
  sectionCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[2],
  },
  sectionTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  sectionFooter: {
    paddingTop: theme.spacing[1],
  },
  sectionFooterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  hintCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[4],
    gap: theme.spacing[2],
  },
  hintTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  hint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
  },
  emptyBlock: {
    paddingVertical: theme.spacing[3],
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  errorCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    gap: theme.spacing[1],
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.palette?.red?.[500] ?? theme.colors.foregroundMuted,
  },
  debugUrlCard: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: RNStyleSheet.hairlineWidth,
    borderColor: theme.colors.palette?.red?.[300] ?? theme.colors.border,
    backgroundColor: theme.colors.surface1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    gap: theme.spacing[2],
  },
  debugUrlHeading: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.palette?.red?.[500] ?? "#ef4444",
  },
  debugUrlBlock: {
    gap: 2,
  },
  debugUrlLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.palette?.red?.[500] ?? "#ef4444",
  },
  debugUrlText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.palette?.red?.[500] ?? "#ef4444",
    lineHeight: 16,
  },
  debugUrlNote: {
    fontSize: 10,
    color: theme.colors.foregroundMuted,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[1],
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
  },
  avatarGlyph: {
    fontSize: 16,
    color: theme.colors.foregroundMuted,
  },
  avatarMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  avatarTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  avatarSub: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[1],
  },
  mediaCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCoverImage: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
  },
  mediaCoverFallback: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCoverGlyph: {
    fontSize: 16,
    color: theme.colors.foregroundMuted,
  },
  mediaMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mediaTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  mediaSub: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
}));
