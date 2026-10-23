// 场景：Pixabay / Soundstripe — 隐藏浏览器列多首结果；点播时再截该曲音流。
import { captureMusicBrowserMedia, hasMusicBrowserCapture } from "./host-media";
import { buildPixabayMusicSearchUrl, buildSoundstripeLibrarySearchUrl } from "./search-debug-urls";
import type {
  MusicResourceProvider,
  RemoteRef,
  ResolvedPlayable,
  SearchDebugRequest,
  SearchHitTrack,
  SearchQuery,
  SearchResultPage,
} from "./types";

function emptyPage(
  query: SearchQuery,
  error?: string,
  providerId?: string,
  debugSearchRequests?: SearchDebugRequest[],
): SearchResultPage {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: error && providerId ? [{ providerId, message: error }] : [],
    debugSearchRequests,
  };
}

function shortIdFromUrl(url: string): string {
  let hash = 0;
  for (let index = 0; index < url.length; index += 1) {
    hash = (hash * 31 + url.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

const UI_TITLE_RE =
  /^(play|download|like|save|music|pixabay|soundstripe|简体中文|繁體中文|繁体中文|english|explore|upload|login|join)$/i;

/** 平台名不能当艺人（Soundstripe / Pixabay 是源，不是作者） */
const PLATFORM_ARTIST_RE = /^(pixabay|sound\s*stripe|soundstripe)$/i;

function sanitizeBrowserArtist(
  value: string | undefined,
  options?: { mediaUrl?: string; providerId?: string },
): string {
  const raw = value?.trim() ?? "";
  if (raw && !UI_TITLE_RE.test(raw) && !PLATFORM_ARTIST_RE.test(raw)) {
    return raw;
  }
  if (options?.providerId === "pixabay") {
    const fromMedia = artistFromPixabayMediaUrl(options.mediaUrl);
    if (fromMedia && !PLATFORM_ARTIST_RE.test(fromMedia)) {
      return fromMedia;
    }
  }
  return "未知";
}

const PIXABAY_CATEGORIES = new Set([
  "beat",
  "beats",
  "loop",
  "loops",
  "funk",
  "ambient",
  "corporate",
  "cinematic",
  "upbeat",
  "acoustic",
  "electronic",
  "rock",
  "pop",
  "jazz",
  "classical",
  "folk",
  "world",
  "holiday",
]);

function isBadMusicTitle(value: string | undefined): boolean {
  const title = value?.trim() ?? "";
  return !title || title.length < 2 || title.length > 160 || UI_TITLE_RE.test(title);
}

/** 从 Pixabay 页面 / CDN filename 推断歌名。 */
function titleFromPixabayUrl(url: string | undefined): string | undefined {
  const raw = url?.trim();
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = new URL(raw);
    const fileNameParam = parsed.searchParams.get("filename");
    if (fileNameParam) {
      // monas-soft-static-369035.mp3 → soft static
      const base = fileNameParam.replace(/\.[a-z0-9]+$/i, "");
      const parts = base.replace(/-\d+$/, "").split("-").filter(Boolean);
      if (parts.length >= 2) {
        return parts.slice(1).join(" ");
      }
      return parts.join(" ") || undefined;
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    const slug = segments[segments.length - 1] || "";
    let parts = slug.replace(/-\d+$/, "").split("-").filter(Boolean);
    if (parts.length >= 2 && PIXABAY_CATEGORIES.has(parts[0]!.toLowerCase())) {
      parts = parts.slice(1);
    }
    const title = parts.join(" ").trim();
    return title || undefined;
  } catch {
    return undefined;
  }
}

function artistFromPixabayMediaUrl(url: string | undefined): string | undefined {
  const raw = url?.trim();
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = new URL(raw);
    const fileNameParam = parsed.searchParams.get("filename");
    if (!fileNameParam) {
      return undefined;
    }
    const base = fileNameParam.replace(/\.[a-z0-9]+$/i, "");
    const parts = base.replace(/-\d+$/, "").split("-").filter(Boolean);
    const artist = (parts.length > 0 ? parts[0] : undefined)?.trim();
    if (!artist || UI_TITLE_RE.test(artist) || artist.toLowerCase() === "audio") {
      return undefined;
    }
    return artist;
  } catch {
    return undefined;
  }
}

function sanitizeCapturedTitle(
  title: string | undefined,
  pageUrl?: string,
  mediaUrl?: string,
): string {
  if (!isBadMusicTitle(title)) {
    return title!.trim();
  }
  return (
    titleFromPixabayUrl(mediaUrl) || titleFromPixabayUrl(pageUrl) || title?.trim() || "Unknown"
  );
}

function tracksFromCapture(
  providerId: string,
  capture: {
    tracks?: Array<{
      title: string;
      artist?: string;
      pageUrl?: string;
      mediaUrl?: string;
      coverUrl?: string;
      durationMs?: number;
    }>;
    mediaUrls: string[];
    title: string;
  },
  fallbackQuery: string,
): SearchHitTrack[] {
  const fromList = (capture.tracks ?? [])
    .filter((track) => (track.pageUrl || track.mediaUrl) && track.title.trim())
    .map((track) => {
      const pageUrl = track.pageUrl?.trim();
      const mediaUrl = track.mediaUrl?.trim();
      const coverUrl = track.coverUrl?.trim();
      const remoteKey = pageUrl || mediaUrl || track.title;
      const title = sanitizeCapturedTitle(track.title, pageUrl, mediaUrl);
      const artist = sanitizeBrowserArtist(track.artist, { mediaUrl, providerId });
      const durationMs =
        typeof track.durationMs === "number" &&
        Number.isFinite(track.durationMs) &&
        track.durationMs > 0
          ? Math.floor(track.durationMs)
          : undefined;
      return {
        kind: "track" as const,
        ref: {
          providerId,
          remoteId: `${providerId}:${shortIdFromUrl(remoteKey)}`,
          pageUrl,
        },
        title,
        artist,
        coverUrl: coverUrl || undefined,
        durationMs,
        playableUrl: mediaUrl,
      };
    })
    .filter((track) => !isBadMusicTitle(track.title));
  if (fromList.length > 0) {
    return fromList;
  }
  const mediaUrl = capture.mediaUrls.find(
    (url) => /\.(mp3|m4a)(\?|$)/i.test(url) || /audio/i.test(url),
  );
  if (!mediaUrl) {
    return [];
  }
  return [
    {
      kind: "track",
      ref: {
        providerId,
        remoteId: `${providerId}:${shortIdFromUrl(mediaUrl)}`,
      },
      title:
        sanitizeCapturedTitle(
          capture.title.replace(/\s*[-–|].*$/, "").trim(),
          undefined,
          mediaUrl,
        ) ||
        fallbackQuery ||
        "Web capture",
      artist: sanitizeBrowserArtist(undefined, { mediaUrl, providerId }),
      playableUrl: mediaUrl,
    },
  ];
}

async function searchViaBrowserPreset(input: {
  providerId: string;
  label: string;
  query: SearchQuery;
  preset: "pixabay-music-search" | "soundstripe-library-search";
}): Promise<SearchResultPage> {
  const text = input.query.text.trim();
  const pageNum = Math.max(1, Math.floor(input.query.page ?? 1));
  const plannedUrl =
    input.preset === "pixabay-music-search"
      ? buildPixabayMusicSearchUrl(text, pageNum)
      : buildSoundstripeLibrarySearchUrl(text, pageNum);
  const debugBase: SearchDebugRequest = {
    providerId: input.providerId,
    url: plannedUrl,
    compareUrl: plannedUrl,
    note: pageNum > 1 ? `第 ${pageNum} 页` : "隐藏浏览器将打开此页刮列表",
  };
  if (!hasMusicBrowserCapture()) {
    return emptyPage(input.query, "需要桌面 Electron 隐藏浏览器会话", input.providerId, [
      debugBase,
    ]);
  }
  if (!text) {
    return emptyPage(input.query);
  }
  try {
    const capture = await captureMusicBrowserMedia({
      preset: input.preset,
      query: text,
      timeoutMs: 40_000,
      listOnly: true,
      page: pageNum,
    });
    const finalUrl = capture.finalUrl?.trim() || plannedUrl;
    const debug: SearchDebugRequest = {
      ...debugBase,
      url: finalUrl,
      compareUrl: plannedUrl,
      note: finalUrl !== plannedUrl ? `计划打开 ${plannedUrl}` : debugBase.note,
    };
    const tracks = tracksFromCapture(input.providerId, capture, text);
    if (tracks.length === 0) {
      const hint = capture.pageHint?.trim() || `未解析到曲目列表（title=${capture.title || "?"}）`;
      return {
        ...emptyPage(input.query, hint, input.providerId, [debug]),
        page: pageNum,
        hasMore: false,
      };
    }
    return {
      query: input.query,
      suggestions: [],
      tracks,
      artists: [],
      albums: [],
      playlists: [],
      providerErrors: [],
      debugSearchRequests: [debug],
      page: pageNum,
      hasMore: Boolean(capture.hasMore),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : `${input.label} 搜索失败`;
    const friendly = /ERR_CONNECTION_CLOSED|ERR_CONNECTION_RESET|net::ERR_/i.test(message)
      ? `${input.label} 网络被中断（可重试；若反复失败检查代理/VPN）`
      : message;
    return {
      ...emptyPage(input.query, friendly, input.providerId, [debugBase]),
      page: pageNum,
      hasMore: false,
    };
  }
}

function pickCapturedMediaUrl(capture: {
  tracks?: Array<{ pageUrl?: string; mediaUrl?: string }>;
  mediaUrls: string[];
}): {
  mediaUrl: string;
  meta?: { title?: string; artist?: string; coverUrl?: string; pageUrl?: string };
} | null {
  const meta =
    capture.tracks?.find((track) => Boolean(track.mediaUrl)) || capture.tracks?.[0] || undefined;
  const mediaUrl =
    meta?.mediaUrl ||
    capture.mediaUrls.find(
      (url) =>
        /\.(mp3|m4a)(\?|$)/i.test(url) ||
        /cdn\.pixabay\.com\/(?:download\/)?audio\//i.test(url) ||
        /cdn\.soundstripe\.com/i.test(url) ||
        (/soundstripe/i.test(url) && /\/(audio|media|stream)\//i.test(url)) ||
        /audio\//i.test(url),
    );
  if (!mediaUrl) {
    return null;
  }
  return { mediaUrl, meta };
}

function buildResolvedFromCapture(
  ref: RemoteRef,
  pageUrl: string,
  capture: {
    tracks?: Array<{
      title?: string;
      artist?: string;
      pageUrl?: string;
      mediaUrl?: string;
      coverUrl?: string;
    }>;
    mediaUrls: string[];
  },
): ResolvedPlayable {
  const picked = pickCapturedMediaUrl(capture);
  if (!picked) {
    throw new Error("未截到可播音流（详情页无 mp3 / 播放未触发）");
  }
  const meta =
    capture.tracks?.find((track) => track.pageUrl === pageUrl) ||
    picked.meta ||
    capture.tracks?.[0];
  const mediaUrl = picked.mediaUrl;
  const title = sanitizeCapturedTitle(meta?.title?.trim(), pageUrl, mediaUrl);
  const artist = sanitizeBrowserArtist(meta?.artist, {
    mediaUrl,
    providerId: ref.providerId,
  });
  return {
    url: mediaUrl,
    providerId: ref.providerId,
    remoteId: ref.remoteId,
    title: isBadMusicTitle(title) ? undefined : title,
    artist: artist === "未知" ? undefined : artist,
    coverUrl: meta?.coverUrl?.trim() || undefined,
  };
}

async function resolveViaPageCapture(ref: RemoteRef): Promise<ResolvedPlayable | null> {
  const pageUrl = ref.pageUrl?.trim();
  if (!pageUrl || !hasMusicBrowserCapture()) {
    return null;
  }
  const capture = await captureMusicBrowserMedia({
    pageUrl,
    preset: "none",
    timeoutMs: 45_000,
    listOnly: false,
    clickButtonText: ref.providerId === "soundstripe" ? "Preview" : "Play",
  });
  return buildResolvedFromCapture(ref, pageUrl, capture);
}

export const pixabayMusicProvider: MusicResourceProvider = {
  id: "pixabay",
  label: "Pixabay",
  async search(query) {
    return searchViaBrowserPreset({
      providerId: "pixabay",
      label: "Pixabay",
      query,
      preset: "pixabay-music-search",
    });
  },
  async resolvePlayable(ref) {
    if (ref.providerId !== "pixabay") {
      return null;
    }
    return resolveViaPageCapture(ref);
  },
};

export const soundstripeMusicProvider: MusicResourceProvider = {
  id: "soundstripe",
  label: "Soundstripe",
  async search(query) {
    return searchViaBrowserPreset({
      providerId: "soundstripe",
      label: "Soundstripe",
      query,
      preset: "soundstripe-library-search",
    });
  },
  async resolvePlayable(ref) {
    if (ref.providerId !== "soundstripe") {
      return null;
    }
    return resolveViaPageCapture(ref);
  },
};
