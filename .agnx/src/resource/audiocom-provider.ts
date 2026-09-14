// 场景：Audio.com API 源 — 搜索结果自带签名 mp3；resolve 按 remoteId 精确刷新，禁止串歌。
import { getMusicProviderCapabilities, getMusicProviderReferer } from "./provider-catalog";
import { fetchMusicSidecarJson } from "./sidecar-fetch";
import type {
  ListCollectionPage,
  ListCollectionQuery,
  MusicResourceProvider,
  SearchDebugRequest,
  SearchHitTrack,
  SearchQuery,
  SearchResultPage,
} from "./types";
import { listCollectionByNameSearch } from "./collection-list-helpers";

export const AUDIOCOM_PROVIDER_ID = "audiocom";
export const AUDIOCOM_API_ORIGIN = "https://api.audio.com";
export const AUDIOCOM_SITE_ORIGIN = "https://audio.com";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_LIMIT = 20;

function emptyPage(
  query: SearchQuery,
  error?: string,
  debug?: SearchDebugRequest[],
): SearchResultPage {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: error ? [{ providerId: AUDIOCOM_PROVIDER_ID, message: error }] : [],
    debugSearchRequests: debug,
    page: Math.max(1, Math.floor(query.page ?? 1)),
    hasMore: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/** 从站内分类 URL / 普通文本提取搜索词。 */
export function normalizeAudiocomQueryText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      if (/audio\.com$/i.test(url.hostname.replace(/^www\./, ""))) {
        const parts = url.pathname.split("/").filter(Boolean);
        // /category/music/justin-bieber
        const categoryIdx = parts.findIndex((part) => part === "category");
        if (categoryIdx >= 0 && parts[categoryIdx + 2]) {
          return decodeURIComponent(parts[categoryIdx + 2]!.replace(/[-_]+/g, " "));
        }
        const last = parts[parts.length - 1] || "";
        return decodeURIComponent(last.replace(/[-_]+/g, " "));
      }
    }
  } catch {
    // fallthrough
  }
  return trimmed.replace(/\?ysclid=.*$/i, "").trim();
}

export function buildAudiocomSearchUrl(text: string, page = 1): string {
  // 官网/API 相关性依赖 query=；q= 会返回无关垃圾结果（串播客/随机文件名）。
  const query = normalizeAudiocomQueryText(text) || text.trim();
  const pageNum = Math.max(1, Math.floor(page));
  const params = new URLSearchParams({
    query,
    page: String(pageNum),
  });
  return `${AUDIOCOM_API_ORIGIN}/search?${params.toString()}`;
}

export function buildAudiocomPageUrl(input: {
  id: string;
  username?: string;
  slug?: string;
}): string | undefined {
  const id = input.id.trim();
  if (!id) {
    return undefined;
  }
  const username = (input.username || "").trim();
  const slug = (input.slug || "").trim();
  if (username && slug) {
    return `${AUDIOCOM_SITE_ORIGIN}/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
  }
  return `${AUDIOCOM_SITE_ORIGIN}/search?q=${encodeURIComponent(id)}`;
}

function pickPlayableFromModel(model: Record<string, unknown>): {
  url: string;
  ext?: string;
  durationMs?: number;
  sizeBytes?: number;
} | null {
  const play = asRecord(model.play);
  const playUrl = asString(play?.url);
  if (playUrl && /^https?:\/\//i.test(playUrl)) {
    const durationMs = asNumber(play?.duration);
    return {
      url: playUrl,
      ext: /\.m4a(\?|$)/i.test(playUrl) ? "m4a" : "mp3",
      durationMs: durationMs && durationMs > 0 ? Math.floor(durationMs) : undefined,
    };
  }
  const playhq = asRecord(model.playhq);
  const hqUrl = asString(playhq?.url);
  if (hqUrl && /^https?:\/\//i.test(hqUrl)) {
    const durationMs = asNumber(playhq?.duration);
    return {
      url: hqUrl,
      ext: /\.m4a(\?|$)/i.test(hqUrl) ? "m4a" : "mp3",
      durationMs: durationMs && durationMs > 0 ? Math.floor(durationMs) : undefined,
    };
  }
  return null;
}

function pickPlayableFromDetail(detail: Record<string, unknown>): {
  url: string;
  ext?: string;
  durationMs?: number;
  sizeBytes?: number;
} | null {
  const transcodings = detail.transcodings;
  if (Array.isArray(transcodings)) {
    const ranked = transcodings
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item != null)
      .map((item) => {
        const url = asString(item.url);
        const format = asString(item.format).toLowerCase() || asString(item.codec).toLowerCase();
        const sizeBytes = asNumber(item.size);
        const durationMs = asNumber(item.duration);
        return { url, format, sizeBytes, durationMs };
      })
      .filter((item) => item.url && /^https?:\/\//i.test(item.url));
    const mp3 = ranked.find((item) => item.format === "mp3" || /\.mp3(\?|$)/i.test(item.url));
    const m4a = ranked.find((item) => item.format === "m4a" || /\.m4a(\?|$)/i.test(item.url));
    const picked = mp3 || m4a || ranked[0];
    if (picked) {
      let ext: string | undefined;
      if (mp3) {
        ext = "mp3";
      } else if (m4a) {
        ext = "m4a";
      }
      return {
        url: picked.url,
        ext,
        durationMs:
          picked.durationMs && picked.durationMs > 0 ? Math.floor(picked.durationMs) : undefined,
        sizeBytes:
          picked.sizeBytes && picked.sizeBytes > 0 ? Math.floor(picked.sizeBytes) : undefined,
      };
    }
  }
  return pickPlayableFromModel(detail);
}

function mapOneAudiocomItem(raw: unknown): SearchHitTrack | null {
  const item = asRecord(raw);
  if (!item) {
    return null;
  }
  const model = asRecord(item.model) || item;
  const type = asString(item.type) || asString(model.type) || "audio";
  if (type && type !== "audio") {
    return null;
  }
  const remoteId = asString(model.id) || asString(item.id);
  if (!remoteId) {
    return null;
  }
  const playable = pickPlayableFromModel(model);
  if (!playable?.url) {
    return null;
  }
  const title = asString(model.title) || "Untitled";
  const artist =
    asString(model.author) ||
    asString(model.author_name) ||
    asString(model.username) ||
    "Audio.com";
  const username = asString(model.username);
  const slug = asString(model.slug);
  const coverUrl = asString(model.image) || asString(model.avatar) || undefined;
  return {
    kind: "track",
    ref: {
      providerId: AUDIOCOM_PROVIDER_ID,
      remoteId,
      pageUrl: buildAudiocomPageUrl({ id: remoteId, username, slug }),
    },
    title,
    artist,
    coverUrl,
    durationMs: playable.durationMs,
    playableUrl: playable.url,
  };
}

/** 把 search items 映射为曲目；无直链的直接丢弃（search-inline 策略）。 */
export function mapAudiocomSearchItems(payload: unknown, limit: number): SearchHitTrack[] {
  const root = asRecord(payload);
  let items: unknown[] = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else if (Array.isArray(root?.items)) {
    items = root.items;
  }
  const tracks: SearchHitTrack[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    if (tracks.length >= limit) {
      break;
    }
    const track = mapOneAudiocomItem(raw);
    if (!track || seen.has(track.ref.remoteId)) {
      continue;
    }
    seen.add(track.ref.remoteId);
    tracks.push(track);
  }
  return tracks;
}

async function fetchAudiocomJson(url: string): Promise<unknown> {
  return fetchMusicSidecarJson(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Referer: getMusicProviderReferer(AUDIOCOM_PROVIDER_ID) || `${AUDIOCOM_SITE_ORIGIN}/`,
      Origin: AUDIOCOM_SITE_ORIGIN,
    },
    timeoutMs: 20_000,
  });
}

export const audiocomMusicProvider: MusicResourceProvider = {
  id: AUDIOCOM_PROVIDER_ID,
  label: getMusicProviderCapabilities(AUDIOCOM_PROVIDER_ID)?.label || "Audio.com",
  async search(query) {
    const text = normalizeAudiocomQueryText(query.text);
    const pageNum = Math.max(1, Math.floor(query.page ?? 1));
    const plannedUrl = buildAudiocomSearchUrl(text || query.text.trim(), pageNum);
    const debug: SearchDebugRequest = {
      providerId: AUDIOCOM_PROVIDER_ID,
      url: plannedUrl,
      compareUrl: text
        ? `${AUDIOCOM_SITE_ORIGIN}/search?q=${encodeURIComponent(text)}`
        : `${AUDIOCOM_SITE_ORIGIN}/`,
      note: "api.audio.com JSON；仅返回带签名直链的曲目",
    };
    if (!text && !query.text.trim()) {
      return emptyPage(query);
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage(query, undefined, [debug]);
    }
    try {
      const payload = await fetchAudiocomJson(plannedUrl);
      const limit = Math.max(1, Math.min(query.limit ?? DEFAULT_LIMIT, 40));
      const tracks = mapAudiocomSearchItems(payload, limit);
      if (tracks.length === 0) {
        return {
          ...emptyPage(query, "Audio.com 无带可播直链的结果", [debug]),
          page: pageNum,
          hasMore: false,
        };
      }
      const root = asRecord(payload);
      const pagination = asRecord(root?.pagination);
      const totalPages = asNumber(pagination?.pages);
      const hasMore =
        typeof totalPages === "number"
          ? pageNum < totalPages
          : tracks.length >= Math.min(limit, 10);
      return {
        query,
        suggestions: [],
        tracks,
        artists: [],
        albums: [],
        playlists: [],
        providerErrors: [],
        debugSearchRequests: [debug],
        page: pageNum,
        hasMore,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Audio.com 搜索失败";
      return emptyPage(query, message, [debug]);
    }
  },
  async resolvePlayable(ref) {
    if (ref.providerId !== AUDIOCOM_PROVIDER_ID) {
      return null;
    }
    const remoteId = ref.remoteId?.trim();
    if (!remoteId || !/^\d+$/.test(remoteId)) {
      return null;
    }
    try {
      const detailUrl = `${AUDIOCOM_API_ORIGIN}/audio/${encodeURIComponent(remoteId)}`;
      const payload = await fetchAudiocomJson(detailUrl);
      const detail = asRecord(payload);
      if (!detail) {
        return null;
      }
      // 精确匹配：详情 id 必须等于请求 remoteId
      const detailId = asString(detail.id);
      if (detailId && detailId !== remoteId) {
        return null;
      }
      const playable = pickPlayableFromDetail(detail);
      if (!playable?.url) {
        return null;
      }
      return {
        url: playable.url,
        providerId: AUDIOCOM_PROVIDER_ID,
        remoteId,
        ext: playable.ext,
        sizeBytes: playable.sizeBytes,
        // 不擅自改写用户可见 title/artist
      };
    } catch {
      return null;
    }
  },
  /**
   * Audio.com 无艺人合集端点：按名搜索 + 艺人字段过滤；playlist 无结构。
   */
  async listCollection(query: ListCollectionQuery): Promise<ListCollectionPage | null> {
    return listCollectionByNameSearch(this, query, { maxPages: 2, pageLimit: 40 });
  },
};
