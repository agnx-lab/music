// 场景：listCollection 辅助 — 派生 ID 解析与艺人过滤，禁止空 title 乱匹配。
import { describe, expect, it } from "vitest";
import {
  filterTracksForListCollection,
  matchTracksForListCollection,
  resolveCollectionListTitle,
} from "./collection-list-helpers";
import type { ListCollectionQuery, SearchHitTrack } from "./types";

function hit(title: string, artist: string, album?: string): SearchHitTrack {
  return {
    kind: "track",
    ref: { providerId: "muzvox", remoteId: title },
    title,
    artist,
    album,
  };
}

describe("collection-list-helpers", () => {
  it("从 title 或 artist: 前缀解析合集名", () => {
    const byTitle: ListCollectionQuery = {
      kind: "artist",
      title: "Michael Jackson",
      ref: { providerId: "muzvox", remoteId: "artist:x" },
    };
    expect(resolveCollectionListTitle(byTitle)).toBe("Michael Jackson");
    const byId: ListCollectionQuery = {
      kind: "artist",
      ref: { providerId: "muzvox", remoteId: "artist:Smooth" },
    };
    expect(resolveCollectionListTitle(byId)).toBe("Smooth");
  });

  it("艺人精确过滤", () => {
    const tracks = [hit("A", "Michael Jackson"), hit("B", "Other"), hit("C", "michael jackson")];
    expect(
      filterTracksForListCollection(tracks, "artist", "Michael Jackson").map((item) => item.title),
    ).toEqual(["A", "C"]);
  });

  it("艺人宽松匹配包含", () => {
    const tracks = [hit("X", "Michael Jackson feat. A"), hit("Y", "Nobody")];
    expect(
      matchTracksForListCollection(tracks, "artist", "Michael Jackson").map((item) => item.title),
    ).toEqual(["X"]);
  });
});
