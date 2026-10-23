// 场景：Music 远端聚合源（music.txqq.pro / music.itzo.cn 等同接口）— 搜索结果自带可播 URL，按底线只返回有直链的条目。
import { coverUrlForStorage } from "../cover-url-quality";
import type {
  ListCollectionPage,
  ListCollectionQuery,
  MusicResourceProvider,
  ResolvedPlayable,
  SearchDebugRequest,
  SearchHitTrack,
  SearchQuery,
  SearchResultPage,
} from "./types";
import { listCollectionByNameSearch } from "./collection-list-helpers";
import { getDefaultSearchPlatformIds } from "./platform-registry";
import { fetchMusicSidecarJson } from "./sidecar-fetch";
import { buildTxqqDebugRequest } from "./search-debug-urls";

/** 同源聚合镜像：内容几乎相同，轮换降低单站压力。 */
const AGGREGATOR_ENDPOINTS = ["https://music.txqq.pro/", "https://music.itzo.cn/"] as const;

let aggregatorEndpointCursor = 0;

function aggregatorOrigin(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return "https://music.txqq.pro";
  }
}

/** 测试用：重置轮换游标。 */
export function resetMusicAggregatorEndpointCursor(): void {
  aggregatorEndpointCursor = 0;
}

/** 测试用：当前镜像列表。 */
export function listMusicAggregatorEndpoints(): readonly string[] {
  return AGGREGATOR_ENDPOINTS;
}

const TXQQ_SOURCES = ["netease", "qq", "kugou", "kuwo"] as const;

interface TxqqSearchItem {
  type?: string;
  songid?: string | number;
  title?: string;
  author?: string;
  url?: string;
  pic?: string;
  lrc?: string;
  link?: string;
}

interface TxqqSourceSearchResult {
  tracks: SearchHitTrack[];
  error?: { providerId: string; message: string };
  debug?: SearchDebugRequest;
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

function mapProviderId(value: string | undefined): string {
  const id = (value ?? "").trim();
  if (id === "tencent") {
    return "qq";
  }
  return id || "netease";
}

function mapTrack(item: TxqqSearchItem, fallbackSource: string): SearchHitTrack | null {
  const playableUrl = typeof item.url === "string" ? item.url.trim() : "";
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const remoteId = String(item.songid ?? "").trim();
  if (!playableUrl || !title || !remoteId) {
    return null;
  }
  const lyrics = typeof item.lrc === "string" ? item.lrc.trim() : "";
  return {
    kind: "track",
    ref: {
      providerId: mapProviderId(item.type ?? fallbackSource),
      remoteId,
      pageUrl: typeof item.link === "string" ? item.link : undefined,
    },
    title,
    artist: typeof item.author === "string" ? item.author.trim() : "",
    coverUrl:
      typeof item.pic === "string" && item.pic.trim()
        ? coverUrlForStorage(item.pic.trim())
        : undefined,
    lyrics: lyrics || undefined,
    playableUrl,
  };
}

async function searchSource(
  keyword: string,
  source: string,
  page: number,
): Promise<TxqqSourceSearchResult> {
  const body = new URLSearchParams({
    input: keyword,
    filter: "name",
    type: source,
    page: String(page),
  }).toString();

  // 轮换起点，失败则顺延试下一个镜像
  const start = aggregatorEndpointCursor % AGGREGATOR_ENDPOINTS.length;
  aggregatorEndpointCursor = (start + 1) % AGGREGATOR_ENDPOINTS.length;
  const ordered: string[] = [];
  for (let offset = 0; offset < AGGREGATOR_ENDPOINTS.length; offset += 1) {
    ordered.push(AGGREGATOR_ENDPOINTS[(start + offset) % AGGREGATOR_ENDPOINTS.length]!);
  }

  let lastError: { providerId: string; message: string } | undefined;
  let lastDebug: SearchDebugRequest | undefined;
  for (const endpoint of ordered) {
    const origin = aggregatorOrigin(endpoint);
    const debug = buildTxqqDebugRequest({
      providerId: source,
      origin,
      keyword,
      page,
    });
    lastDebug = debug;
    try {
      const payload = (await fetchMusicSidecarJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          Origin: origin,
          Referer: `${origin}/`,
        },
        body,
      })) as { code?: number; data?: TxqqSearchItem[] };
      if (payload?.code !== 200 || !Array.isArray(payload.data)) {
        const code = payload?.code;
        lastError = {
          providerId: source,
          message: code != null ? `暂不可用（code=${String(code)}），已跳过` : "暂不可用，已跳过",
        };
        continue;
      }
      const tracks = payload.data
        .map((item) => mapTrack(item, source))
        .filter((item): item is SearchHitTrack => item != null);
      if (payload.data.length > 0 && tracks.length === 0) {
        return {
          tracks: [],
          error: {
            providerId: source,
            message: "有命中但无直链，已跳过",
          },
          debug,
        };
      }
      return { tracks, debug };
    } catch (error) {
      lastError = {
        providerId: source,
        message: error instanceof Error ? error.message : "请求失败，已跳过",
      };
    }
  }

  return {
    tracks: [],
    error: lastError ?? {
      providerId: source,
      message: "暂不可用，已跳过",
    },
    debug: lastDebug,
  };
}

function resolveSources(query: SearchQuery): string[] {
  const requested = (query.providerIds ?? []).filter(
    (id) => id && id !== "local" && id !== "sidecar" && id !== "txqq",
  );
  const defaults = getDefaultSearchPlatformIds().filter((id) =>
    (TXQQ_SOURCES as readonly string[]).includes(id),
  );
  const sources = requested.length > 0 ? requested : defaults;
  return sources.filter((id) => (TXQQ_SOURCES as readonly string[]).includes(id));
}

export const txqqMusicProvider: MusicResourceProvider = {
  id: "txqq",
  label: "在线",
  async search(query) {
    const text = query.text.trim();
    if (!text) {
      return emptyPage(query);
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage(query);
    }
    const sources = resolveSources(query);
    const pageNum = Math.max(1, Math.floor(query.page ?? 1));
    const batches = await Promise.all(sources.map((source) => searchSource(text, source, pageNum)));
    const seen = new Set<string>();
    const tracks: SearchHitTrack[] = [];
    const providerErrors: { providerId: string; message: string }[] = [];
    const debugSearchRequests: SearchDebugRequest[] = [];
    for (const batch of batches) {
      if (batch.error) {
        providerErrors.push(batch.error);
      }
      if (batch.debug) {
        debugSearchRequests.push(batch.debug);
      }
      for (const track of batch.tracks) {
        const key = `${track.ref.providerId}:${track.ref.remoteId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        tracks.push(track);
      }
    }
    return {
      ...emptyPage(query),
      tracks,
      providerErrors,
      debugSearchRequests,
      page: pageNum,
      // 聚合源每页常有结果；本页非空则允许试下一页
      hasMore: tracks.length > 0,
    };
  },
  async resolvePlayable(ref) {
    // txqq 搜索阶段已带 playableUrl；点播兜底按 remoteId 精确匹配。
    // 禁止回退 tracks[0]：用 remoteId 当关键词搜时常命中无关曲，会把「更新资源」串成别的歌。
    if (!ref.providerId || ref.providerId === "local" || !ref.remoteId?.trim()) {
      return null;
    }
    const page = await this.search({
      text: ref.remoteId,
      scope: "track",
      providerIds: [ref.providerId],
      limit: 8,
    });
    const hit = page.tracks.find((track) => track.ref.remoteId === ref.remoteId) ?? null;
    if (!hit?.playableUrl) {
      return null;
    }
    return {
      url: hit.playableUrl,
      providerId: hit.ref.providerId,
      remoteId: hit.ref.remoteId,
    } satisfies ResolvedPlayable;
  },
  /**
   * 聚合源无独立艺人/专辑详情接口：多页 name 搜索 + 艺人/专辑字段过滤。
   * 歌单无可靠从属关系 → null。
   */
  async listCollection(query: ListCollectionQuery): Promise<ListCollectionPage | null> {
    return listCollectionByNameSearch(this, query, { maxPages: 3, pageLimit: 30 });
  },
};

function normalizeMusicTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/（.*?）|\(.*?\)|\[.*?\]|【.*?】/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 从 LRC 头取 [ti:...]；无则 null。用于拒绝「歌名对上、歌词却是另一首」的脏数据。 */
export function extractLrcTitleTag(lyrics: string): string | null {
  const match = lyrics.match(/\[ti:\s*([^\]]+)\]/i);
  const raw = match?.[1]?.trim();
  return raw ? raw : null;
}

/** 若 LRC 带 [ti:]，则必须与目标歌名归一化后一致（或互为包含，兼容「歌名 - 艺人」拼进 title）。 */
export function lrcTitleMatchesTrack(lyrics: string, trackTitle: string): boolean {
  const ti = extractLrcTitleTag(lyrics);
  if (!ti) {
    return true;
  }
  const left = normalizeMusicTitle(ti);
  const right = normalizeMusicTitle(trackTitle);
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }
  // 本地上传常把「歌名 - 艺人」整段当 title；允许一侧包含另一侧
  return left.includes(right) || right.includes(left);
}

function scriptBucket(text: string): "latin" | "cjk" | "mixed" | "other" {
  const letters = Array.from(text).filter((ch) => /\p{L}/u.test(ch));
  if (letters.length === 0) {
    return "other";
  }
  let cjk = 0;
  let latin = 0;
  for (const ch of letters) {
    if (/\p{Script=Han}/u.test(ch)) {
      cjk += 1;
    } else if (/[A-Za-z]/.test(ch)) {
      latin += 1;
    }
  }
  if (cjk / letters.length >= 0.55) {
    return "cjk";
  }
  if (latin / letters.length >= 0.55) {
    return "latin";
  }
  return "mixed";
}

function lyricsBodySample(lyrics: string): string {
  return lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\[(ti|ar|al|by|offset):/i.test(line))
    .slice(0, 24)
    .join(" ");
}

/**
 * 歌词是否像属于该曲：先验 [ti:]；无 [ti:] 时拒绝「英文歌名 + 大段中文词」等明显串台。
 * 用于清脏数据 / 更新资源 / 点播补词，避免音源与歌词各来自不同歌。
 */
export function lyricsLikelyBelongToTrack(lyrics: string, trackTitle: string): boolean {
  const title = trackTitle.trim();
  if (!title || !lyrics.trim()) {
    return false;
  }
  if (!lrcTitleMatchesTrack(lyrics, title)) {
    return false;
  }
  // 有 [ti:] 且已通过标题校验，信任
  if (extractLrcTitleTag(lyrics)) {
    return true;
  }
  const titleScript = scriptBucket(title);
  const bodyScript = scriptBucket(lyricsBodySample(lyrics));
  if (titleScript === "latin" && bodyScript === "cjk") {
    return false;
  }
  if (titleScript === "cjk" && bodyScript === "latin") {
    return false;
  }
  return true;
}

const PLATFORM_ARTIST_PLACEHOLDERS = new Set([
  "pixabay",
  "soundstripe",
  "unknown",
  "未知",
  "未知艺人",
]);

/** 点播后若当前源无歌词，按歌名/艺人到其他 txqq 源补一段 LRC（必须标题强匹配，禁止糊名乱配）。 */
export async function findTxqqLyricsText(input: {
  title: string;
  artist?: string | null;
}): Promise<string | null> {
  const title = input.title.trim();
  if (!title) {
    return null;
  }
  const normalizedTitle = normalizeMusicTitle(title);
  if (!normalizedTitle || normalizedTitle.length < 2) {
    return null;
  }
  const artistRaw = (input.artist ?? "").trim();
  const artist = artistRaw.toLowerCase();
  const artistUsable = Boolean(artist) && !PLATFORM_ARTIST_PLACEHOLDERS.has(artist);
  for (const source of TXQQ_SOURCES) {
    const batch = await searchSource(title, source, 1);
    const ranked = batch.tracks
      .filter((hit) => {
        if (!hit.lyrics?.trim()) {
          return false;
        }
        const hitTitle = normalizeMusicTitle(hit.title);
        // 必须归一化标题全等；短英文名（如 Sad）极易误配华语歌，禁止模糊首条命中
        if (hitTitle !== normalizedTitle) {
          return false;
        }
        // API 偶发「歌名对、LRC 是另一首」：再验 [ti:] / 文种串台
        return lyricsLikelyBelongToTrack(hit.lyrics, title);
      })
      .sort((left, right) => {
        if (!artistUsable) {
          return 0;
        }
        const leftArtist = left.artist.toLowerCase().includes(artist) ? 0 : 1;
        const rightArtist = right.artist.toLowerCase().includes(artist) ? 0 : 1;
        return leftArtist - rightArtist;
      });
    const hit = ranked[0];
    if (!hit?.lyrics?.trim()) {
      continue;
    }
    // 有可用艺人时必须艺人也能对上，避免同名异曲
    if (artistUsable && !hit.artist.toLowerCase().includes(artist)) {
      continue;
    }
    return hit.lyrics.trim();
  }
  return null;
}
