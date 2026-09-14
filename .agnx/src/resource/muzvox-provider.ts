// 场景：MuzVox HTML 源 — 搜索页自带 mp3-download 直链；resolve 按 remoteId(token) 精确匹配刷新。
import { listCollectionByNameSearch } from "./collection-list-helpers";
import { getMusicProviderCapabilities, getMusicProviderReferer } from "./provider-catalog";
import { fetchMusicSidecarJson } from "./sidecar-fetch";
import type {
  ListCollectionPage,
  ListCollectionQuery,
  MusicResourceProvider,
  RemoteRef,
  ResolvedPlayable,
  SearchDebugRequest,
  SearchHitTrack,
  SearchQuery,
  SearchResultPage,
} from "./types";

export const MUZVOX_PROVIDER_ID = "muzvox";
export const MUZVOX_ORIGIN = "https://muzvox.org";
export const MUZVOX_STORAGE_ORIGIN = "https://storage.muzvox.org";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_LIMIT = 40;

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
    providerErrors: error ? [{ providerId: MUZVOX_PROVIDER_ID, message: error }] : [],
    debugSearchRequests: debug,
    page: Math.max(1, Math.floor(query.page ?? 1)),
    hasMore: false,
  };
}

function asRawHtml(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  if (payload && typeof payload === "object" && "raw" in payload) {
    const raw = (payload as { raw?: unknown }).raw;
    return typeof raw === "string" ? raw : "";
  }
  return "";
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    });
}

function cleanText(value: string | undefined): string {
  return decodeHtmlEntities(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDurationMs(text: string | undefined): number | undefined {
  const raw = (text ?? "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return undefined;
  }
  const hours = match[3] != null ? Number(match[1]) : 0;
  const minutes = match[3] != null ? Number(match[2]) : Number(match[1]);
  const seconds = match[3] != null ? Number(match[3]) : Number(match[2]);
  if (![hours, minutes, seconds].every((n) => Number.isFinite(n))) {
    return undefined;
  }
  const total = ((hours * 60 + minutes) * 60 + seconds) * 1000;
  return total > 0 ? total : undefined;
}

/** 从 URL / 普通文本提取搜索词。 */
export function normalizeMuzvoxQueryText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      if (/muzvox\.org$/i.test(url.hostname.replace(/^www\./, ""))) {
        const parts = url.pathname.split("/").filter(Boolean);
        const searchIdx = parts.findIndex((part) => part === "search");
        if (searchIdx >= 0 && parts[searchIdx + 1]) {
          return decodeURIComponent(parts[searchIdx + 1]!.replace(/\+/g, " ")).trim();
        }
      }
    }
  } catch {
    // fallthrough
  }
  return trimmed;
}

export function buildMuzvoxSearchUrl(text: string): string {
  const q = normalizeMuzvoxQueryText(text) || text.trim() || "music";
  return `${MUZVOX_ORIGIN}/search/${encodeURIComponent(q)}`;
}

export function absolutizeMuzvoxUrl(pathOrUrl: string | undefined): string | undefined {
  const raw = pathOrUrl?.trim();
  if (!raw) {
    return undefined;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }
  if (raw.startsWith("/")) {
    return `${MUZVOX_ORIGIN}${raw}`;
  }
  return `${MUZVOX_ORIGIN}/${raw}`;
}

/**
 * remoteId 仅用 mp3-download 路径第一段 token（稳定、唯一）。
 * 可选完整相对路径 token/hash/file.mp3 也会被解析出 token。
 */
export function parseMuzvoxRemoteId(remoteId: string): { token: string } | null {
  const raw = remoteId.trim().replace(/^muzvox:/i, "");
  if (!raw) {
    return null;
  }
  const full = raw.match(/^([^/\s]+)\/([^/\s]+)\/.+\.mp3$/i);
  if (full?.[1]) {
    return { token: full[1] };
  }
  if (/^[^/\s]+$/.test(raw) && raw.length >= 8) {
    return { token: raw };
  }
  return null;
}

export function extractMuzvoxDownloadToken(downloadUrl: string): string | undefined {
  const match = downloadUrl.match(/\/mp3-download\/([^/\s?]+)\//i);
  return match?.[1]?.trim() || undefined;
}

function mapOneMuzvoxBlock(block: string, searchPageUrl: string): SearchHitTrack | null {
  const downloadMatch = block.match(
    /href=["'](\/\/storage\.muzvox\.org\/mp3-download\/([^/"']+)\/([^/"']+)\/[^"']+\.mp3)["']/i,
  );
  if (!downloadMatch?.[1] || !downloadMatch[2]) {
    return null;
  }
  const token = downloadMatch[2].trim();
  if (!token) {
    return null;
  }
  const playableUrl = absolutizeMuzvoxUrl(downloadMatch[1]);
  if (!playableUrl) {
    return null;
  }
  const title =
    cleanText(block.match(/class="title __adv_name"[^>]*>([\s\S]*?)<\/span>/i)?.[1]) ||
    cleanText(block.match(/class="title"[^>]*>([\s\S]*?)<\/span>/i)?.[1]) ||
    "Untitled";
  const artist =
    cleanText(block.match(/class="artist __adv_artist"[^>]*>([\s\S]*?)<\/span>/i)?.[1]) ||
    cleanText(block.match(/class="artist"[^>]*>([\s\S]*?)<\/span>/i)?.[1]) ||
    "MuzVox";
  const durationMs = parseDurationMs(
    cleanText(block.match(/class="name-time"[^>]*>([\s\S]*?)<\/div>/i)?.[1]),
  );
  const coverUrl = absolutizeMuzvoxUrl(block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]);
  // 列表页常塞 vinyl 占位图；不要当作品封面入库（否则大封面只剩糊块）。
  const usableCover =
    coverUrl && !/\/cover\/vinyl\d*\.(png|jpe?g|webp)(?:\?|#|$)/i.test(coverUrl)
      ? coverUrl
      : undefined;
  return {
    kind: "track",
    ref: {
      providerId: MUZVOX_PROVIDER_ID,
      remoteId: token,
      pageUrl: searchPageUrl,
    },
    title,
    artist,
    coverUrl: usableCover,
    durationMs,
    playableUrl,
  };
}

/** 把搜索 HTML 映射为曲目；无 download 直链的丢弃。 */
export function mapMuzvoxSearchHtml(
  html: string,
  limit: number,
  searchPageUrl: string,
): SearchHitTrack[] {
  const tracks: SearchHitTrack[] = [];
  const seen = new Set<string>();
  const blockRe =
    /<div class="data __adv_list_track">([\s\S]*?)(?=<div class="data __adv_list_track">|<div class="rewind"><\/div>|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) != null) {
    if (tracks.length >= limit) {
      break;
    }
    const track = mapOneMuzvoxBlock(match[1] || match[0] || "", searchPageUrl);
    if (!track || seen.has(track.ref.remoteId)) {
      continue;
    }
    seen.add(track.ref.remoteId);
    tracks.push(track);
  }
  return tracks;
}

async function fetchMuzvoxHtml(url: string): Promise<string> {
  const payload = await fetchMusicSidecarJson(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": USER_AGENT,
      Referer: getMusicProviderReferer(MUZVOX_PROVIDER_ID) || `${MUZVOX_ORIGIN}/`,
    },
    timeoutMs: 20_000,
  });
  return asRawHtml(payload);
}

function findPlayableByToken(
  html: string,
  token: string,
  searchPageUrl: string,
): ResolvedPlayable | null {
  const tracks = mapMuzvoxSearchHtml(html, 200, searchPageUrl);
  const exact = tracks.find((track) => track.ref.remoteId === token);
  if (!exact?.playableUrl) {
    return null;
  }
  // 禁止串歌：remoteId 必须精确等于请求 token
  if (exact.ref.remoteId !== token) {
    return null;
  }
  return {
    url: exact.playableUrl,
    providerId: MUZVOX_PROVIDER_ID,
    remoteId: token,
    ext: "mp3",
    // 不回写 title/artist，避免更新资源时改写用户可见元数据
  };
}

export const muzvoxMusicProvider: MusicResourceProvider = {
  id: MUZVOX_PROVIDER_ID,
  label: getMusicProviderCapabilities(MUZVOX_PROVIDER_ID)?.label || "MuzVox",
  async search(query) {
    const text = normalizeMuzvoxQueryText(query.text);
    const pageNum = Math.max(1, Math.floor(query.page ?? 1));
    const plannedUrl = buildMuzvoxSearchUrl(text || query.text.trim());
    const debug: SearchDebugRequest = {
      providerId: MUZVOX_PROVIDER_ID,
      url: plannedUrl,
      compareUrl: plannedUrl,
      note: "muzvox.org HTML；仅返回带 storage mp3-download 直链的曲目",
    };
    if (!text && !query.text.trim()) {
      return emptyPage(query);
    }
    // 站点分页参数实测无效（page/offset 仍返回同一批），仅支持首页
    if (pageNum > 1) {
      return {
        ...emptyPage(query, undefined, [debug]),
        page: pageNum,
        hasMore: false,
      };
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage(query, undefined, [debug]);
    }
    try {
      const html = await fetchMuzvoxHtml(plannedUrl);
      if (!html.trim()) {
        return emptyPage(query, "MuzVox 返回空页面", [debug]);
      }
      const limit = Math.max(1, Math.min(query.limit ?? DEFAULT_LIMIT, 60));
      const tracks = mapMuzvoxSearchHtml(html, limit, plannedUrl);
      if (tracks.length === 0) {
        return {
          ...emptyPage(query, "MuzVox 无带可下直链的结果", [debug]),
          page: pageNum,
          hasMore: false,
        };
      }
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
        hasMore: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "MuzVox 搜索失败";
      return emptyPage(query, message, [debug]);
    }
  },
  async resolvePlayable(ref: RemoteRef): Promise<ResolvedPlayable | null> {
    if (ref.providerId !== MUZVOX_PROVIDER_ID) {
      return null;
    }
    const parsed = parseMuzvoxRemoteId(ref.remoteId ?? "");
    if (!parsed) {
      return null;
    }
    const token = parsed.token;
    const pageUrl = ref.pageUrl?.trim() || "";
    // 刷新依赖搜索页 HTML；无 pageUrl 时无法按 token 精确反查，禁止猜测/串歌
    if (!pageUrl || !/muzvox\.org/i.test(pageUrl)) {
      return null;
    }
    try {
      const html = await fetchMuzvoxHtml(pageUrl);
      return findPlayableByToken(html, token, pageUrl);
    } catch {
      return null;
    }
  },
  /**
   * MuzVox 无独立艺人/专辑 API：艺人页实质是 /search/{name} 全量列表。
   * listCollection 按名搜索后过滤；playlist 无结构返回 null。
   */
  async listCollection(query: ListCollectionQuery): Promise<ListCollectionPage | null> {
    return listCollectionByNameSearch(this, query, { maxPages: 1, pageLimit: 80 });
  },
};
