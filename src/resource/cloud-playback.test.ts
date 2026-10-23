// 场景：云端点播换源与错误文案 — 直链失败时跨源找备选。
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cloudPlaybackGaveUpMessage,
  findCloudPlayableAlternates,
  formatMusicPlaybackError,
} from "./cloud-playback";
import { setMusicSidecarFetchJson } from "./sidecar-fetch";
import { clearMusicSidecarBaseUrlCache } from "./sidecar-config";

const originalSidecarUrl = process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL;

afterEach(() => {
  process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL = originalSidecarUrl;
  clearMusicSidecarBaseUrlCache();
  setMusicSidecarFetchJson(null);
  vi.restoreAllMocks();
});

describe("formatMusicPlaybackError", () => {
  it("maps unsupported source errors to Chinese cloud copy", () => {
    expect(
      formatMusicPlaybackError(new Error("Failed to load because no supported source was found."), {
        cloud: true,
      }),
    ).toContain("云端音源");
  });

  it("swallows play/pause interrupt AbortError as empty", () => {
    const abort = new Error("The play() request was interrupted by a call to pause().");
    abort.name = "AbortError";
    expect(formatMusicPlaybackError(abort)).toBe("");
  });
});

describe("findCloudPlayableAlternates", () => {
  it("returns other playable urls excluding failed ones", async () => {
    delete process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL;
    clearMusicSidecarBaseUrlCache();
    setMusicSidecarFetchJson(async (_url, init) => {
      const body = typeof init?.body === "string" ? init.body : "";
      const source = new URLSearchParams(body).get("type") ?? "netease";
      if (source === "netease") {
        return {
          code: 200,
          data: [
            {
              type: "netease",
              songid: 1,
              title: "布拉格广场",
              author: "蔡依林",
              url: "https://bad.example/netease.mp3",
            },
          ],
        };
      }
      if (source === "qq") {
        return {
          code: 200,
          data: [
            {
              type: "qq",
              songid: 2,
              title: "布拉格广场",
              author: "蔡依林,周杰伦",
              url: "https://ok.example/qq.mp3",
            },
          ],
        };
      }
      return { code: 404, data: null };
    });

    const alts = await findCloudPlayableAlternates({
      title: "布拉格广场",
      artist: "蔡依林",
      excludeUrls: ["https://bad.example/netease.mp3"],
      preferProviderId: "netease",
    });

    expect(alts.some((item) => item.url === "https://ok.example/qq.mp3")).toBe(true);
    expect(alts.every((item) => item.url !== "https://bad.example/netease.mp3")).toBe(true);
    expect(cloudPlaybackGaveUpMessage()).toContain("更新资源");
  });
});
