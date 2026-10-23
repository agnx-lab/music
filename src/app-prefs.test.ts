// 场景：Music app prefs 归一化、host.config 与本端 AsyncStorage 读写单测。
import { describe, expect, it, vi, beforeEach } from "vitest";

const asyncStorage = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => asyncStorage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      asyncStorage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      asyncStorage.delete(key);
    }),
  },
}));

import {
  defaultMusicAppPrefsDocument,
  loadMusicAppPrefs,
  loadMusicAppPrefsFromHost,
  loadMusicAppPrefsFromLocalStorage,
  normalizeMusicAppPrefsDocument,
  saveMusicAppPrefs,
  saveMusicAppPrefsToHost,
  saveMusicAppPrefsToLocalStorage,
  MUSIC_LOCAL_PREFS_STORAGE_KEY,
} from "./app-prefs";

describe("music app-prefs", () => {
  beforeEach(() => {
    asyncStorage.clear();
  });

  it("非法输入回退默认", () => {
    const prefs = normalizeMusicAppPrefsDocument(null);
    expect(prefs.lyricsDensity).toBe("compact");
    expect(prefs.atmospherePushEnabled).toBe(true);
    expect(prefs.coverBackdropEnabled).toBe(true);
    expect(prefs.coverBackdropBlur).toBe(10);
    expect(prefs.coverBackdropOpacity).toBe(0.55);
    expect(prefs.coverBackdropIncludeTabBar).toBe(false);
    expect(prefs.searchProviderIds.length).toBeGreaterThan(0);
  });

  it("从 host.config 读取并归一化", async () => {
    const config = {
      get: vi.fn(async () => ({
        version: 1,
        lyricsDensity: "relaxed",
        atmospherePushEnabled: false,
        coverBackdropEnabled: false,
        coverBackdropBlur: 18,
        coverBackdropOpacity: 0.4,
        searchProviderIds: ["local", "qq"],
        searchCacheTtlMinutes: 30,
      })),
    };
    const prefs = await loadMusicAppPrefsFromHost(config as never);
    expect(prefs.lyricsDensity).toBe("relaxed");
    expect(prefs.atmospherePushEnabled).toBe(false);
    expect(prefs.coverBackdropEnabled).toBe(false);
    expect(prefs.coverBackdropBlur).toBe(18);
    expect(prefs.coverBackdropOpacity).toBe(0.4);
    expect(prefs.searchProviderIds).toEqual(["local", "qq"]);
    expect(prefs.searchCacheTtlMinutes).toBe(30);
  });

  it("旧 intensity 预设迁到 blur/opacity", () => {
    const prefs = normalizeMusicAppPrefsDocument({
      version: 1,
      coverBackdropIntensity: "vivid",
    });
    expect(prefs.coverBackdropBlur).toBe(16);
    expect(prefs.coverBackdropOpacity).toBe(0.38);
  });

  it("config 缺失时回退 legacy searchProviderIds", async () => {
    const prefs = await loadMusicAppPrefsFromHost(null, {
      searchProviderIds: ["local", "netease"],
    });
    expect(prefs.searchProviderIds).toEqual(["local", "netease"]);
    expect(prefs.lyricsDensity).toBe(defaultMusicAppPrefsDocument().lyricsDensity);
  });

  it("保存到 host.config", async () => {
    const config = {
      set: vi.fn(async () => undefined),
    };
    await saveMusicAppPrefsToHost(config as never, {
      ...defaultMusicAppPrefsDocument(),
      atmospherePushEnabled: false,
    });
    expect(config.set).toHaveBeenCalledWith({
      scope: "app",
      appId: "music",
      key: "prefs-v1",
      value: expect.objectContaining({
        atmospherePushEnabled: false,
      }),
    });
  });

  it("无 host 时 loadMusicAppPrefs 读本端 AsyncStorage", async () => {
    await saveMusicAppPrefsToLocalStorage({
      ...defaultMusicAppPrefsDocument(),
      lyricsDensity: "relaxed",
      coverBackdropEnabled: false,
    });
    const prefs = await loadMusicAppPrefs(null);
    expect(prefs.lyricsDensity).toBe("relaxed");
    expect(prefs.coverBackdropEnabled).toBe(false);
  });

  it("saveMusicAppPrefs 只写本端，不写 host.config", async () => {
    const config = {
      set: vi.fn(async () => undefined),
    };
    await saveMusicAppPrefs(config as never, {
      ...defaultMusicAppPrefsDocument(),
      searchCacheTtlMinutes: 30,
    });
    expect(config.set).not.toHaveBeenCalled();
    const local = await loadMusicAppPrefsFromLocalStorage();
    expect(local?.searchCacheTtlMinutes).toBe(30);
    expect(asyncStorage.has(MUSIC_LOCAL_PREFS_STORAGE_KEY)).toBe(true);
  });

  it("loadMusicAppPrefs 本端优先于 host", async () => {
    await saveMusicAppPrefsToLocalStorage({
      ...defaultMusicAppPrefsDocument(),
      atmospherePushEnabled: false,
    });
    const config = {
      get: vi.fn(async () => ({
        ...defaultMusicAppPrefsDocument(),
        atmospherePushEnabled: true,
      })),
    };
    const prefs = await loadMusicAppPrefs(config as never);
    expect(prefs.atmospherePushEnabled).toBe(false);
    expect(config.get).not.toHaveBeenCalled();
  });
});
