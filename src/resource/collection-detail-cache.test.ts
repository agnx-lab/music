// 场景：合集详情缓存 key / TTL / upsert 行为。
import { describe, expect, it } from "vitest";
import {
  buildMusicCollectionCacheKey,
  findMusicCollectionCacheEntry,
  isMusicCollectionCacheFresh,
  upsertMusicCollectionCacheEntry,
  type MusicCollectionDetailCacheEntry,
} from "./collection-detail-cache";

function sampleEntry(
  patch?: Partial<MusicCollectionDetailCacheEntry>,
): MusicCollectionDetailCacheEntry {
  return {
    kind: "album",
    providerId: "netease",
    remoteId: "album-1",
    title: "叶惠美",
    tracks: [
      {
        kind: "track",
        ref: { providerId: "netease", remoteId: "song-1" },
        title: "晴天",
        artist: "周杰伦",
      },
    ],
    source: "list",
    updatedAt: 1_000,
    ...patch,
  };
}

describe("collection-detail-cache", () => {
  it("builds stable keys by kind+provider+remoteId", () => {
    expect(
      buildMusicCollectionCacheKey({
        kind: "playlist",
        providerId: " qq ",
        remoteId: " p1 ",
      }),
    ).toBe("playlist::qq::p1");
  });

  it("finds and upserts without duplicating keys", () => {
    const first = sampleEntry();
    const second = sampleEntry({ title: "叶惠美·改", updatedAt: 2_000 });
    const entries = upsertMusicCollectionCacheEntry(
      upsertMusicCollectionCacheEntry([], first),
      second,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toBe("叶惠美·改");
    expect(
      findMusicCollectionCacheEntry(entries, {
        kind: "album",
        providerId: "netease",
        remoteId: "album-1",
      })?.updatedAt,
    ).toBe(2_000);
  });

  it("respects ttl freshness", () => {
    const entry = sampleEntry({ updatedAt: 10_000 });
    expect(isMusicCollectionCacheFresh(entry, 15, 10_000 + 14 * 60_000)).toBe(true);
    expect(isMusicCollectionCacheFresh(entry, 15, 10_000 + 16 * 60_000)).toBe(false);
  });
});
