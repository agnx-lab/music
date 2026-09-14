// 场景：搜索结果缓存 TTL — 过期只表示应重拉，不删条目；可从缓存恢复历史关键词。
import { describe, expect, it } from "vitest";
import {
  isMusicSearchCacheFresh,
  listQueriesFromMusicSearchCaches,
  shouldBackgroundRefreshMusicSearchCache,
  type MusicSearchResultCacheEntry,
} from "./search-result-cache";
import type { SearchResultPage } from "./types";

function samplePage(): SearchResultPage {
  return {
    scope: "all",
    page: 1,
    hasMore: false,
    songs: [],
    artists: [],
    albums: [],
    playlists: [],
  };
}

function sampleEntry(
  patch: Partial<MusicSearchResultCacheEntry> = {},
): MusicSearchResultCacheEntry {
  return {
    query: "周杰伦",
    scope: "all",
    providerIds: ["txqq"],
    page: samplePage(),
    updatedAt: 1_000_000,
    ...patch,
  };
}

describe("music search result cache ttl", () => {
  it("treats TTL as freshness for refetch, not deletion", () => {
    const entry = sampleEntry({ updatedAt: 0 });
    expect(isMusicSearchCacheFresh(entry, 15, 20 * 60_000)).toBe(false);
    expect(shouldBackgroundRefreshMusicSearchCache(entry, 15, 20 * 60_000)).toBe(true);
    expect(entry.page).toBeTruthy();
  });

  it("keeps fresh entries from background refresh", () => {
    const entry = sampleEntry({ updatedAt: 1_000_000 });
    expect(isMusicSearchCacheFresh(entry, 15, 1_000_000 + 60_000)).toBe(true);
    expect(shouldBackgroundRefreshMusicSearchCache(entry, 15, 1_000_000 + 60_000)).toBe(false);
  });

  it("can rebuild history chips from cache queries", () => {
    expect(
      listQueriesFromMusicSearchCaches([
        sampleEntry({ query: "A" }),
        sampleEntry({ query: "a", scope: "song" }),
        sampleEntry({ query: "B" }),
      ]),
    ).toEqual(["A", "B"]);
  });
});
