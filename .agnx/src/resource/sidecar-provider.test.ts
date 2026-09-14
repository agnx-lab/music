// 场景：验证 Music SidecarProvider 能把多平台搜索结果解析成统一资源模型。
import { afterEach, describe, expect, it, vi } from "vitest";
import { sidecarMusicProvider } from "./sidecar-provider";
import { getMusicPlatformLabel, listMusicPlatformCapabilities } from "./platform-registry";

const originalSidecarUrl = process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL;

afterEach(() => {
  process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL = originalSidecarUrl;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sidecarMusicProvider", () => {
  it("parses song, album, and playlist search results", async () => {
    process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL = "http://127.0.0.1:8080";
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = typeof input === "string" ? new URL(input) : input;
      const type = url.searchParams.get("type");
      if (type === "song") {
        return {
          ok: true,
          async json() {
            return {
              data: [
                {
                  id: "123",
                  source: "qq",
                  title: "夜曲",
                  artist: "周杰伦",
                  album: "十一月的萧邦",
                  duration: 224,
                  cover: "https://example.com/cover.jpg",
                },
              ],
            };
          },
        };
      }
      if (type === "album") {
        return {
          ok: true,
          async json() {
            return {
              data: [
                {
                  id: "a1",
                  source: "netease",
                  title: "叶惠美",
                  artist: "周杰伦",
                  track_count: 11,
                },
              ],
            };
          },
        };
      }
      return {
        ok: true,
        async json() {
          return {
            data: [
              {
                id: "p1",
                source: "kugou",
                title: "周杰伦精选",
                creator: "官方歌单",
                song_count: 25,
              },
            ],
          };
        },
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const page = await sidecarMusicProvider.search({ text: "周杰伦", scope: "all" });

    expect(page.tracks.length).toBeGreaterThanOrEqual(1);
    expect(page.tracks[0]).toMatchObject({
      title: "夜曲",
      artist: "周杰伦",
      album: "十一月的萧邦",
      ref: { providerId: "qq", remoteId: "123" },
    });
    expect(page.albums).toHaveLength(1);
    expect(page.playlists).toHaveLength(1);
  });

  it("returns empty page when sidecar url is absent", async () => {
    delete process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const page = await sidecarMusicProvider.search({ text: "稻香", scope: "track" });

    expect(page.tracks).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves playable url by provider and remote id", async () => {
    process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL = "http://127.0.0.1:8080";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      async json() {
        return {
          data: {
            url: "https://cdn.example.com/song.flac",
            source: "netease",
            id: "777",
            br: 999000,
            size: 12345678,
            type: "flac",
          },
        };
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const playable = await sidecarMusicProvider.resolvePlayable?.({
      providerId: "netease",
      remoteId: "777",
    });

    expect(playable).toMatchObject({
      url: "https://cdn.example.com/song.flac",
      providerId: "netease",
      remoteId: "777",
      bitrate: 999000,
      ext: "flac",
    });
  });

  it("returns null when resolver reports vip/copyright block", async () => {
    process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL = "http://127.0.0.1:8080";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        async text() {
          return JSON.stringify({ code: 500, msg: "download url not found" });
        },
      })),
    );

    const playable = await sidecarMusicProvider.resolvePlayable?.({
      providerId: "netease",
      remoteId: "186016",
    });

    expect(playable).toBeNull();
  });

  it("fetches lyric text and lyric file url", async () => {
    process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL = "http://127.0.0.1:8080";
    const fetchMock = vi.fn(async (input: string | URL) => ({
      ok: true,
      async json() {
        return String(input).includes("/api/v1/music/lyric")
          ? { data: { lyric: "[00:01.00]晴天" } }
          : {};
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const lyrics = await sidecarMusicProvider.fetchLyrics?.({
      providerId: "qq",
      remoteId: "123",
    });

    expect(lyrics).toMatchObject({
      providerId: "qq",
      remoteId: "123",
      text: "[00:01.00]晴天",
      fileUrl: "http://127.0.0.1:8080/api/v1/music/lyric/file?source=qq&id=123",
    });
  });
});

describe("platform registry", () => {
  it("exposes platform labels and statuses for current crawl plan", () => {
    const platforms = listMusicPlatformCapabilities();
    expect(
      platforms.some((platform) => platform.id === "qq" && platform.status === "sidecar-ready"),
    ).toBe(true);
    expect(getMusicPlatformLabel("netease")).toBe("网易云");
    expect(getMusicPlatformLabel("bilibili")).toBe("Bilibili");
  });
});
