// 场景：Music 低频偏好 — 本端 AsyncStorage 适配器（详情开关不写 host.config）。
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkspaceAppConfigApi } from "@getagnx/app-sdk";
import {
  getDefaultSearchProviderSelection,
  normalizeSearchProviderSelection,
} from "./resource/platform-registry";
import { DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES } from "./resource/search-result-cache";

import { MUSIC_APP_ID, MUSIC_LEGACY_APP_ID } from "./music-ids";

export { MUSIC_APP_ID };
export const MUSIC_CONFIG_KEY = "prefs-v1";
export const MUSIC_LOCAL_PREFS_STORAGE_KEY = `${MUSIC_APP_ID}/prefs-v1-local`;
export const MUSIC_LEGACY_LOCAL_PREFS_STORAGE_KEY = `${MUSIC_LEGACY_APP_ID}/prefs-v1-local`;

export interface MusicAppPrefsDocument {
  version: 1;
  lyricsDensity: "compact" | "relaxed";
  atmospherePushEnabled: boolean;
  /** 播放器/宿主中间区是否用当前封面做朦胧背景 */
  coverBackdropEnabled: boolean;
  /** 封面背景模糊半径 0–24，默认 10 */
  coverBackdropBlur: number;
  /** 封面图透明度 0.15–0.95，默认 0.55（越大封面越清晰） */
  coverBackdropOpacity: number;
  /** Tab 条是否透出同一封面（一体沉浸）；默认关 */
  coverBackdropIncludeTabBar: boolean;
  searchProviderIds: string[];
  searchCacheTtlMinutes: number;
}

export function defaultMusicAppPrefsDocument(): MusicAppPrefsDocument {
  return {
    version: 1,
    lyricsDensity: "compact",
    atmospherePushEnabled: true,
    coverBackdropEnabled: true,
    coverBackdropBlur: 10,
    coverBackdropOpacity: 0.55,
    coverBackdropIncludeTabBar: false,
    searchProviderIds: getDefaultSearchProviderSelection(),
    searchCacheTtlMinutes: DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES,
  };
}

function normalizeLyricsDensity(value: unknown): "compact" | "relaxed" {
  return value === "relaxed" ? "relaxed" : "compact";
}

function normalizeCoverBackdropBlur(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(24, Math.max(0, Math.round(value)));
  }
  // 兼容旧 intensity 预设
  if (value === "light") {
    return 4;
  }
  if (value === "vivid") {
    return 16;
  }
  return 10;
}

function normalizeCoverBackdropOpacity(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(0.95, Math.max(0.15, Math.round(value * 100) / 100));
  }
  if (value === "light") {
    return 0.72;
  }
  if (value === "vivid") {
    return 0.38;
  }
  return 0.55;
}

function normalizeSearchCacheTtlMinutes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
    return Math.min(24 * 60, Math.floor(value));
  }
  return DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES;
}

export function normalizeMusicAppPrefsDocument(raw: unknown): MusicAppPrefsDocument {
  const defaults = defaultMusicAppPrefsDocument();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }
  const doc = raw as Partial<MusicAppPrefsDocument>;
  return {
    version: 1,
    lyricsDensity: normalizeLyricsDensity(doc.lyricsDensity),
    atmospherePushEnabled: doc.atmospherePushEnabled !== false,
    coverBackdropEnabled: doc.coverBackdropEnabled !== false,
    coverBackdropBlur: normalizeCoverBackdropBlur(
      (doc as { coverBackdropBlur?: unknown; coverBackdropIntensity?: unknown })
        .coverBackdropBlur ?? (doc as { coverBackdropIntensity?: unknown }).coverBackdropIntensity,
    ),
    coverBackdropOpacity: normalizeCoverBackdropOpacity(
      (doc as { coverBackdropOpacity?: unknown; coverBackdropIntensity?: unknown })
        .coverBackdropOpacity ??
        (doc as { coverBackdropIntensity?: unknown }).coverBackdropIntensity,
    ),
    coverBackdropIncludeTabBar: doc.coverBackdropIncludeTabBar === true,
    searchProviderIds: normalizeSearchProviderSelection(doc.searchProviderIds),
    searchCacheTtlMinutes: normalizeSearchCacheTtlMinutes(doc.searchCacheTtlMinutes),
  };
}

export async function loadMusicAppPrefsFromLocalStorage(): Promise<MusicAppPrefsDocument | null> {
  try {
    const rawNew = await AsyncStorage.getItem(MUSIC_LOCAL_PREFS_STORAGE_KEY);
    const rawLegacy = rawNew
      ? null
      : await AsyncStorage.getItem(MUSIC_LEGACY_LOCAL_PREFS_STORAGE_KEY);
    const raw = rawNew ?? rawLegacy;
    if (!raw) {
      return null;
    }
    const prefs = normalizeMusicAppPrefsDocument(JSON.parse(raw));
    if (!rawNew && rawLegacy) {
      await saveMusicAppPrefsToLocalStorage(prefs);
    }
    return prefs;
  } catch {
    return null;
  }
}

export async function saveMusicAppPrefsToLocalStorage(prefs: MusicAppPrefsDocument): Promise<void> {
  try {
    await AsyncStorage.setItem(MUSIC_LOCAL_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore local persist errors
  }
}

export async function loadMusicAppPrefsFromHost(
  config: WorkspaceAppConfigApi | null | undefined,
  legacy?: { searchProviderIds?: string[] | null },
): Promise<MusicAppPrefsDocument> {
  if (config?.get) {
    for (const appId of [MUSIC_APP_ID, MUSIC_LEGACY_APP_ID]) {
      try {
        const raw = await config.get({
          scope: "app",
          appId,
          key: MUSIC_CONFIG_KEY,
          defaultValue: null,
        });
        if (raw != null) {
          return normalizeMusicAppPrefsDocument(raw);
        }
      } catch {
        // try next id
      }
    }
  }
  if (legacy?.searchProviderIds) {
    return normalizeMusicAppPrefsDocument({
      ...defaultMusicAppPrefsDocument(),
      searchProviderIds: legacy.searchProviderIds,
    });
  }
  return defaultMusicAppPrefsDocument();
}

/** 本端优先；无本端再读 host；再默认。详情开关以本端适配器为准。 */
export async function loadMusicAppPrefs(
  config: WorkspaceAppConfigApi | null | undefined,
  legacy?: { searchProviderIds?: string[] | null },
): Promise<MusicAppPrefsDocument> {
  const local = await loadMusicAppPrefsFromLocalStorage();
  if (local) {
    return local;
  }
  return loadMusicAppPrefsFromHost(config, legacy);
}

export async function saveMusicAppPrefsToHost(
  config: WorkspaceAppConfigApi | null | undefined,
  prefs: MusicAppPrefsDocument,
): Promise<void> {
  if (!config?.set) {
    return;
  }
  try {
    await config.set({
      scope: "app",
      appId: MUSIC_APP_ID,
      key: MUSIC_CONFIG_KEY,
      value: prefs,
    });
  } catch {
    // ignore persist errors in pilot
  }
}

/** 详情/播放偏好只写本端适配器；不写 host.config。 */
export async function saveMusicAppPrefs(
  _config: WorkspaceAppConfigApi | null | undefined,
  prefs: MusicAppPrefsDocument,
): Promise<void> {
  await saveMusicAppPrefsToLocalStorage(prefs);
}
