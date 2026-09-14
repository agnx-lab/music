// 场景：Audio.com — 搜索只收带直链条目；resolve 按 remoteId 精确匹配；错误路径写 providerErrors。
import { afterEach, describe, expect, it } from "vitest";
import {
  audiocomMusicProvider,
  buildAudiocomSearchUrl,
  mapAudiocomSearchItems,
  normalizeAudiocomQueryText,
} from "./audiocom-provider";
import { setMusicSidecarFetchJson } from "./sidecar-fetch";

afterEach(() => {
  setMusicSidecarFetchJson(null);
});

const SAMPLE_SEARCH = {
  items: [
    {
      type: "audio",
      id: "111",
      model: {
        id: "111",
        title: "Song A",
        username: "alice",
        author: "Alice",
        slug: "song-a",
        image: "https://img.example/a.jpg",
        play: {
          duration: 120000,
          url: "https://s3.example/a.mp3?X-Amz-Expires=518400",
        },
      },
    },
    {
      type: "audio",
      id: "222",
      model: {
        id: "222",
        title: "No URL Song",
        username: "bob",
        slug: "no-url",
      },
    },
    {
      type: "playlist",
      id: "p1",
      model: { id: "p1", title: "PL" },
    },
  ],
  pagination: { page: 1, pages: 3, size: 10, total: 30 },
};

describe("audiocom helpers", () => {
  it("normalizes category url query and builds search url", () => {
    expect(
      normalizeAudiocomQueryText(
        "https://audio.com/category/music/justin-bieber?ysclid=mrr6kt0wb4881079504",
      ),
    ).toBe("justin bieber");
    const url = buildAudiocomSearchUrl("Michael Jackson", 2);
    expect(url).toContain("api.audio.com/search?");
    expect(url).toContain("page=2");
    // 回归：必须用 query=；q= 会返回无关垃圾结果
    expect(url).toContain("query=Michael+Jackson");
    expect(url).not.toMatch(/[?&]q=/);
  });

  it("maps only audio items with playable urls", () => {
    const tracks = mapAudiocomSearchItems(SAMPLE_SEARCH, 10);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      title: "Song A",
      artist: "Alice",
      playableUrl: "https://s3.example/a.mp3?X-Amz-Expires=518400",
      ref: {
        providerId: "audiocom",
        remoteId: "111",
      },
      durationMs: 120000,
    });
    expect(tracks[0]?.ref.pageUrl).toContain("/alice/song-a");
  });
});

describe("audiocomMusicProvider", () => {
  it("search returns inline playable tracks and debug url", async () => {
    setMusicSidecarFetchJson(async (url) => {
      const href = String(url);
      expect(href).toContain("api.audio.com/search?");
      expect(href).toContain("query=");
      expect(href).not.toMatch(/[?&]q=/);
      return SAMPLE_SEARCH;
    });
    const page = await audiocomMusicProvider.search({
      text: "https://audio.com/category/music/justin-bieber",
      scope: "track",
      providerIds: ["audiocom"],
    });
    expect(page.tracks).toHaveLength(1);
    expect(page.tracks[0]?.playableUrl).toContain(".mp3");
    expect(page.hasMore).toBe(true);
    expect(page.debugSearchRequests?.[0]?.providerId).toBe("audiocom");
  });

  it("search writes providerErrors on failure", async () => {
    setMusicSidecarFetchJson(async () => {
      throw new Error("boom");
    });
    const page = await audiocomMusicProvider.search({ text: "lofi", scope: "track" });
    expect(page.tracks).toEqual([]);
    expect(page.providerErrors?.[0]).toMatchObject({
      providerId: "audiocom",
      message: "boom",
    });
  });

  it("resolvePlayable exact-matches remoteId and rejects mismatch", async () => {
    setMusicSidecarFetchJson(async (url) => {
      const href = String(url);
      if (href.endsWith("/audio/111")) {
        return {
          id: "111",
          title: "Song A",
          transcodings: [
            {
              format: "mp3",
              url: "https://s3.example/a-refreshed.mp3",
              size: 1024,
            },
          ],
        };
      }
      if (href.endsWith("/audio/999")) {
        return {
          id: "111",
          title: "Wrong",
          transcodings: [{ format: "mp3", url: "https://s3.example/wrong.mp3" }],
        };
      }
      throw new Error(`unexpected ${href}`);
    });

    const ok = await audiocomMusicProvider.resolvePlayable?.({
      providerId: "audiocom",
      remoteId: "111",
    });
    expect(ok).toMatchObject({
      providerId: "audiocom",
      remoteId: "111",
      url: "https://s3.example/a-refreshed.mp3",
      ext: "mp3",
    });
    expect(ok?.title).toBeUndefined();

    const mismatch = await audiocomMusicProvider.resolvePlayable?.({
      providerId: "audiocom",
      remoteId: "999",
    });
    expect(mismatch).toBeNull();

    expect(
      await audiocomMusicProvider.resolvePlayable?.({
        providerId: "pixabay",
        remoteId: "111",
      }),
    ).toBeNull();
  });
});
