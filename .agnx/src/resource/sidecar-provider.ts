// 场景：可选 go-music-api / go-music-dl Sidecar 搜索 Provider（默认仅在配置 baseUrl 时启用）。
import { coverUrlForStorage } from "../cover-url-quality";
import type {
  MusicResourceProvider,
  ResolvedLyrics,
  ResolvedPlayable,
  SearchDebugRequest,
  SearchHitAlbum,
  SearchHitArtist,
  SearchHitPlaylist,
  SearchHitTrack,
  SearchQuery,
  SearchResultPage,
} from "./types";
import {
  buildSidecarCollectionUrl,
  buildSidecarResolveRequest,
  buildSidecarSearchRequest,
  normalizeThirdPartySearchPayload,
  resolveSidecarSearchKinds,
  type MusicSidecarSearchKind,
} from "./sidecar-contract";
import { getMusicSidecarBaseUrl } from "./sidecar-config";
import { fetchMusicSidecarJson } from "./sidecar-fetch";
import type { ListCollectionPage, ListCollectionQuery, RemoteRef } from "./types";

interface SidecarSearchEntry {
  id?: string | number;
  song_id?: string | number;
  album_id?: string | number;
  playlist_id?: string | number;
  artist_id?: string | number;
  source?: string;
  platform?: string;
  title?: string;
  name?: string;
  song_name?: string;
  artist?: string;
  artists?: Array<{ name?: string } | string> | string;
  singer?: string;
  author?: string;
  album?: string | { name?: string; title?: string; pic?: string; cover?: string; image?: string };
  album_name?: string;
  cover?: string | { url?: string; src?: string };
  cover_url?: string;
  pic?: string | { url?: string; src?: string };
  pic_url?: string;
  image?: string | { url?: string; src?: string };
  al?: { picUrl?: string; pic_url?: string; name?: string };
  duration?: number;
  duration_ms?: number;
  interval?: number;
  count?: number;
  track_count?: number;
  song_count?: number;
  creator?: string;
  author_name?: string;
  album_artist?: string;
  artist_name?: string;
  ar?: Array<{ name?: string } | string>;
}

function emptyPage(query: SearchQuery): SearchResultPage {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: [],
  };
}

function toRemoteId(entry: SidecarSearchEntry): string {
  const value =
    entry.song_id ?? entry.album_id ?? entry.playlist_id ?? entry.artist_id ?? entry.id ?? "";
  return String(value || "").trim();
}

function toProviderId(entry: SidecarSearchEntry): string {
  const providerId = String(entry.source ?? entry.platform ?? "sidecar").trim();
  return providerId || "sidecar";
}

function toArtist(entry: SidecarSearchEntry): string {
  if (typeof entry.artist === "string" && entry.artist.trim()) {
    return entry.artist.trim();
  }
  if (typeof entry.singer === "string" && entry.singer.trim()) {
    return entry.singer.trim();
  }
  if (typeof entry.author === "string" && entry.author.trim()) {
    return entry.author.trim();
  }
  if (typeof entry.album_artist === "string" && entry.album_artist.trim()) {
    return entry.album_artist.trim();
  }
  if (typeof entry.artist_name === "string" && entry.artist_name.trim()) {
    return entry.artist_name.trim();
  }
  if (Array.isArray(entry.artists)) {
    return entry.artists
      .map((item) => (typeof item === "string" ? item : (item?.name ?? "")))
      .map((item) => item.trim())
      .filter(Boolean)
      .join(" / ");
  }
  if (Array.isArray(entry.ar)) {
    return entry.ar
      .map((item) => (typeof item === "string" ? item : (item?.name ?? "")))
      .map((item) => item.trim())
      .filter(Boolean)
      .join(" / ");
  }
  if (typeof entry.artists === "string" && entry.artists.trim()) {
    return entry.artists.trim();
  }
  return "";
}

function toAlbum(entry: SidecarSearchEntry): string | undefined {
  if (typeof entry.album === "string" && entry.album.trim()) {
    return entry.album.trim();
  }
  if (entry.album && typeof entry.album === "object") {
    const value = entry.album.name ?? entry.album.title ?? "";
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  if (typeof entry.album_name === "string" && entry.album_name.trim()) {
    return entry.album_name.trim();
  }
  return undefined;
}

function pickCoverString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["url", "src", "pic", "picUrl", "pic_url", "cover", "cover_url", "image"]) {
      const inner = record[key];
      if (typeof inner === "string" && inner.trim()) {
        return inner.trim();
      }
    }
  }
  return undefined;
}

function toCoverUrl(entry: SidecarSearchEntry): string | undefined {
  const raw =
    pickCoverString(entry.cover) ||
    pickCoverString(entry.cover_url) ||
    pickCoverString(entry.pic) ||
    pickCoverString(entry.pic_url) ||
    pickCoverString(entry.image) ||
    pickCoverString(entry.al) ||
    (entry.album && typeof entry.album === "object"
      ? pickCoverString(entry.album.pic) ||
        pickCoverString(entry.album.cover) ||
        pickCoverString(entry.album.image)
      : undefined);
  return raw ? coverUrlForStorage(raw) : undefined;
}

function toDurationMs(entry: SidecarSearchEntry): number | undefined {
  const raw = entry.duration_ms ?? entry.duration;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw > 10_000 ? raw : raw * 1000;
  }
  if (typeof entry.interval === "number" && Number.isFinite(entry.interval) && entry.interval > 0) {
    return entry.interval * 1000;
  }
  return undefined;
}

function mapTrack(entry: SidecarSearchEntry): SearchHitTrack | null {
  const remoteId = toRemoteId(entry);
  const title = String(entry.title ?? entry.name ?? entry.song_name ?? "").trim();
  if (!remoteId || !title) {
    return null;
  }
  return {
    kind: "track",
    ref: {
      providerId: toProviderId(entry),
      remoteId,
    },
    title,
    artist: toArtist(entry),
    album: toAlbum(entry),
    coverUrl: toCoverUrl(entry),
    durationMs: toDurationMs(entry),
  };
}

function mapArtist(entry: SidecarSearchEntry): SearchHitArtist | null {
  const remoteId = toRemoteId(entry);
  const name = String(entry.name ?? entry.title ?? entry.artist ?? entry.singer ?? "").trim();
  if (!remoteId || !name) {
    return null;
  }
  return {
    kind: "artist",
    ref: {
      providerId: toProviderId(entry),
      remoteId,
    },
    name,
    trackCount: entry.track_count ?? entry.song_count ?? entry.count,
    coverUrl: toCoverUrl(entry),
  };
}

function mapAlbum(entry: SidecarSearchEntry): SearchHitAlbum | null {
  const remoteId = toRemoteId(entry);
  const title = String(entry.title ?? entry.name ?? entry.album_name ?? "").trim();
  if (!remoteId || !title) {
    return null;
  }
  return {
    kind: "album",
    ref: {
      providerId: toProviderId(entry),
      remoteId,
    },
    title,
    artist: toArtist(entry),
    coverUrl: toCoverUrl(entry),
    trackCount: entry.track_count ?? entry.song_count ?? entry.count,
  };
}

function mapPlaylist(entry: SidecarSearchEntry): SearchHitPlaylist | null {
  const remoteId = toRemoteId(entry);
  const title = String(entry.title ?? entry.name ?? "").trim();
  if (!remoteId || !title) {
    return null;
  }
  return {
    kind: "playlist",
    ref: {
      providerId: toProviderId(entry),
      remoteId,
    },
    title,
    creator:
      (typeof entry.creator === "string" && entry.creator.trim()) ||
      (typeof entry.author_name === "string" && entry.author_name.trim()) ||
      undefined,
    coverUrl: toCoverUrl(entry),
    trackCount: entry.track_count ?? entry.song_count ?? entry.count,
  };
}

interface SidecarResolvePayload {
  url?: string;
  data?: {
    url?: string;
    source?: string;
    id?: string | number;
    br?: number;
    size?: number;
    type?: string;
  };
  source?: string;
  id?: string | number;
  br?: number;
  bitrate?: number;
  size?: number;
  ext?: string;
  type?: string;
}

function asResolvePayload(payload: unknown): SidecarResolvePayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return payload as SidecarResolvePayload;
}

function resolveNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function resolveTrimmedString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function resolvePlayableUrl(payload: unknown): ResolvedPlayable | null {
  if (payload && typeof payload === "object" && "code" in payload) {
    const envelope = payload as { code?: number; msg?: string; data?: unknown };
    if (envelope.code !== 200) {
      return null;
    }
    if (envelope.data) {
      return resolvePlayableUrl(envelope.data);
    }
  }
  const record = asResolvePayload(payload);
  if (!record) {
    return null;
  }
  const url = resolveTrimmedString(record.data?.url, record.url);
  if (!url) {
    return null;
  }
  return {
    url,
    providerId: String(record.data?.source ?? record.source ?? "").trim(),
    remoteId: String(record.data?.id ?? record.id ?? "").trim(),
    bitrate: resolveNumber(record.data?.br, record.bitrate, record.br),
    sizeBytes: resolveNumber(record.data?.size, record.size),
    ext: resolveTrimmedString(record.data?.type, record.ext, record.type),
  };
}

function resolveLyricsText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const record = payload as {
    lyric?: string;
    lrc?: string;
    data?: {
      lyric?: string;
      lrc?: string;
    };
  };
  return resolveTrimmedString(record.data?.lyric, record.data?.lrc, record.lyric, record.lrc);
}

async function searchByType(
  query: SearchQuery,
  type: MusicSidecarSearchKind,
  baseUrl: string,
): Promise<{
  entries: SidecarSearchEntry[];
  errors: { providerId: string; message: string }[];
  debug: SearchDebugRequest[];
}> {
  const request = buildSidecarSearchRequest(query, type);
  const platformIds = request.sourceIds;
  const limit =
    typeof request.limit === "number" && Number.isFinite(request.limit) && request.limit > 0
      ? Math.floor(request.limit)
      : undefined;

  async function fetchWithSources(
    sources: string[],
    errorProviderId: string,
  ): Promise<{
    entries: SidecarSearchEntry[];
    error?: { providerId: string; message: string };
    debug: SearchDebugRequest;
  }> {
    const url = new URL("/api/v1/music/search", `${baseUrl}/`);
    url.searchParams.set("q", request.keyword);
    url.searchParams.set("type", request.kind);
    if (limit) {
      url.searchParams.set("limit", String(limit));
    }
    for (const platformId of sources) {
      url.searchParams.append("sources", platformId);
    }
    const debug: SearchDebugRequest = {
      providerId: sources.length === 1 ? sources[0]! : errorProviderId,
      url: url.toString(),
      note: `爬虫：sidecar GET（${baseUrl}）`,
    };
    try {
      const response = await fetchMusicSidecarJson(url.toString());
      if (!response || typeof response !== "object") {
        return {
          entries: [],
          error: { providerId: errorProviderId, message: "响应无效，已跳过" },
          debug,
        };
      }
      return {
        entries: normalizeThirdPartySearchPayload(response).items as SidecarSearchEntry[],
        debug,
      };
    } catch (error) {
      return {
        entries: [],
        error: {
          providerId: errorProviderId,
          message: error instanceof Error ? error.message : "请求失败，已跳过",
        },
        debug,
      };
    }
  }

  // 歌曲多平台分源请求，便于单源失败降级；艺人/专辑/歌单仍合并一次请求
  if (type === "song" && platformIds.length > 1) {
    const batches = await Promise.all(
      platformIds.map((platformId) => fetchWithSources([platformId], platformId)),
    );
    const entries: SidecarSearchEntry[] = [];
    const errors: { providerId: string; message: string }[] = [];
    const debug: SearchDebugRequest[] = [];
    for (const batch of batches) {
      entries.push(...batch.entries);
      if (batch.error) {
        errors.push(batch.error);
      }
      debug.push(batch.debug);
    }
    return { entries, errors, debug };
  }

  const batch = await fetchWithSources(platformIds, "sidecar");
  return {
    entries: batch.entries,
    errors: batch.error ? [batch.error] : [],
    debug: [batch.debug],
  };
}

async function resolvePlayableByRef(
  ref: RemoteRef,
  baseUrl: string,
): Promise<ResolvedPlayable | null> {
  try {
    const request = buildSidecarResolveRequest(ref);
    const url = new URL("/api/v1/music/url", `${baseUrl}/`);
    url.searchParams.set("source", request.sourceId);
    url.searchParams.set("id", request.remoteId);
    const payload = (await fetchMusicSidecarJson(url.toString())) as unknown;
    const resolved = resolvePlayableUrl(payload);
    if (!resolved) {
      return null;
    }
    return {
      ...resolved,
      providerId: resolved.providerId || ref.providerId,
      remoteId: resolved.remoteId || ref.remoteId,
    };
  } catch {
    return null;
  }
}

async function fetchLyricsByRef(ref: RemoteRef, baseUrl: string): Promise<ResolvedLyrics | null> {
  const request = buildSidecarResolveRequest(ref);
  const url = new URL("/api/v1/music/lyric", `${baseUrl}/`);
  url.searchParams.set("source", request.sourceId);
  url.searchParams.set("id", request.remoteId);
  try {
    const payload = (await fetchMusicSidecarJson(url.toString())) as unknown;
    const fileUrl = new URL("/api/v1/music/lyric/file", `${baseUrl}/`);
    fileUrl.searchParams.set("source", request.sourceId);
    fileUrl.searchParams.set("id", request.remoteId);
    return {
      providerId: ref.providerId,
      remoteId: ref.remoteId,
      text: resolveLyricsText(payload),
      fileUrl: fileUrl.toString(),
    };
  } catch {
    return null;
  }
}

declare global {
  var AGNX_MUSIC_SIDECAR_URL: string | undefined;
}

export const sidecarMusicProvider: MusicResourceProvider = {
  id: "sidecar",
  label: "本机资源服务",
  async search(query) {
    const text = query.text.trim();
    const baseUrl = await getMusicSidecarBaseUrl();
    if (!text) {
      return emptyPage(query);
    }
    // 未配置 / 未探测到 sidecar：静默跳过，不刷错误（避免每次搜索都提示）
    if (!baseUrl) {
      return emptyPage(query);
    }
    const page = emptyPage(query);
    const types = resolveSidecarSearchKinds(query.scope ?? "all");
    const results = await Promise.all(types.map((type) => searchByType(query, type, baseUrl)));
    for (let index = 0; index < types.length; index += 1) {
      const type = types[index];
      const batch = results[index];
      const entries = batch?.entries ?? [];
      if (batch?.errors?.length) {
        page.providerErrors = [...(page.providerErrors ?? []), ...batch.errors];
      }
      if (batch?.debug?.length) {
        page.debugSearchRequests = [...(page.debugSearchRequests ?? []), ...batch.debug];
      }
      if (type === "song") {
        page.tracks.push(
          ...entries.map(mapTrack).filter((item): item is SearchHitTrack => item != null),
        );
        continue;
      }
      if (type === "artist") {
        page.artists.push(
          ...entries.map(mapArtist).filter((item): item is SearchHitArtist => item != null),
        );
        continue;
      }
      if (type === "album") {
        page.albums.push(
          ...entries.map(mapAlbum).filter((item): item is SearchHitAlbum => item != null),
        );
        continue;
      }
      page.playlists.push(
        ...entries.map(mapPlaylist).filter((item): item is SearchHitPlaylist => item != null),
      );
    }
    return page;
  },
  async resolvePlayable(ref) {
    const baseUrl = await getMusicSidecarBaseUrl();
    if (!baseUrl || !ref.providerId || ref.providerId === "local") {
      return null;
    }
    return resolvePlayableByRef(ref, baseUrl);
  },
  async fetchLyrics(ref) {
    const baseUrl = await getMusicSidecarBaseUrl();
    if (!baseUrl || !ref.providerId || ref.providerId === "local") {
      return null;
    }
    return fetchLyricsByRef(ref, baseUrl);
  },
  async listCollection(query: ListCollectionQuery): Promise<ListCollectionPage | null> {
    const remoteId = query.ref.remoteId?.trim() ?? "";
    const sourceId = query.ref.providerId?.trim() ?? "";
    if (!remoteId || !sourceId || sourceId === "local" || sourceId === "sidecar") {
      return null;
    }
    // 派生假 ID 不可打详情接口
    if (remoteId.startsWith("artist:") || remoteId.startsWith("album:")) {
      return null;
    }
    const baseUrl = await getMusicSidecarBaseUrl();
    if (!baseUrl) {
      return null;
    }
    const url = buildSidecarCollectionUrl(baseUrl, {
      sourceId,
      remoteId,
      kind: query.kind,
      limit: query.limit,
      page: query.page,
    });
    try {
      const payload = await fetchMusicSidecarJson(url);
      if (
        payload &&
        typeof payload === "object" &&
        "code" in payload &&
        Number((payload as { code?: unknown }).code) >= 400
      ) {
        return null;
      }
      const entries = normalizeThirdPartySearchPayload(payload).items;
      const tracks = entries
        .map((item) => mapTrack(item as SidecarSearchEntry))
        .filter((item): item is SearchHitTrack => item != null);
      if (tracks.length === 0) {
        return null;
      }
      return {
        kind: query.kind,
        ref: { providerId: sourceId, remoteId },
        tracks,
        page: Math.max(1, Math.floor(query.page ?? 1)),
        hasMore: false,
      };
    } catch {
      // sidecar 未实现 collection 端点时静默降级
      return null;
    }
  },
};
