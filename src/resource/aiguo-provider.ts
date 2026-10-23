// 场景：爱听系镜像（6uq.cn / 78497.com）— 同类搜站轮换；验证后 HTML 搜索 + play.php 直链。
import type {
  ListCollectionPage,
  ListCollectionQuery,
  MusicResourceProvider,
  ResolvedLyrics,
  ResolvedPlayable,
  SearchHitTrack,
  SearchQuery,
  SearchResultPage,
} from "./types";
import { listCollectionByNameSearch } from "./collection-list-helpers";
import { fetchMusicSidecarJson } from "./sidecar-fetch";

const PROVIDER_ID = "aiguo";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface AiguoMirror {
  id: string;
  origin: string;
  playPath: string;
  playType: string;
  needsCaptcha: boolean;
}

/** 同源模板镜像：搜索/播放路径略有差异，轮换降低单站压力。 */
const AIGUO_MIRRORS: readonly AiguoMirror[] = [
  {
    id: "6uq",
    origin: "https://www.6uq.cn",
    playPath: "/js/play.php",
    playType: "music",
    needsCaptcha: true,
  },
  {
    id: "78497",
    origin: "https://www.78497.com",
    playPath: "/style/js/play.php",
    playType: "mp3",
    needsCaptcha: false,
  },
] as const;

let mirrorCursor = 0;
const sessionReadyUntilByOrigin = new Map<string, number>();

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

function isCaptchaHtml(html: string): boolean {
  return html.includes("安全人机验证") || html.includes('name="csrf_token"');
}

function extractCsrf(html: string): string {
  const match = html.match(/name="csrf_token"\s+value="([^"]+)"/i);
  return match?.[1]?.trim() ?? "";
}

async function fetchAiguo(
  origin: string,
  pathOrUrl: string,
  init?: { method?: "GET" | "POST"; body?: string },
) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${origin}${pathOrUrl}`;
  return fetchMusicSidecarJson(url, {
    method: init?.method ?? "GET",
    body: init?.body,
    headers: {
      Accept: "text/html,application/json,*/*",
      "User-Agent": USER_AGENT,
      Referer: `${origin}/`,
      Origin: origin,
      ...(init?.method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }
        : {}),
    },
    timeoutMs: 20_000,
  });
}

async function ensureMirrorSession(mirror: AiguoMirror, force = false): Promise<void> {
  if (!mirror.needsCaptcha) {
    return;
  }
  const now = Date.now();
  const until = sessionReadyUntilByOrigin.get(mirror.origin) ?? 0;
  if (!force && now < until) {
    return;
  }
  const probeUrl = `${mirror.origin}/`;
  const probe = asRawHtml(await fetchAiguo(mirror.origin, probeUrl));
  if (!isCaptchaHtml(probe)) {
    sessionReadyUntilByOrigin.set(mirror.origin, now + 50 * 60 * 1000);
    return;
  }
  const csrf = extractCsrf(probe);
  if (!csrf) {
    throw new Error("人机验证页缺少 csrf");
  }
  const after = asRawHtml(
    await fetchAiguo(mirror.origin, probeUrl, {
      method: "POST",
      body: new URLSearchParams({
        csrf_token: csrf,
        human_check: "on",
      }).toString(),
    }),
  );
  if (isCaptchaHtml(after)) {
    throw new Error("人机验证未通过");
  }
  sessionReadyUntilByOrigin.set(mirror.origin, now + 50 * 60 * 1000);
}

/** 测试用：重置轮换与会话。 */
export function resetAiguoSessionCache(): void {
  mirrorCursor = 0;
  sessionReadyUntilByOrigin.clear();
}

/** 测试用：镜像列表。 */
export function listAiguoMirrors(): readonly { id: string; origin: string }[] {
  return AIGUO_MIRRORS.map((item) => ({ id: item.id, origin: item.origin }));
}

function parseTitleArtist(label: string): { title: string; artist: string } {
  const cleaned = label
    .replace(/&nbsp;/gi, " ")
    .replace(/\s*\[MP3[^\]]*\]\s*/gi, "")
    .replace(/【[\s\S]*?】/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const book = cleaned.match(/^(.+?)《(.+?)》$/);
  if (book) {
    return { artist: book[1]!.trim() || "未知", title: book[2]!.trim() || cleaned };
  }
  const dash = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dash) {
    return { artist: dash[1]!.trim() || "未知", title: dash[2]!.trim() || cleaned };
  }
  return { artist: "未知", title: cleaned || "未知曲目" };
}

function parseSearchHits(html: string, mirror: AiguoMirror): SearchHitTrack[] {
  const tracks: SearchHitTrack[] = [];
  const seen = new Set<string>();

  // 6uq: /play/{id}.html  + 艺人《歌名》
  const playRe = /href="(?:https?:\/\/[^"]+)?\/play\/([A-Za-z0-9]+)\.html"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = playRe.exec(html)) != null) {
    const remoteId = match[1]!.trim();
    if (!remoteId || seen.has(remoteId)) {
      continue;
    }
    const label = match[2]!.replace(/<[^>]+>/g, "").trim();
    if (!label || label.length < 2) {
      continue;
    }
    seen.add(remoteId);
    const { title, artist } = parseTitleArtist(label);
    tracks.push({
      kind: "track",
      ref: {
        providerId: PROVIDER_ID,
        remoteId: `${mirror.id}:${remoteId}`,
        pageUrl: `${mirror.origin}/play/${remoteId}.html`,
      },
      title,
      artist,
    });
    if (tracks.length >= 18) {
      return tracks;
    }
  }

  // 78497: /mp3/{md5}.html + class="url">艺人 - 歌名
  const mp3Re =
    /href="(?:https?:\/\/[^"]+)?\/mp3\/([a-f0-9]+)\.html"[^>]*class="url"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = mp3Re.exec(html)) != null) {
    const remoteId = match[1]!.trim();
    if (!remoteId || seen.has(remoteId)) {
      continue;
    }
    const label = match[2]!.replace(/<[^>]+>/g, "").trim();
    if (!label || label.length < 2) {
      continue;
    }
    seen.add(remoteId);
    const { title, artist } = parseTitleArtist(label);
    // 封面：同块 img alt 可选，略
    tracks.push({
      kind: "track",
      ref: {
        providerId: PROVIDER_ID,
        remoteId: `${mirror.id}:${remoteId}`,
        pageUrl: `${mirror.origin}/mp3/${remoteId}.html`,
      },
      title,
      artist,
    });
    if (tracks.length >= 18) {
      break;
    }
  }

  return tracks;
}

function splitRemoteId(remoteId: string): { mirrorId: string; songId: string } | null {
  const idx = remoteId.indexOf(":");
  if (idx <= 0) {
    return null;
  }
  return { mirrorId: remoteId.slice(0, idx), songId: remoteId.slice(idx + 1) };
}

function findMirror(mirrorIdOrOrigin: string): AiguoMirror | null {
  return (
    AIGUO_MIRRORS.find(
      (item) => item.id === mirrorIdOrOrigin || item.origin === mirrorIdOrOrigin,
    ) ?? null
  );
}

function resolveMirrorForRef(ref: { remoteId: string; pageUrl?: string }): AiguoMirror | null {
  const split = splitRemoteId(ref.remoteId);
  if (split) {
    const byId = findMirror(split.mirrorId);
    if (byId) {
      return byId;
    }
  }
  if (ref.pageUrl) {
    try {
      const origin = new URL(ref.pageUrl).origin;
      return findMirror(origin);
    } catch {
      // ignore
    }
  }
  return null;
}

function absolutizeMediaUrl(url: string, origin: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return `${origin}${trimmed}`;
  }
  return `${origin}/${trimmed}`;
}

interface PlayPayload {
  msg?: number;
  url?: string;
  pic?: string;
  title?: string;
  name?: string;
  singer?: string;
  lrc?: string;
}

async function fetchPlayPayload(mirror: AiguoMirror, songId: string): Promise<PlayPayload | null> {
  await ensureMirrorSession(mirror);
  const payload = await fetchAiguo(mirror.origin, mirror.playPath, {
    method: "POST",
    body: new URLSearchParams({ id: songId, type: mirror.playType }).toString(),
  });
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  if ("raw" in payload) {
    return null;
  }
  return payload as PlayPayload;
}

function orderedMirrors(): AiguoMirror[] {
  const start = mirrorCursor % AIGUO_MIRRORS.length;
  mirrorCursor = (start + 1) % AIGUO_MIRRORS.length;
  const ordered: AiguoMirror[] = [];
  for (let offset = 0; offset < AIGUO_MIRRORS.length; offset += 1) {
    ordered.push(AIGUO_MIRRORS[(start + offset) % AIGUO_MIRRORS.length]!);
  }
  return ordered;
}

async function searchOnMirror(
  mirror: AiguoMirror,
  text: string,
): Promise<{ tracks: SearchHitTrack[]; error?: string; searchUrl: string }> {
  const searchUrl = `${mirror.origin}/so/${encodeURIComponent(text)}.html`;
  try {
    await ensureMirrorSession(mirror);
    let html = asRawHtml(await fetchAiguo(mirror.origin, searchUrl));
    if (isCaptchaHtml(html)) {
      await ensureMirrorSession(mirror, true);
      html = asRawHtml(await fetchAiguo(mirror.origin, searchUrl));
    }
    if (isCaptchaHtml(html) || !html) {
      return { tracks: [], searchUrl, error: "需要人机验证，已跳过" };
    }
    const tracks = parseSearchHits(html, mirror);
    return { tracks, searchUrl };
  } catch (error) {
    return {
      tracks: [],
      searchUrl,
      error: error instanceof Error ? error.message : "请求失败，已跳过",
    };
  }
}

export const aiguoMusicProvider: MusicResourceProvider = {
  id: PROVIDER_ID,
  label: "爱听",
  async search(query) {
    const text = query.text.trim();
    if (!text) {
      return emptyPage(query);
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage(query);
    }

    let lastError: string | undefined;
    let lastSearchUrl: string | undefined;
    for (const mirror of orderedMirrors()) {
      const result = await searchOnMirror(mirror, text);
      lastSearchUrl = result.searchUrl;
      if (result.tracks.length > 0) {
        return {
          ...emptyPage(query),
          tracks: result.tracks,
          debugSearchRequests: [
            {
              providerId: PROVIDER_ID,
              url: result.searchUrl,
              compareUrl: result.searchUrl,
            },
          ],
        };
      }
      if (result.error) {
        lastError = result.error;
      }
    }
    return {
      ...emptyPage(query),
      providerErrors: lastError ? [{ providerId: PROVIDER_ID, message: lastError }] : [],
      debugSearchRequests: lastSearchUrl
        ? [
            {
              providerId: PROVIDER_ID,
              url: lastSearchUrl,
              compareUrl: lastSearchUrl,
            },
          ]
        : undefined,
    };
  },
  async resolvePlayable(ref) {
    if (ref.providerId !== PROVIDER_ID || !ref.remoteId) {
      return null;
    }
    const split = splitRemoteId(ref.remoteId);
    const songId = split?.songId ?? ref.remoteId;
    const preferred = resolveMirrorForRef(ref);
    const mirrors = preferred
      ? [preferred, ...AIGUO_MIRRORS.filter((item) => item.id !== preferred.id)]
      : [...AIGUO_MIRRORS];
    for (const mirror of mirrors) {
      try {
        const payload = await fetchPlayPayload(mirror, songId);
        const url = absolutizeMediaUrl(payload?.url ?? "", mirror.origin);
        if (!url || payload?.msg !== 1) {
          continue;
        }
        return {
          url,
          providerId: PROVIDER_ID,
          remoteId: ref.remoteId,
        } satisfies ResolvedPlayable;
      } catch {
        // try next mirror
      }
    }
    return null;
  },
  async fetchLyrics(ref) {
    if (ref.providerId !== PROVIDER_ID || !ref.remoteId) {
      return null;
    }
    const split = splitRemoteId(ref.remoteId);
    const songId = split?.songId ?? ref.remoteId;
    const preferred = resolveMirrorForRef(ref);
    const mirrors = preferred ? [preferred] : [...AIGUO_MIRRORS];
    for (const mirror of mirrors) {
      try {
        await ensureMirrorSession(mirror);
        // 6uq 歌词插件；78497 常把 lrc 放在 play 响应里
        const play = await fetchPlayPayload(mirror, songId);
        const fromPlay = typeof play?.lrc === "string" ? play.lrc.trim() : "";
        if (fromPlay && !fromPlay.includes("版权方要求")) {
          return {
            providerId: PROVIDER_ID,
            remoteId: ref.remoteId,
            text: fromPlay,
          } satisfies ResolvedLyrics;
        }
        if (mirror.id === "6uq") {
          const payload = (await fetchAiguo(
            mirror.origin,
            `/plug/lrcgc.php?id=${encodeURIComponent(songId)}`,
          )) as { lrc?: string } | null;
          const text = typeof payload?.lrc === "string" ? payload.lrc.trim() : "";
          if (text) {
            return {
              providerId: PROVIDER_ID,
              remoteId: ref.remoteId,
              text,
            } satisfies ResolvedLyrics;
          }
        }
      } catch {
        // next
      }
    }
    return null;
  },
  /**
   * 爱听无合集 API：按艺人/专辑名 HTML 搜索后过滤。
   */
  async listCollection(query: ListCollectionQuery): Promise<ListCollectionPage | null> {
    return listCollectionByNameSearch(this, query, { maxPages: 1, pageLimit: 40 });
  },
};
