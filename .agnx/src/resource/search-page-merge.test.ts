// 场景：搜索分页合并去重 — 加载更多时艺人/专辑/歌单不得重复叠加。
import { describe, expect, it } from "vitest";
import { mergeSearchResultPages, searchHitAlbumKey, searchHitArtistKey } from "./search-page-merge";
import type { SearchHitAlbum, SearchHitArtist, SearchResultPage } from "./types";

function page(partial: Partial<SearchResultPage>): SearchResultPage {
  return {
    query: { text: "Yuri", scope: "all" },
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    page: 1,
    hasMore: true,
    ...partial,
  };
}

function artist(name: string, remoteId: string, providerId = "netease"): SearchHitArtist {
  return {
    kind: "artist",
    ref: { providerId, remoteId },
    name,
  };
}

function album(title: string, remoteId: string, providerId = "netease"): SearchHitAlbum {
  return {
    kind: "album",
    ref: { providerId, remoteId },
    title,
    artist: "Yuri",
  };
}

describe("mergeSearchResultPages", () => {
  it("dedupes artists albums and playlists when loading more", () => {
    const current = page({
      artists: [artist("Yuri", "a1")],
      albums: [album("风云", "al1")],
      playlists: [
        {
          kind: "playlist",
          ref: { providerId: "netease", remoteId: "p1" },
          title: "歌单A",
        },
      ],
      tracks: [
        {
          kind: "track",
          ref: { providerId: "netease", remoteId: "t1" },
          title: "Seedance",
          artist: "Yuri",
        },
      ],
    });
    const more = page({
      page: 2,
      artists: [artist("Yuri", "a1"), artist("Other", "a2")],
      albums: [album("风云", "al1"), album("三十而慄", "al2")],
      playlists: [
        {
          kind: "playlist",
          ref: { providerId: "netease", remoteId: "p1" },
          title: "歌单A",
        },
        {
          kind: "playlist",
          ref: { providerId: "netease", remoteId: "p2" },
          title: "歌单B",
        },
      ],
      tracks: [
        {
          kind: "track",
          ref: { providerId: "netease", remoteId: "t2" },
          title: "Next",
          artist: "Yuri",
        },
      ],
    });

    const merged = mergeSearchResultPages(current, more, 2);
    expect(merged.artists.map((item) => item.ref.remoteId)).toEqual(["a1", "a2"]);
    expect(merged.albums.map((item) => item.ref.remoteId)).toEqual(["al1", "al2"]);
    expect(merged.playlists.map((item) => item.ref.remoteId)).toEqual(["p1", "p2"]);
    expect(merged.tracks.map((item) => item.ref.remoteId)).toEqual(["t1", "t2"]);
    expect(merged.hasMore).toBe(true);
  });

  it("dedupes derived artist cards by display name", () => {
    expect(searchHitArtistKey(artist("Yuri", "artist:Yuri"))).toBe(
      searchHitArtistKey(artist("Yuri", "artist:Yuri")),
    );
    expect(searchHitAlbumKey(album("风云", "album:风云"))).toBe(
      searchHitAlbumKey(album("风云", "album:风云")),
    );
  });

  it("stops hasMore when no new tracks were appended", () => {
    const current = page({
      tracks: [
        {
          kind: "track",
          ref: { providerId: "netease", remoteId: "t1" },
          title: "A",
          artist: "Yuri",
        },
      ],
      albums: [album("风云", "al1")],
    });
    const more = page({
      hasMore: true,
      tracks: [
        {
          kind: "track",
          ref: { providerId: "netease", remoteId: "t1" },
          title: "A",
          artist: "Yuri",
        },
      ],
      albums: [album("风云", "al1"), album("其它", "al2")],
    });
    const merged = mergeSearchResultPages(current, more, 2);
    expect(merged.albums.map((item) => item.ref.remoteId)).toEqual(["al1", "al2"]);
    expect(merged.tracks).toHaveLength(1);
    expect(merged.hasMore).toBe(false);
  });
});
