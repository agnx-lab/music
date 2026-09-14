// 场景：合集曲目 — 本页过滤提示与封面回落辅助。
import { describe, expect, it } from "vitest";
import {
  collectionTrackCountSuffix,
  collectionTrackSourceHint,
  fillTracksMissingCover,
  filterTracksForCollection,
  isDerivedCollectionRemoteId,
} from "./collection-resolve";
import type { SearchHitTrack } from "./types";

function hit(partial: Partial<SearchHitTrack> & { title: string; artist: string }): SearchHitTrack {
  return {
    kind: "track",
    ref: partial.ref ?? { providerId: "muzvox", remoteId: partial.title },
    title: partial.title,
    artist: partial.artist,
    album: partial.album,
    durationMs: partial.durationMs,
    coverUrl: partial.coverUrl,
    playableUrl: partial.playableUrl,
  };
}

describe("collection-resolve", () => {
  it("识别派生 remoteId", () => {
    expect(isDerivedCollectionRemoteId("artist:MJ")).toBe(true);
    expect(isDerivedCollectionRemoteId("album:Bad")).toBe(true);
    expect(isDerivedCollectionRemoteId("real-id-1")).toBe(false);
  });

  it("按艺人/专辑过滤本页曲目", () => {
    const tracks = [
      hit({ title: "A", artist: "Michael Jackson", album: "Bad" }),
      hit({ title: "B", artist: "Other", album: "Bad" }),
      hit({ title: "C", artist: "Michael Jackson", album: "Thriller" }),
    ];
    expect(
      filterTracksForCollection(tracks, { kind: "artist", title: "Michael Jackson" }).map(
        (item) => item.title,
      ),
    ).toEqual(["A", "C"]);
    expect(
      filterTracksForCollection(tracks, { kind: "album", title: "Bad" }).map((item) => item.title),
    ).toEqual(["A", "B"]);
    expect(filterTracksForCollection(tracks, { kind: "playlist", title: "X" })).toEqual([]);
  });

  it("来源提示说明为本页过滤", () => {
    expect(
      collectionTrackSourceHint({
        kind: "artist",
        source: "local",
        derived: true,
      }),
    ).toContain("搜索结果");
    expect(
      collectionTrackSourceHint({
        kind: "album",
        source: "local",
      }),
    ).toContain("翻页后再过滤");
    expect(collectionTrackCountSuffix("local")).toBe("（本页过滤）");
  });

  it("合集曲目缺封面时回落合集封面，已有封面不覆盖", () => {
    const tracks = [
      hit({ title: "A", artist: "Yuri", coverUrl: "https://cdn/a.jpg" }),
      hit({ title: "B", artist: "Yuri" }),
    ];
    expect(fillTracksMissingCover(tracks, "https://cdn/artist.jpg")).toEqual([
      hit({ title: "A", artist: "Yuri", coverUrl: "https://cdn/a.jpg" }),
      hit({ title: "B", artist: "Yuri", coverUrl: "https://cdn/artist.jpg" }),
    ]);
    expect(fillTracksMissingCover(tracks, "  ")).toEqual(tracks);
  });
});
