// 场景：Agent「按关键词播歌」— 本地曲库优先，未命中则在线搜索→落盘→播放。
import type { WorkspaceAppHostApi } from "@getagnx/app-sdk";
import { downloadAndPersistTrackBundle } from "./resource/download-bundle";
import { searchPlayableMusic } from "./resource/service";
import type { SearchHitTrack } from "./resource/types";
import {
  isMusicTrackDownloadedLocally,
  listTracksAsWorkspaceItems,
  useMusicDemoStore,
  type DemoTrack,
} from "./store";
import {
  applyMusicPlaybackIntent,
  ensureMusicPlaybackRuntime,
  loadAndPlayTrackUriHeadless,
} from "./playback-runtime";

export type PlayQuerySource = "local" | "online" | "unknown";

export interface PlayQueryResult {
  ok: boolean;
  query: string;
  source: PlayQuerySource;
  phase: "matched_local" | "searched_online" | "downloaded" | "playing" | "error";
  trackId?: string;
  title?: string;
  artist?: string;
  downloaded?: boolean;
  audioPaused?: boolean | null;
  message: string;
  candidates?: Array<{
    title: string;
    artist: string;
    source: PlayQuerySource;
    trackId?: string;
    providerId?: string;
  }>;
  error?: string;
  /** 选曲评分器版本，便于冒烟确认 remount */
  scorer?: string;
}

function normalizeQuery(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/** 自然语言去噪：一首/相关/风格/播放 等，便于「春日相关」命中「春日*」 */
const QUERY_NOISE_RE =
  /(?:帮我|给我|请|一首|首歌|歌曲|音乐|曲目|相关|风格|类型|类似|那种|的歌|播放|播一下|播首|听听|想听|来首|来一首)/g;

/** 英文虚词/过短词，禁止单独拉高本地命中（避免 you/up 误匹配） */
const LATIN_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "for",
  "from",
  "give",
  "gonna",
  "got",
  "have",
  "i",
  "in",
  "is",
  "it",
  "its",
  "me",
  "music",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "play",
  "playing",
  "related",
  "song",
  "songs",
  "the",
  "to",
  "track",
  "up",
  "wanna",
  "with",
  "you",
  "your",
]);

/** 本地命中最低分：需实质标题/艺人匹配，不能靠虚词+已下载 bonus */
const LOCAL_MATCH_MIN_SCORE = 24;

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function isSignificantToken(token: string): boolean {
  if (token.length < 2) return false;
  if (hasCjk(token)) {
    return token.length >= 2;
  }
  if (LATIN_STOPWORDS.has(token)) return false;
  // 拉丁词至少 4 字符，避免 you/up/my 等误命中
  return token.length >= 4;
}

function extractQueryTokens(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const tokens = new Set<string>();
  tokens.add(q);

  for (const part of q.split(/[\s,，、/+\-_|]+/)) {
    if (part.length >= 2) tokens.add(part);
  }

  const cleaned = q.replace(QUERY_NOISE_RE, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length >= 2) {
    tokens.add(cleaned);
    for (const part of cleaned.split(/[\s,，、/+\-_|]+/)) {
      if (part.length >= 2) tokens.add(part);
    }
  }

  // 中文：去噪后整段 + 2 字前缀（春日相关 → 春日），不做全量 n-gram 避免噪声
  const cjkChunks = `${q} ${cleaned}`.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  for (const chunk of cjkChunks) {
    const deNoised = chunk.replace(QUERY_NOISE_RE, "").trim();
    if (deNoised.length >= 2) tokens.add(deNoised);
    if (chunk.length >= 2) tokens.add(chunk.slice(0, 2));
    if (deNoised.length >= 4) tokens.add(deNoised.slice(0, 4));
  }

  return [...tokens].filter((token) => token.length >= 2);
}

function scoreFieldMatch(field: string, query: string, tokens: readonly string[]): number {
  let score = 0;
  if (!field) return 0;
  if (field === query) score += 100;
  // 整句 includes 仅当 query 本身是有效 token（避免 you/up 误加 50）
  else if (isSignificantToken(query) && field.includes(query)) score += 50;

  for (const token of tokens) {
    if (token === query) continue;
    if (!isSignificantToken(token)) continue;
    if (field === token) score += 28;
    else if (field.includes(token)) {
      // 中文有效片段（春日）给足本地阈值；英文 partial 略低
      score += hasCjk(token) ? 28 : 16;
    }
  }
  return score;
}

function significantTokenCoverage(
  fields: readonly string[],
  tokens: readonly string[],
): { hit: number; total: number } {
  const unique = [...new Set(tokens.filter(isSignificantToken))];
  if (unique.length === 0) return { hit: 0, total: 0 };
  let hit = 0;
  for (const token of unique) {
    if (fields.some((field) => field.includes(token))) hit += 1;
  }
  return { hit, total: unique.length };
}

function scoreLocalTrack(track: DemoTrack, query: string): number {
  const q = query.toLowerCase();
  const title = track.title.toLowerCase();
  const artist = (track.artist || "").toLowerCase();
  const album = (track.album || "").toLowerCase();
  const tokens = extractQueryTokens(q);
  let score = 0;
  score += scoreFieldMatch(title, q, tokens);
  score += Math.floor(scoreFieldMatch(artist, q, tokens) * 0.6);
  score += Math.floor(scoreFieldMatch(album, q, tokens) * 0.3);

  const coverage = significantTokenCoverage([title, artist, album], tokens);
  // 多词英文：至少命中 1 个有效 token，且覆盖率过低时降权
  if (coverage.total >= 2 && coverage.hit === 0) {
    return 0;
  }
  if (coverage.total >= 3 && coverage.hit / coverage.total < 0.34) {
    score = Math.min(score, 10);
  }

  // 仅下载 bonus 不足以过阈值
  if (score > 0 && isMusicTrackDownloadedLocally(track)) score += 5;
  return score;
}

export function findBestLocalTrack(query: string): DemoTrack | null {
  const text = query.trim();
  if (!text) return null;
  const items = listTracksAsWorkspaceItems(text);
  const store = useMusicDemoStore.getState();
  let best: { track: DemoTrack; score: number } | null = null;
  for (const item of items) {
    const track = store.getTrack(item.id);
    if (!track) continue;
    const score = scoreLocalTrack(track, text);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { track, score };
    }
  }
  // listTracks 可能用关键词过滤过严时，再扫一遍全库
  if (!best) {
    for (const track of store.tracks) {
      const score = scoreLocalTrack(track, text);
      if (score <= 0) continue;
      if (!best || score > best.score) {
        best = { track, score };
      }
    }
  }
  return best && best.score >= LOCAL_MATCH_MIN_SCORE ? best.track : null;
}

function scoreOnlineHit(hit: SearchHitTrack, query: string): number {
  const q = query.toLowerCase();
  const title = hit.title.toLowerCase();
  const artist = (hit.artist || "").toLowerCase();
  const tokens = extractQueryTokens(q);
  let score = 0;
  score += scoreFieldMatch(title, q, tokens);
  score += Math.floor(scoreFieldMatch(artist, q, tokens) * 0.5);
  if (hit.localTrackId) score += 40;
  if (hit.playableUrl?.trim()) score += 15;
  if (hit.ref.providerId === "local") score += 20;
  return score;
}

export function pickBestOnlineHit(
  hits: readonly SearchHitTrack[],
  query: string,
): SearchHitTrack | null {
  const scored: Array<{ hit: SearchHitTrack; score: number }> = [];
  for (const hit of hits) {
    if (hit.kind !== "track") continue;
    const score = scoreOnlineHit(hit, query);
    if (score < 12) continue;
    scored.push({ hit, score });
  }
  if (scored.length === 0) return null;

  // 在线结果里：已有 localTrackId 的优先（库内已存在，无需重复落盘）
  const localLinked = scored.filter((entry) => Boolean(entry.hit.localTrackId));
  const pool = localLinked.length > 0 ? localLinked : scored;
  pool.sort((a, b) => b.score - a.score);
  return pool[0]?.hit ?? null;
}

async function playTrackById(trackId: string): Promise<{
  ok: boolean;
  audioPaused: boolean | null;
  error?: string;
}> {
  ensureMusicPlaybackRuntime();
  const store = useMusicDemoStore.getState();
  const track = store.getTrack(trackId);
  if (!track) {
    return { ok: false, audioPaused: null, error: `Unknown trackId: ${trackId}` };
  }
  store.setNowPlaying(trackId);
  // 已有本地/可播 URI：headless 换源，避免仅改 wantsPlaying 不换曲
  const uri = track.sourceUri?.trim() || "";
  if (uri) {
    const started = await loadAndPlayTrackUriHeadless({
      trackId,
      sourceUri: uri,
    });
    const audioPaused = started ? false : null;
    if (started) {
      return { ok: true, audioPaused };
    }
  }
  const applied = await applyMusicPlaybackIntent(true);
  return { ok: true, audioPaused: applied.audioPaused };
}

const ONLINE_SEARCH_TIMEOUT_MS = 12_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 按自然语言/关键词播歌：
 * 1) 本地曲库模糊匹配
 * 2) 在线 searchPlayableMusic
 * 3) upsert + downloadAndPersist（尽量本地化）
 * 4) setNowPlaying + 真实 Audio 播放
 */
function buildLocalHitPlayResult(
  query: string,
  hit: SearchHitTrack,
  trackId: string,
  played: { ok: boolean; audioPaused: boolean | null; error?: string },
): PlayQueryResult {
  const track = useMusicDemoStore.getState().getTrack(trackId);
  return {
    ok: played.ok,
    query,
    source: "local",
    phase: played.ok ? "playing" : "error",
    trackId,
    title: track?.title ?? hit.title,
    artist: track?.artist ?? hit.artist,
    downloaded: track ? isMusicTrackDownloadedLocally(track) : false,
    audioPaused: played.audioPaused,
    message: played.ok
      ? `正在播放本地曲目：${track?.title ?? hit.title}`
      : played.error || "播放失败",
    error: played.ok ? undefined : played.error || "play_failed",
  };
}

async function tryDownloadTrack(
  host: WorkspaceAppHostApi,
  trackId: string,
  playableUrl: string | null | undefined,
): Promise<{ downloaded: boolean; error?: string }> {
  try {
    await downloadAndPersistTrackBundle(host, trackId, {
      playableUrl: playableUrl ?? null,
    });
    return { downloaded: true };
  } catch (error) {
    return {
      downloaded: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildOnlinePlayResult(input: {
  query: string;
  hit: SearchHitTrack;
  trackId: string;
  downloaded: boolean;
  played: { ok: boolean; audioPaused: boolean | null; error?: string };
  downloadError?: string;
}): PlayQueryResult {
  const { query, hit, trackId, downloaded, played, downloadError } = input;
  const latest = useMusicDemoStore.getState().getTrack(trackId);
  const title = latest?.title ?? hit.title;
  const artist = latest?.artist ?? hit.artist;

  if (!played.ok) {
    if (downloadError && !downloaded) {
      return {
        ok: false,
        query,
        source: "online",
        phase: "error",
        trackId,
        title: hit.title,
        artist: hit.artist,
        message: `已搜索到「${hit.title}」但下载/播放失败：${downloadError}`,
        error: downloadError,
      };
    }
    return {
      ok: false,
      query,
      source: "online",
      phase: downloaded ? "downloaded" : "searched_online",
      trackId,
      title,
      artist,
      downloaded,
      message: played.error || "播放失败",
      error: played.error || "play_failed",
    };
  }

  let message = downloaded
    ? `已搜索、下载并播放：${title} – ${artist}`
    : `已搜索并播放：${title} – ${artist}`;
  if (downloadError && !downloaded) {
    message = `已搜索并播放（落盘失败：${downloadError}）：${title}`;
  }

  return {
    ok: true,
    query,
    source: "online",
    phase: "playing",
    trackId,
    title,
    artist,
    downloaded,
    audioPaused: played.audioPaused,
    message,
  };
}

async function playOnlineHit(input: {
  host: WorkspaceAppHostApi;
  query: string;
  hit: SearchHitTrack;
  download: boolean;
}): Promise<PlayQueryResult> {
  const { host, query, hit, download: shouldDownload } = input;
  if (hit.localTrackId) {
    const played = await playTrackById(hit.localTrackId);
    return buildLocalHitPlayResult(query, hit, hit.localTrackId, played);
  }

  const upserted = useMusicDemoStore.getState().upsertTrackFromSearchHit(hit);
  let downloaded = false;
  let downloadError: string | undefined;
  if (shouldDownload) {
    const result = await tryDownloadTrack(host, upserted.id, hit.playableUrl);
    downloaded = result.downloaded;
    downloadError = result.error;
  }

  const played = await playTrackById(upserted.id);
  return buildOnlinePlayResult({
    query,
    hit,
    trackId: upserted.id,
    downloaded,
    played,
    downloadError,
  });
}

/**
 * 按自然语言/关键词播歌：
 * 1) 本地曲库模糊匹配
 * 2) 在线 searchPlayableMusic
 * 3) upsert + downloadAndPersist（尽量本地化）
 * 4) setNowPlaying + 真实 Audio 播放
 */
export async function playMusicByQuery(input: {
  host: WorkspaceAppHostApi;
  query: string;
  preferLocalOnly?: boolean;
  download?: boolean;
  providerIds?: string[];
}): Promise<PlayQueryResult> {
  const query = normalizeQuery(input.query);
  if (!query) {
    return {
      ok: false,
      query: "",
      source: "unknown",
      phase: "error",
      message: "query 不能为空",
      error: "empty_query",
    };
  }

  const local = findBestLocalTrack(query);
  if (local) {
    const played = await playTrackById(local.id);
    if (!played.ok) {
      return {
        ok: false,
        query,
        source: "local",
        phase: "error",
        trackId: local.id,
        title: local.title,
        artist: local.artist,
        message: played.error || "本地曲目播放失败",
        error: played.error || "play_failed",
      };
    }
    return {
      ok: true,
      query,
      source: "local",
      phase: "playing",
      trackId: local.id,
      title: local.title,
      artist: local.artist,
      downloaded: isMusicTrackDownloadedLocally(local),
      audioPaused: played.audioPaused,
      message: `正在播放本地曲目：${local.title} – ${local.artist || "未知艺人"}`,
      scorer: "v2-stopwords",
    };
  }

  if (input.preferLocalOnly) {
    return {
      ok: false,
      query,
      source: "local",
      phase: "error",
      message: `本地曲库未找到与「${query}」相关的歌曲`,
      error: "local_not_found",
      scorer: "v2-stopwords",
    };
  }

  let page;
  try {
    const providerIds =
      input.providerIds && input.providerIds.length > 0
        ? input.providerIds
        : useMusicDemoStore.getState().searchProviderIds.slice();
    page = await withTimeout(
      searchPlayableMusic({
        text: query,
        scope: "track",
        limit: 12,
        page: 1,
        providerIds,
      }),
      ONLINE_SEARCH_TIMEOUT_MS,
      `在线搜索超时（>${ONLINE_SEARCH_TIMEOUT_MS}ms）`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      query,
      source: "online",
      phase: "searched_online",
      message: `搜索「${query}」失败：${message}`,
      error: message.includes("超时") ? "online_search_timeout" : "online_search_failed",
      scorer: "v2-stopwords",
    };
  }

  const hit = pickBestOnlineHit(page.tracks, query);
  if (!hit) {
    return {
      ok: false,
      query,
      source: "online",
      phase: "searched_online",
      message: `未搜索到可播放的「${query}」相关歌曲`,
      error: "online_not_found",
      scorer: "v2-stopwords",
      candidates: page.tracks.slice(0, 5).map((item) => ({
        title: item.title,
        artist: item.artist,
        source: item.localTrackId ? "local" : "online",
        trackId: item.localTrackId,
        providerId: item.ref.providerId,
      })),
    };
  }

  return playOnlineHit({
    host: input.host,
    query,
    hit,
    download: input.download !== false,
  });
}
