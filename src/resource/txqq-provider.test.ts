// 场景：txqq 聚合源 — 搜索结果必须自带可播 URL 才入库；坏源写入 providerErrors；镜像轮换。
import { afterEach, describe, expect, it, vi } from "vitest";
import { setMusicSidecarFetchJson } from "./sidecar-fetch";
import {
  listMusicAggregatorEndpoints,
  resetMusicAggregatorEndpointCursor,
  txqqMusicProvider,
} from "./txqq-provider";

afterEach(() => {
  setMusicSidecarFetchJson(null);
  resetMusicAggregatorEndpointCursor();
  vi.restoreAllMocks();
});

describe("txqqMusicProvider", () => {
  it("keeps only hits that already include playable url", async () => {
    setMusicSidecarFetchJson(async (_url, init) => {
      expect(init?.method).toBe("POST");
      return {
        code: 200,
        data: [
          {
            type: "netease",
            songid: 1,
            title: "晴天",
            author: "周杰伦",
            url: "http://music.163.com/song/media/outer/url?id=1.mp3",
            pic: "http://example.com/a.jpg",
          },
          {
            type: "netease",
            songid: 2,
            title: "无直链",
            author: "测试",
            url: "",
          },
        ],
      };
    });

    const page = await txqqMusicProvider.search({
      text: "晴天",
      scope: "track",
      providerIds: ["netease"],
    });
    expect(page.tracks).toHaveLength(1);
    expect(page.tracks[0]).toMatchObject({
      title: "晴天",
      playableUrl: "http://music.163.com/song/media/outer/url?id=1.mp3",
      ref: { providerId: "netease", remoteId: "1" },
    });
    expect(page.providerErrors).toEqual([]);
  });

  it("reports soft errors when hits exist but none are playable", async () => {
    setMusicSidecarFetchJson(async () => ({
      code: 200,
      data: [
        {
          type: "kuwo",
          songid: 9,
          title: "无直链",
          author: "测试",
          url: "",
        },
      ],
    }));
    const page = await txqqMusicProvider.search({
      text: "晴天",
      scope: "track",
      providerIds: ["kuwo"],
    });
    expect(page.tracks).toEqual([]);
    expect(page.providerErrors).toEqual([
      { providerId: "kuwo", message: "有命中但无直链，已跳过" },
    ]);
  });

  it("reports soft errors when a source returns non-200", async () => {
    setMusicSidecarFetchJson(async () => ({ code: 404, data: null }));
    const page = await txqqMusicProvider.search({
      text: "晴天",
      scope: "track",
      providerIds: ["kugou"],
    });
    expect(page.tracks).toEqual([]);
    expect(page.providerErrors).toEqual([
      { providerId: "kugou", message: "暂不可用（code=404），已跳过" },
    ]);
  });

  it("rotates aggregator endpoints and fails over to the next mirror", async () => {
    const endpoints = listMusicAggregatorEndpoints();
    expect(endpoints).toContain("https://music.txqq.pro/");
    expect(endpoints).toContain("https://music.itzo.cn/");

    const seen: string[] = [];
    setMusicSidecarFetchJson(async (url) => {
      seen.push(String(url));
      if (String(url).includes("music.txqq.pro")) {
        throw new Error("primary down");
      }
      return {
        code: 200,
        data: [
          {
            type: "qq",
            songid: 3,
            title: "晴天",
            author: "周杰伦",
            url: "https://example.com/qq.mp3",
          },
        ],
      };
    });

    resetMusicAggregatorEndpointCursor();
    const page = await txqqMusicProvider.search({
      text: "晴天",
      scope: "track",
      providerIds: ["qq"],
    });
    expect(page.tracks).toHaveLength(1);
    expect(seen.some((item) => item.includes("music.txqq.pro"))).toBe(true);
    expect(seen.some((item) => item.includes("music.itzo.cn"))).toBe(true);
  });
  it("resolvePlayable never falls back to unrelated tracks[0]", async () => {
    setMusicSidecarFetchJson(async () => ({
      code: 200,
      data: [
        {
          type: "netease",
          songid: 999,
          title: "无关歌曲",
          author: "别人",
          url: "http://example.com/wrong.mp3",
        },
      ],
    }));
    const resolved = await txqqMusicProvider.resolvePlayable?.({
      providerId: "netease",
      remoteId: "1472097020",
    });
    expect(resolved).toBeNull();
  });

  it("resolvePlayable returns only exact remoteId match", async () => {
    setMusicSidecarFetchJson(async () => ({
      code: 200,
      data: [
        {
          type: "netease",
          songid: 1472097020,
          title: "一封侨批",
          author: "玩具船长",
          url: "http://example.com/right.mp3",
        },
      ],
    }));
    const resolved = await txqqMusicProvider.resolvePlayable?.({
      providerId: "netease",
      remoteId: "1472097020",
    });
    expect(resolved).toMatchObject({
      url: "http://example.com/right.mp3",
      providerId: "netease",
      remoteId: "1472097020",
    });
  });
});

describe("findTxqqLyricsText", () => {
  it("rejects fuzzy title matches like short English names", async () => {
    const { findTxqqLyricsText } = await import("./txqq-provider");
    setMusicSidecarFetchJson(async () => ({
      code: 200,
      data: [
        {
          type: "netease",
          songid: 1,
          title: "她很 Sad",
          author: "华语歌手",
          url: "http://example.com/a.mp3",
          lrc: "[00:01.00]乱配的歌词",
        },
      ],
    }));
    await expect(findTxqqLyricsText({ title: "Sad", artist: "Pixabay" })).resolves.toBeNull();
  });

  it("accepts exact title match with artist", async () => {
    const { findTxqqLyricsText } = await import("./txqq-provider");
    setMusicSidecarFetchJson(async () => ({
      code: 200,
      data: [
        {
          type: "netease",
          songid: 2,
          title: "晴天",
          author: "周杰伦",
          url: "http://example.com/b.mp3",
          lrc: "[00:01.00]故事的小黄花",
        },
      ],
    }));
    await expect(findTxqqLyricsText({ title: "晴天", artist: "周杰伦" })).resolves.toContain(
      "小黄花",
    );
  });

  it("rejects hits whose LRC [ti:] belongs to another song", async () => {
    const { findTxqqLyricsText } = await import("./txqq-provider");
    setMusicSidecarFetchJson(async () => ({
      code: 200,
      data: [
        {
          type: "netease",
          songid: 3,
          title: "心中念你便不觉遥远",
          author: "羊羽先生",
          url: "http://example.com/c.mp3",
          lrc: "[ti:Too far]\n[ar:Anna F.]\n[00:01.00]You and I under different stars",
        },
      ],
    }));
    await expect(
      findTxqqLyricsText({ title: "心中念你便不觉遥远", artist: "羊羽先生" }),
    ).resolves.toBeNull();
  });
});

describe("lyricsLikelyBelongToTrack", () => {
  it("rejects latin title with mostly CJK lyric body and no matching [ti:]", async () => {
    const { lyricsLikelyBelongToTrack } = await import("./txqq-provider");
    expect(
      lyricsLikelyBelongToTrack(
        "[00:00.00]作词 : 方文山\n[00:20.80]琴键上透着光\n[01:16.31]那画面太美我不敢看",
        "Glory",
      ),
    ).toBe(false);
  });

  it("accepts matching CJK title and body", async () => {
    const { lyricsLikelyBelongToTrack } = await import("./txqq-provider");
    expect(
      lyricsLikelyBelongToTrack("[00:01.00]故事的小黄花\n[00:05.00]从出生那年就飘着", "晴天"),
    ).toBe(true);
  });
});
