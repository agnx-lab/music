// 场景：搜索命中身份匹配 — 下载失败重试 / 跨源同歌不重复入库。
import { describe, expect, it } from "vitest";
import {
  normalizeArtistIdentityKey,
  sameRemoteRef,
  sameSearchHitIdentity,
} from "./search-hit-identity";
import type { SearchHitTrack } from "./resource/types";

function hit(
  partial: Partial<SearchHitTrack> & {
    title: string;
    artist: string;
    providerId?: string;
    remoteId?: string;
  },
): SearchHitTrack {
  return {
    kind: "track",
    title: partial.title,
    artist: partial.artist,
    album: partial.album,
    coverUrl: partial.coverUrl,
    playableUrl: partial.playableUrl,
    localTrackId: partial.localTrackId,
    lyrics: partial.lyrics,
    ref: {
      providerId: partial.providerId ?? partial.ref?.providerId ?? "netease",
      remoteId: partial.remoteId ?? partial.ref?.remoteId ?? "1",
      pageUrl: partial.ref?.pageUrl,
    },
  };
}

describe("search-hit-identity", () => {
  it("matches exact remoteRef", () => {
    expect(
      sameSearchHitIdentity(
        {
          id: "t1",
          title: "一封侨批",
          artist: "玩具船长",
          remoteRef: { providerId: "netease", remoteId: "1472097020" },
        },
        hit({ title: "一封侨批", artist: "玩具船长", remoteId: "1472097020" }),
      ),
    ).toBe(true);
  });

  it("matches same title+artist across providers (download retry / multi-source)", () => {
    expect(
      sameSearchHitIdentity(
        {
          id: "t1",
          title: "一封侨批",
          artist: "玩具船长",
          remoteRef: { providerId: "netease", remoteId: "111" },
        },
        hit({
          title: "一封侨批",
          artist: "玩具船长",
          providerId: "kugou",
          remoteId: "222",
        }),
      ),
    ).toBe(true);
  });

  it("matches when library track lost remoteRef but title+artist equal", () => {
    expect(
      sameSearchHitIdentity(
        { id: "t1", title: "一封侨批", artist: "玩具船长", remoteRef: null },
        hit({ title: "一封侨批", artist: "玩具船长", remoteId: "1472097020" }),
      ),
    ).toBe(true);
  });

  it("matches aiguo mirror song ids with different prefixes", () => {
    expect(
      sameSearchHitIdentity(
        {
          id: "t1",
          title: "歌",
          artist: "人",
          remoteRef: { providerId: "aiguo", remoteId: "6uq:abc123" },
        },
        hit({
          title: "另一首",
          artist: "别人",
          providerId: "aiguo",
          remoteId: "78497:abc123",
        }),
      ),
    ).toBe(true);
  });

  it("does not merge different songs with empty artists across providers", () => {
    expect(
      sameSearchHitIdentity(
        {
          id: "t1",
          title: "晴天",
          artist: "",
          remoteRef: { providerId: "netease", remoteId: "1" },
        },
        hit({ title: "晴天", artist: "", providerId: "qq", remoteId: "2" }),
      ),
    ).toBe(false);
  });

  it("treats 未知 artist as empty key", () => {
    expect(normalizeArtistIdentityKey("未知")).toBe("");
    expect(normalizeArtistIdentityKey("玩具船长")).toBe("玩具船长");
  });

  it("sameRemoteRef still requires equal remoteIds when present", () => {
    expect(
      sameRemoteRef(
        { providerId: "netease", remoteId: "1" },
        { providerId: "netease", remoteId: "2" },
      ),
    ).toBe(false);
  });
});
