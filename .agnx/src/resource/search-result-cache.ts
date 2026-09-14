// 场景：搜索结果按关键词缓存 — TTL 只决定「搜索时是否重新打网」，过期不删条目、不清搜索历史。
import type { SearchResultPage, SearchScope } from "./types";

export const DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES = 15;

export interface MusicSearchResultCacheEntry {
  query: string;
  scope: SearchScope;
  providerIds: string[];
  page: SearchResultPage;
  updatedAt: number;
}

export function buildMusicSearchCacheKey(input: {
  query: string;
  scope: SearchScope;
  providerIds: string[];
}): string {
  const providers = [...input.providerIds]
    .map((id) => id.trim())
    .filter(Boolean)
    .sort();
  return `${input.scope}::${input.query.trim().toLowerCase()}::${providers.join(",")}`;
}

/**
 * 缓存是否仍在 TTL 内。
 * false = 下次搜索应打网刷新；**不得**据此删除缓存或清空 searchHistory。
 */
export function isMusicSearchCacheFresh(
  entry: MusicSearchResultCacheEntry | null | undefined,
  ttlMinutes: number,
  now = Date.now(),
): boolean {
  if (!entry?.page || !entry.updatedAt) {
    return false;
  }
  const ttlMs = Math.max(1, ttlMinutes) * 60_000;
  return now - entry.updatedAt < ttlMs;
}

/** 有缓存但已过 TTL → 应展示旧结果并后台重拉。 */
export function shouldBackgroundRefreshMusicSearchCache(
  entry: MusicSearchResultCacheEntry | null | undefined,
  ttlMinutes: number,
  now = Date.now(),
): boolean {
  return Boolean(entry?.page) && !isMusicSearchCacheFresh(entry, ttlMinutes, now);
}

/** 从结果缓存恢复关键词列表（历史被误清空时的兜底，不替代 searchHistory 持久化）。 */
export function listQueriesFromMusicSearchCaches(
  entries: readonly MusicSearchResultCacheEntry[],
  max = 12,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    const q = entry.query?.trim();
    if (!q) {
      continue;
    }
    const key = q.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(q);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

export function findMusicSearchCacheEntry(
  entries: MusicSearchResultCacheEntry[],
  input: { query: string; scope: SearchScope; providerIds: string[] },
): MusicSearchResultCacheEntry | null {
  const key = buildMusicSearchCacheKey(input);
  return (
    entries.find(
      (entry) =>
        buildMusicSearchCacheKey({
          query: entry.query,
          scope: entry.scope,
          providerIds: entry.providerIds,
        }) === key,
    ) ?? null
  );
}

/** 按关键词 + 来源找缓存（忽略 scope）；优先 all，供历史点击即时命中。 */
export function findMusicSearchCacheEntryForQuery(
  entries: MusicSearchResultCacheEntry[],
  input: { query: string; providerIds: string[] },
): MusicSearchResultCacheEntry | null {
  const query = input.query.trim().toLowerCase();
  if (!query) {
    return null;
  }
  const providers = [...input.providerIds]
    .map((id) => id.trim())
    .filter(Boolean)
    .sort()
    .join(",");
  const matches = entries.filter((entry) => {
    if (entry.query.trim().toLowerCase() !== query) {
      return false;
    }
    const entryProviders = [...entry.providerIds]
      .map((id) => id.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    return entryProviders === providers;
  });
  return matches.find((entry) => entry.scope === "all") ?? matches[0] ?? null;
}

export function upsertMusicSearchCacheEntry(
  entries: MusicSearchResultCacheEntry[],
  next: MusicSearchResultCacheEntry,
  maxEntries = 40,
): MusicSearchResultCacheEntry[] {
  const key = buildMusicSearchCacheKey(next);
  const filtered = entries.filter(
    (entry) =>
      buildMusicSearchCacheKey({
        query: entry.query,
        scope: entry.scope,
        providerIds: entry.providerIds,
      }) !== key,
  );
  return [next, ...filtered].slice(0, maxEntries);
}
