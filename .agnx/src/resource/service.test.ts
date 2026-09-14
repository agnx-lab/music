// 场景：资源聚合服务 — 合并各源 providerErrors，可播过滤时不得清空降级文案。
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchMusic, searchPlayableMusic } from "./service";
import { setMusicSidecarFetchJson } from "./sidecar-fetch";
import { clearMusicSidecarBaseUrlCache } from "./sidecar-config";

const originalSidecarUrl = process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL;

afterEach(() => {
  process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL = originalSidecarUrl;
  clearMusicSidecarBaseUrlCache();
  setMusicSidecarFetchJson(null);
  vi.restoreAllMocks();
});

describe("searchMusic providerErrors", () => {
  it("keeps txqq soft errors through playable filtering", async () => {
    delete process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL;
    clearMusicSidecarBaseUrlCache();
    setMusicSidecarFetchJson(async () => ({ code: 404, data: null }));

    const page = await searchPlayableMusic({
      text: "晴天",
      scope: "track",
      providerIds: ["txqq"],
    });

    expect(page.tracks).toEqual([]);
    expect(page.providerErrors?.some((item) => item.providerId === "kugou")).toBe(true);
  });

  it("includes sidecar in provider list even without base url", async () => {
    delete process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL;
    clearMusicSidecarBaseUrlCache();
    setMusicSidecarFetchJson(async () => ({
      code: 200,
      data: [
        {
          type: "qq",
          songid: 1,
          title: "晴天",
          author: "周杰伦",
          url: "http://example.com/a.mp3",
        },
      ],
    }));

    const page = await searchMusic({
      text: "晴天",
      scope: "track",
      providerIds: ["txqq", "sidecar"],
    });

    expect(page.tracks.length).toBeGreaterThanOrEqual(1);
    // sidecar 未配置：静默空结果，不刷错误
    expect(page.providerErrors?.some((item) => item.providerId === "sidecar")).toBeFalsy();
  });
});
