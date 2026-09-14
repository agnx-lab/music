// 场景：Music Sub App 向 Agent 暴露曲库/队列/播放控制与搜索工具（Context VFS P6+）。
import type { WorkspaceAppHostApi } from "@getagnx/app-sdk";
import { MUSIC_APP_ID } from "./music-ids";
import { findBestLocalTrack, playMusicByQuery } from "./agent-play-query";
import { getMusicPlaybackAudio } from "./playback-engine";
import { applyMusicPlaybackIntent, ensureMusicPlaybackRuntime } from "./playback-runtime";
import { getMusicPlatformLabel } from "./resource/platform-registry";
import {
  getMusicProviderCapabilities,
  type MusicProviderCapabilities,
} from "./resource/provider-catalog";
import { listMusicProviders, searchPlayableMusic } from "./resource/service";
import {
  isMusicTrackDownloadedLocally,
  useMusicDemoStore,
  type DemoTrack,
  type MusicPlayMode,
} from "./store";

const DEFAULT_LIST_LIMIT = 30;
const MAX_LIST_LIMIT = 100;
const PLAY_MODES: readonly MusicPlayMode[] = ["sequence", "loop-one", "shuffle"];

function asObject(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asLimit(value: unknown, fallback = DEFAULT_LIST_LIMIT, max = MAX_LIST_LIMIT): number {
  const n = typeof value === "number" ? value : fallback;
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(1, Math.min(max, Math.floor(n)));
}

function asOffset(value: unknown): number {
  const n = typeof value === "number" ? value : 0;
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}

function asProviderIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const ids = value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

function resolveSearchProviderIds(explicit: unknown): string[] {
  return asProviderIds(explicit) ?? useMusicDemoStore.getState().searchProviderIds.slice();
}

function requireConfirm(input: Record<string, unknown>): Record<string, unknown> | null {
  if (input.confirm === true) {
    return null;
  }
  return {
    ok: false,
    error: "confirm_required",
    message: "Destructive action requires confirm: true",
  };
}

function resolveQueueIds(): string[] {
  const state = useMusicDemoStore.getState();
  const known = new Set(state.tracks.map((track) => track.id));
  const filtered = state.queueIds.filter((id) => known.has(id));
  if (filtered.length > 0) {
    return filtered;
  }
  return state.tracks.map((track) => track.id);
}

function summarizeTrack(track: DemoTrack): Record<string, unknown> {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album ?? null,
    sourceKind: track.sourceKind,
    pinned: Boolean(track.pinned),
    liked: Boolean(track.liked),
    bookmarked: Boolean(track.bookmarked),
    downloaded: isMusicTrackDownloadedLocally(track),
    providerId: track.remoteRef?.providerId ?? null,
    remoteId: track.remoteRef?.remoteId ?? null,
  };
}

function snapshotNowPlaying() {
  const state = useMusicDemoStore.getState();
  const track = state.nowPlayingId
    ? (state.tracks.find((item) => item.id === state.nowPlayingId) ?? null)
    : null;
  // 播放中 store 进度可能停在上一次 pause/seek；优先读 audio 实时秒数。
  const audio = getMusicPlaybackAudio();
  const liveSec =
    audio && state.nowPlayingId
      ? Math.max(0, Math.floor(audio.currentTime || 0))
      : state.playbackPositionSec;
  return {
    appId: MUSIC_APP_ID,
    nowPlayingId: state.nowPlayingId,
    wantsPlaying: state.wantsPlaying,
    playMode: state.playMode,
    volume: state.volume,
    muted: state.muted,
    playbackPositionSec: liveSec,
    track: track
      ? {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          sourceKind: track.sourceKind,
        }
      : null,
    queueCount: resolveQueueIds().length,
  };
}

export function listLibraryTool(raw?: unknown): Record<string, unknown> {
  const input = asObject(raw);
  const query = asOptionalString(input.query)?.toLowerCase() ?? "";
  const pinnedOnly = input.pinnedOnly === true;
  const limit = asLimit(input.limit);
  const offset = asOffset(input.offset);
  const state = useMusicDemoStore.getState();
  const filtered = state.tracks.filter((track) => {
    if (pinnedOnly && !track.pinned) {
      return false;
    }
    if (!query) {
      return true;
    }
    const hay = `${track.title} ${track.artist} ${track.album || ""}`.toLowerCase();
    return hay.includes(query);
  });
  const page = filtered.slice(offset, offset + limit).map(summarizeTrack);
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    total: filtered.length,
    offset,
    limit,
    tracks: page,
  };
}

export function listQueueTool(raw?: unknown): Record<string, unknown> {
  const input = asObject(raw);
  const limit = asLimit(input.limit, 50);
  const offset = asOffset(input.offset);
  const state = useMusicDemoStore.getState();
  const queueIds = resolveQueueIds();
  const tracks = queueIds
    .map((id) => state.tracks.find((track) => track.id === id))
    .filter((track): track is DemoTrack => track != null)
    .map((track, index) =>
      Object.assign(summarizeTrack(track), {
        queueIndex: index,
        isNowPlaying: track.id === state.nowPlayingId,
      }),
    );
  const page = tracks.slice(offset, offset + limit);
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    nowPlayingId: state.nowPlayingId,
    playMode: state.playMode,
    total: tracks.length,
    offset,
    limit,
    tracks: page,
  };
}

export function setPlayModeTool(raw?: unknown): Record<string, unknown> {
  const input = asObject(raw);
  const mode = asOptionalString(input.mode) as MusicPlayMode | undefined;
  if (!mode || !(PLAY_MODES as readonly string[]).includes(mode)) {
    return {
      ok: false,
      error: "invalid_mode",
      message: `mode must be one of: ${PLAY_MODES.join(", ")}`,
    };
  }
  useMusicDemoStore.getState().setPlayMode(mode);
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    playMode: useMusicDemoStore.getState().playMode,
  };
}

export function queueOpsTool(raw?: unknown): Record<string, unknown> {
  const input = asObject(raw);
  const action = asOptionalString(input.action);
  const trackId = asOptionalString(input.trackId);
  const store = useMusicDemoStore.getState();

  if (action === "clear") {
    store.setQueueIds([]);
    return {
      ok: true,
      appId: MUSIC_APP_ID,
      action: "clear",
      queueCount: resolveQueueIds().length,
      queueIds: resolveQueueIds(),
    };
  }

  if (action !== "add" && action !== "remove") {
    return {
      ok: false,
      error: "invalid_action",
      message: "action must be add | remove | clear",
    };
  }
  if (!trackId) {
    return { ok: false, error: "trackId_required", message: "trackId is required" };
  }

  if (action === "add") {
    const position = input.position === "next" || input.position === "end" ? input.position : "end";
    const ok = store.addToQueue(trackId, position);
    if (!ok) {
      return { ok: false, error: "unknown_track", message: `Unknown trackId: ${trackId}` };
    }
    return {
      ok: true,
      appId: MUSIC_APP_ID,
      action: "add",
      trackId,
      position,
      queueCount: resolveQueueIds().length,
      queueIds: resolveQueueIds(),
    };
  }

  const ok = store.removeFromQueue(trackId);
  if (!ok) {
    return {
      ok: false,
      error: "not_in_queue",
      message: `trackId not in queue: ${trackId}`,
    };
  }
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    action: "remove",
    trackId,
    queueCount: resolveQueueIds().length,
    queueIds: resolveQueueIds(),
    nowPlayingId: useMusicDemoStore.getState().nowPlayingId,
  };
}

export function trackOpsTool(raw?: unknown): Record<string, unknown> {
  const input = asObject(raw);
  const action = asOptionalString(input.action);
  const trackId = asOptionalString(input.trackId);
  if (!action || (action !== "pin" && action !== "unpin" && action !== "delete")) {
    return {
      ok: false,
      error: "invalid_action",
      message: "action must be pin | unpin | delete",
    };
  }
  if (!trackId) {
    return { ok: false, error: "trackId_required", message: "trackId is required" };
  }

  const store = useMusicDemoStore.getState();
  const track = store.getTrack(trackId);
  if (!track) {
    return { ok: false, error: "unknown_track", message: `Unknown trackId: ${trackId}` };
  }

  if (action === "delete") {
    const denied = requireConfirm(input);
    if (denied) {
      return denied;
    }
    const deleted = store.deleteTrack(trackId);
    return {
      ok: deleted,
      appId: MUSIC_APP_ID,
      action: "delete",
      trackId,
      message: deleted ? "已从本地曲库删除" : "删除失败",
      nowPlayingId: useMusicDemoStore.getState().nowPlayingId,
    };
  }

  if (action === "pin") {
    if (track.pinned) {
      return {
        ok: true,
        appId: MUSIC_APP_ID,
        action: "pin",
        trackId,
        pinned: true,
        changed: false,
      };
    }
    const pinned = store.togglePinned(trackId);
    return {
      ok: pinned === true,
      appId: MUSIC_APP_ID,
      action: "pin",
      trackId,
      pinned: true,
      changed: true,
    };
  }

  if (!track.pinned) {
    return {
      ok: true,
      appId: MUSIC_APP_ID,
      action: "unpin",
      trackId,
      pinned: false,
      changed: false,
    };
  }
  const pinned = store.togglePinned(trackId);
  return {
    ok: pinned === false,
    appId: MUSIC_APP_ID,
    action: "unpin",
    trackId,
    pinned: false,
    changed: true,
  };
}

function resolveTrackPlatformId(track: DemoTrack): string {
  return track.remoteRef?.providerId ?? (track.sourceKind === "local" ? "local" : "online");
}

function resolveLyricsDetailValue(track: DemoTrack, lyricsText: string): string | null {
  if (!lyricsText) {
    return null;
  }
  return track.lyricsUri?.trim() || "有歌词文本";
}

function summarizeAtmospherePalette(
  palette: DemoTrack["atmospherePalette"],
): Record<string, unknown> | null {
  if (!palette?.dark?.primary || !palette?.light?.primary) {
    return null;
  }
  return {
    dark: palette.dark,
    light: palette.light,
    coverKey: palette.coverKey,
    extractVersion: palette.extractVersion ?? null,
  };
}

function buildTrackDetailPayload(track: DemoTrack): Record<string, unknown> {
  const downloaded = isMusicTrackDownloadedLocally(track);
  const lyricsText = (track.lyrics || "").trim();
  const playUrl = track.sourceUri || null;
  const isLocalSource = downloaded || track.sourceKind === "local";
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    trackId: track.id,
    // 对齐 ⌥D 详情 sheet 可读字段
    title: track.title,
    artist: track.artist || "未知艺人",
    album: track.album || null,
    platform: getMusicPlatformLabel(resolveTrackPlatformId(track)),
    source: isLocalSource ? "本地文件" : "在线云播",
    sourceKind: track.sourceKind,
    pageUrl: track.remoteRef?.pageUrl ?? null,
    playUrl,
    localFile: downloaded ? playUrl : null,
    coverUri: track.coverUri ?? null,
    lyrics: resolveLyricsDetailValue(track, lyricsText),
    hasLyrics: Boolean(lyricsText),
    lyricsUri: track.lyricsUri ?? null,
    atmospherePalette: summarizeAtmospherePalette(track.atmospherePalette),
    pinned: Boolean(track.pinned),
    liked: Boolean(track.liked),
    bookmarked: Boolean(track.bookmarked),
    downloaded,
    remoteRef: track.remoteRef ?? null,
    updatedAt: track.updatedAt,
  };
}

export function getTrackDetailTool(raw?: unknown): Record<string, unknown> {
  const input = asObject(raw);
  const trackId = asOptionalString(input.trackId);
  if (!trackId) {
    return { ok: false, error: "trackId_required", message: "trackId is required" };
  }
  const track = useMusicDemoStore.getState().getTrack(trackId);
  if (!track) {
    return { ok: false, error: "unknown_track", message: `Unknown trackId: ${trackId}` };
  }
  return buildTrackDetailPayload(track);
}

export function getAppPrefsTool(): Record<string, unknown> {
  const state = useMusicDemoStore.getState();
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    // Cmd+I / View details 相关可读配置
    lyricsDensity: state.lyricsDensity,
    atmospherePushEnabled: state.atmospherePushEnabled,
    coverBackdropEnabled: state.coverBackdropEnabled,
    coverBackdropBlur: state.coverBackdropBlur,
    coverBackdropOpacity: state.coverBackdropOpacity,
    coverBackdropIncludeTabBar: state.coverBackdropIncludeTabBar,
    searchCacheTtlMinutes: state.searchCacheTtlMinutes,
    searchProviderIds: state.searchProviderIds.slice(),
    playMode: state.playMode,
    volume: state.volume,
    muted: state.muted,
    coverHidden: state.coverHidden,
    compactActionRailVisible: state.compactActionRailVisible,
    playerSurface: state.playerSurface,
    wantsPlaying: state.wantsPlaying,
    nowPlayingId: state.nowPlayingId,
    queueCount: resolveQueueIds().length,
    libraryCount: state.tracks.length,
  };
}

function providerTraitTags(cap: MusicProviderCapabilities | null): string[] {
  if (!cap) {
    return ["unknown"];
  }
  const tags: string[] = [];
  tags.push(`search:${cap.searchMode}`);
  tags.push(`resolve:${cap.resolveMode}`);
  tags.push(`playable:${cap.playablePolicy}`);
  if (cap.isAggregator) {
    tags.push("aggregator");
  }
  if (cap.browserSearch) {
    tags.push("browser-search");
  }
  if (cap.wiredForSearch) {
    tags.push("wired-for-search");
  }
  if (cap.listCollection && cap.listCollection !== "none") {
    tags.push(`collection:${cap.listCollection}`);
  }
  return tags;
}

export function listProvidersTool(): Record<string, unknown> {
  const selected = useMusicDemoStore.getState().searchProviderIds;
  const providers = listMusicProviders().map((provider) => {
    const cap = getMusicProviderCapabilities(provider.id);
    return {
      id: provider.id,
      label: provider.label,
      traits: providerTraitTags(cap),
      searchMode: cap?.searchMode ?? null,
      resolveMode: cap?.resolveMode ?? null,
      playablePolicy: cap?.playablePolicy ?? null,
      wiredForSearch: Boolean(cap?.wiredForSearch),
      isAggregator: Boolean(cap?.isAggregator),
      browserSearch: Boolean(cap?.browserSearch),
      notes: cap?.notes ?? null,
      selected: selected.includes(provider.id),
    };
  });
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    searchProviderIds: selected.slice(),
    providers,
    total: providers.length,
  };
}

export function setSearchProvidersTool(raw?: unknown): Record<string, unknown> {
  const input = asObject(raw);
  const providerIds = asProviderIds(input.providerIds);
  if (!providerIds) {
    return {
      ok: false,
      error: "providerIds_required",
      message: "providerIds must be a non-empty string array",
    };
  }
  useMusicDemoStore.getState().setSearchProviderIds(providerIds);
  const next = useMusicDemoStore.getState().searchProviderIds;
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    searchProviderIds: next.slice(),
  };
}

const MUSIC_TOOL_GROUP_PLAYBACK = {
  groupId: "playback",
  groupTitle: "播放",
} as const;
const MUSIC_TOOL_GROUP_LIBRARY = {
  groupId: "library",
  groupTitle: "曲库与队列",
} as const;
const MUSIC_TOOL_GROUP_SEARCH = {
  groupId: "search",
  groupTitle: "搜索与偏好",
} as const;

export function registerMusicAgentTools(host: WorkspaceAppHostApi): () => void {
  return host.registerAgentTools({
    appId: MUSIC_APP_ID,
    availability: "always",
    tools: [
      {
        name: "now_playing",
        ...MUSIC_TOOL_GROUP_PLAYBACK,
        description:
          "Read Music app now-playing state (track title/artist, play/pause intent, queue size).",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => snapshotNowPlaying(),
      },
      {
        name: "play",
        ...MUSIC_TOOL_GROUP_PLAYBACK,
        description:
          "Control Music playback. action=play|pause|toggle (default toggle). Optional trackId to switch track then play. For natural-language song requests prefer play_query.",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["play", "pause", "toggle"],
            },
            trackId: { type: "string" },
          },
          additionalProperties: false,
        },
        execute: async (raw) => {
          ensureMusicPlaybackRuntime();
          const input =
            raw && typeof raw === "object" ? (raw as { action?: string; trackId?: string }) : {};
          const store = useMusicDemoStore.getState();
          const trackId = typeof input.trackId === "string" ? input.trackId.trim() : "";
          if (trackId) {
            const exists = store.tracks.some((track) => track.id === trackId);
            if (!exists) {
              return { ok: false, error: `Unknown trackId: ${trackId}` };
            }
            store.setNowPlaying(trackId);
            const applied = await applyMusicPlaybackIntent(true);
            return {
              ok: true,
              action: "play",
              audioPaused: applied.audioPaused,
              ...snapshotNowPlaying(),
            };
          }
          const action =
            input.action === "play" || input.action === "pause" || input.action === "toggle"
              ? input.action
              : "toggle";
          let nextWants = !store.wantsPlaying;
          if (action === "play") {
            nextWants = true;
          } else if (action === "pause") {
            nextWants = false;
          }
          const applied = await applyMusicPlaybackIntent(nextWants);
          return {
            ok: true,
            action,
            audioPaused: applied.audioPaused,
            ...snapshotNowPlaying(),
          };
        },
      },
      {
        name: "list_library",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description:
          "List tracks in the local Music library. Optional query filter, pinnedOnly, limit/offset.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            pinnedOnly: { type: "boolean" },
            limit: { type: "number" },
            offset: { type: "number" },
          },
          additionalProperties: false,
        },
        execute: async (raw) => listLibraryTool(raw),
      },
      {
        name: "list_queue",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description: "List the current play queue in order (includes now-playing marker).",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number" },
            offset: { type: "number" },
          },
          additionalProperties: false,
        },
        execute: async (raw) => listQueueTool(raw),
      },
      {
        name: "set_play_mode",
        ...MUSIC_TOOL_GROUP_PLAYBACK,
        description: "Set play mode: sequence | loop-one | shuffle.",
        inputSchema: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["sequence", "loop-one", "shuffle"] },
          },
          required: ["mode"],
          additionalProperties: false,
        },
        execute: async (raw) => setPlayModeTool(raw),
      },
      {
        name: "queue_ops",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description:
          "Mutate the play queue. action=add|remove|clear. add/remove need trackId; add supports position=end|next.",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["add", "remove", "clear"] },
            trackId: { type: "string" },
            position: { type: "string", enum: ["end", "next"] },
          },
          required: ["action"],
          additionalProperties: false,
        },
        execute: async (raw) => queueOpsTool(raw),
      },
      {
        name: "track_ops",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description:
          "Library track ops: pin | unpin | delete. delete requires confirm:true (destructive).",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["pin", "unpin", "delete"] },
            trackId: { type: "string" },
            confirm: { type: "boolean" },
          },
          required: ["action", "trackId"],
          additionalProperties: false,
        },
        execute: async (raw) => trackOpsTool(raw),
      },
      {
        name: "get_track_detail",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description:
          "Read one track's detail fields aligned with ⌥D sheet (title/artist/album/platform/source/urls/lyrics/palette).",
        inputSchema: {
          type: "object",
          properties: {
            trackId: { type: "string" },
          },
          required: ["trackId"],
          additionalProperties: false,
        },
        execute: async (raw) => getTrackDetailTool(raw),
      },
      {
        name: "get_app_prefs",
        ...MUSIC_TOOL_GROUP_SEARCH,
        description:
          "Read Music app preferences (lyricsDensity, searchProviderIds, playMode, immersion, search cache TTL, etc.).",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => getAppPrefsTool(),
      },
      {
        name: "list_providers",
        ...MUSIC_TOOL_GROUP_SEARCH,
        description:
          "List music search/playback providers with trait tags (search/resolve/playable/aggregator/browser).",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => listProvidersTool(),
      },
      {
        name: "set_search_providers",
        ...MUSIC_TOOL_GROUP_SEARCH,
        description:
          "Set which providers are enabled for search (persisted searchProviderIds). Pass providerIds array.",
        inputSchema: {
          type: "object",
          properties: {
            providerIds: {
              type: "array",
              items: { type: "string" },
              description: 'e.g. ["local","netease","qq"]',
            },
          },
          required: ["providerIds"],
          additionalProperties: false,
        },
        execute: async (raw) => setSearchProvidersTool(raw),
      },
      {
        name: "search_tracks",
        ...MUSIC_TOOL_GROUP_SEARCH,
        description:
          "Search tracks by keyword. Checks local library hits first in results (localTrackId), then online providers. Optional providerIds overrides store searchProviderIds. Use play_query to search+download+play in one step.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search text, e.g. 春日" },
            limit: { type: "number", description: "Max tracks to return (default 10, max 30)" },
            localOnly: {
              type: "boolean",
              description: "If true, only match local library without online search",
            },
            providerIds: {
              type: "array",
              items: { type: "string" },
              description: "Optional provider filter; defaults to store searchProviderIds",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
        execute: async (raw) => {
          const input =
            raw && typeof raw === "object"
              ? (raw as {
                  query?: string;
                  limit?: number;
                  localOnly?: boolean;
                  providerIds?: string[];
                })
              : {};
          const query = typeof input.query === "string" ? input.query.trim() : "";
          if (!query) {
            return { ok: false, error: "query is required" };
          }
          const limitRaw = typeof input.limit === "number" ? input.limit : 10;
          const limit = Math.max(1, Math.min(30, Math.floor(limitRaw)));
          const providerIds = resolveSearchProviderIds(input.providerIds);

          if (input.localOnly) {
            const local = findBestLocalTrack(query);
            const store = useMusicDemoStore.getState();
            const tokens = query
              .toLowerCase()
              .split(/[\s,，、/+]+/)
              .filter((token) => token.length >= 1);
            const matched = store.tracks
              .filter((track) => {
                const hay = `${track.title} ${track.artist} ${track.album || ""}`.toLowerCase();
                return tokens.some((token) => hay.includes(token));
              })
              .slice(0, limit)
              .map((track) => ({
                title: track.title,
                artist: track.artist,
                album: track.album,
                trackId: track.id,
                source: "local" as const,
                local: true,
              }));
            return {
              ok: true,
              query,
              localOnly: true,
              bestLocalTrackId: local?.id ?? null,
              tracks: matched,
              total: matched.length,
            };
          }

          const page = await searchPlayableMusic({
            text: query,
            scope: "track",
            limit,
            page: 1,
            providerIds,
          });
          const tracks = page.tracks.slice(0, limit).map((hit) => ({
            title: hit.title,
            artist: hit.artist,
            album: hit.album,
            providerId: hit.ref.providerId,
            remoteId: hit.ref.remoteId,
            localTrackId: hit.localTrackId ?? null,
            playable: Boolean(hit.playableUrl || hit.localTrackId),
            source: hit.localTrackId ? ("local" as const) : ("online" as const),
          }));
          return {
            ok: true,
            query,
            providerIds,
            tracks,
            total: tracks.length,
            hasMore: Boolean(page.hasMore),
            providerErrors: page.providerErrors ?? [],
          };
        },
      },
      {
        name: "play_query",
        ...MUSIC_TOOL_GROUP_PLAYBACK,
        description:
          "Play a song by natural-language query [scorer=v2-stopwords]. Priority: (1) match local library, (2) online search, (3) download to local when possible, (4) play. Optional providerIds overrides store searchProviderIds.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Song title / mood / keywords, e.g. 春日、晴天、周杰伦",
            },
            preferLocalOnly: {
              type: "boolean",
              description: "Only use local library; do not search online",
            },
            download: {
              type: "boolean",
              description: "Download online hit to local storage before play (default true)",
            },
            providerIds: {
              type: "array",
              items: { type: "string" },
              description: "Optional provider filter; defaults to store searchProviderIds",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
        execute: async (raw) => {
          const input =
            raw && typeof raw === "object"
              ? (raw as {
                  query?: string;
                  preferLocalOnly?: boolean;
                  download?: boolean;
                  providerIds?: string[];
                })
              : {};
          const query = typeof input.query === "string" ? input.query.trim() : "";
          if (!query) {
            return { ok: false, error: "query is required" };
          }
          return playMusicByQuery({
            host,
            query,
            preferLocalOnly: Boolean(input.preferLocalOnly),
            download: input.download !== false,
            providerIds: resolveSearchProviderIds(input.providerIds),
          });
        },
      },
    ],
  });
}
