// 场景：音乐资源平台能力注册表 — 统一平台文案、顺序与当前接入状态。
import { listWiredDirectSearchProviderIds } from "./provider-catalog";

export interface MusicPlatformCapability {
  id: string;
  label: string;
  status: "local" | "sidecar-ready" | "planned";
  supports: {
    trackSearch: boolean;
    artistSearch: boolean;
    albumSearch: boolean;
    playlistSearch: boolean;
    lyrics: boolean;
    cover: boolean;
    playable: boolean;
    download: boolean;
  };
  notes?: string;
}

const PLATFORM_CAPABILITIES: MusicPlatformCapability[] = [
  {
    id: "local",
    label: "本地",
    status: "local",
    supports: {
      trackSearch: true,
      artistSearch: false,
      albumSearch: false,
      playlistSearch: false,
      lyrics: true,
      cover: true,
      playable: true,
      download: false,
    },
    notes: "已导入本地曲库",
  },
  {
    id: "netease",
    label: "网易云",
    status: "sidecar-ready",
    supports: {
      trackSearch: true,
      artistSearch: true,
      albumSearch: true,
      playlistSearch: true,
      lyrics: true,
      cover: true,
      playable: true,
      download: true,
    },
    notes: "2026-07-17 冒烟：搜索/可播解析已打通；歌词与封面命中率仍不稳定",
  },
  {
    id: "qq",
    label: "QQ 音乐",
    status: "sidecar-ready",
    supports: {
      trackSearch: true,
      artistSearch: true,
      albumSearch: true,
      playlistSearch: true,
      lyrics: true,
      cover: true,
      playable: true,
      download: true,
    },
    notes: "2026-07-17 冒烟：搜索/可播解析/歌词已打通；原版高码率与封面仍受登录/版权影响",
  },
  {
    id: "kugou",
    label: "酷狗",
    status: "sidecar-ready",
    supports: {
      trackSearch: true,
      artistSearch: true,
      albumSearch: true,
      playlistSearch: true,
      lyrics: true,
      cover: true,
      playable: true,
      download: true,
    },
    notes: "2026-07-17：热门曲 VIP 命中率高；搜索列表已改为仅展示可播验证通过条目",
  },
  {
    id: "kuwo",
    label: "酷我",
    status: "sidecar-ready",
    supports: {
      trackSearch: true,
      artistSearch: true,
      albumSearch: true,
      playlistSearch: true,
      lyrics: true,
      cover: true,
      playable: true,
      download: true,
    },
    notes: "contract 已接；真实冒烟待补，与 netease/qq 并行搜",
  },
  {
    id: "aiguo",
    label: "爱听",
    status: "sidecar-ready",
    supports: {
      trackSearch: true,
      artistSearch: false,
      albumSearch: false,
      playlistSearch: false,
      lyrics: true,
      cover: true,
      playable: true,
      download: true,
    },
    notes: "6uq.cn；勾选验证后 HTML 搜索 + play.php 直链，无 API Key",
  },
  {
    id: "audiocom",
    label: "Audio.com",
    status: "sidecar-ready",
    supports: {
      trackSearch: true,
      artistSearch: false,
      albumSearch: false,
      playlistSearch: false,
      lyrics: false,
      cover: true,
      playable: true,
      download: true,
    },
    notes: "api.audio.com 搜索自带签名 mp3；过期后详情刷新；UGC 曲库",
  },
  {
    id: "pixabay",
    label: "Pixabay",
    status: "sidecar-ready",
    supports: {
      trackSearch: true,
      artistSearch: false,
      albumSearch: false,
      playlistSearch: false,
      lyrics: false,
      cover: false,
      playable: true,
      download: false,
    },
    notes: "桌面隐藏浏览器截流（实验）；无 API Key",
  },
  {
    id: "soundstripe",
    label: "Soundstripe",
    status: "sidecar-ready",
    supports: {
      trackSearch: true,
      artistSearch: false,
      albumSearch: false,
      playlistSearch: false,
      lyrics: false,
      cover: false,
      playable: true,
      download: false,
    },
    notes: "桌面隐藏浏览器截流（实验）；首页试听为主",
  },
  {
    id: "muzvox",
    label: "MuzVox",
    status: "sidecar-ready",
    supports: {
      trackSearch: true,
      artistSearch: false,
      albumSearch: false,
      playlistSearch: false,
      lyrics: false,
      cover: true,
      playable: true,
      download: true,
    },
    notes: "muzvox.org HTML 搜索自带 mp3-download 直链；实测可下 audio/mpeg",
  },
  {
    id: "migu",
    label: "咪咕",
    status: "planned",
    supports: {
      trackSearch: false,
      artistSearch: false,
      albumSearch: false,
      playlistSearch: false,
      lyrics: false,
      cover: false,
      playable: false,
      download: false,
    },
    notes: "聚合站有入口；当前 txqq 镜像未接 type=migu，搜索页不展示",
  },
  {
    id: "bilibili",
    label: "Bilibili",
    status: "planned",
    supports: {
      trackSearch: false,
      artistSearch: false,
      albumSearch: false,
      playlistSearch: false,
      lyrics: false,
      cover: false,
      playable: false,
      download: false,
    },
    notes: "规划中；依赖 sidecar，搜索页暂不展示",
  },
];

/** 当前聚合镜像实际可搜的 type（与 txqq-provider.TXQQ_SOURCES 对齐）。 */
export const WIRED_ONLINE_SEARCH_PLATFORM_IDS = ["netease", "qq", "kugou", "kuwo"] as const;

/** 独立在线源（不走 txqq 聚合）。 */
export const WIRED_DIRECT_SEARCH_PLATFORM_IDS =
  listWiredDirectSearchProviderIds() as readonly string[];

const PLATFORM_MAP = new Map(
  PLATFORM_CAPABILITIES.map((platform) => [platform.id, platform] as const),
);

export function listMusicPlatformCapabilities(): MusicPlatformCapability[] {
  return PLATFORM_CAPABILITIES.slice();
}

/** 搜索条件里可选的来源（本地 + 已接线在线源）；不含规划平台。 */
export function listSearchFilterPlatforms(): MusicPlatformCapability[] {
  const wired = new Set<string>([
    "local",
    ...WIRED_ONLINE_SEARCH_PLATFORM_IDS,
    ...WIRED_DIRECT_SEARCH_PLATFORM_IDS,
  ]);
  return PLATFORM_CAPABILITIES.filter((platform) => wired.has(platform.id));
}

export function getMusicPlatformCapability(platformId: string): MusicPlatformCapability | null {
  return PLATFORM_MAP.get(platformId) ?? null;
}

export function getMusicPlatformLabel(platformId: string): string {
  if (platformId === "sidecar") {
    return "本机资源服务";
  }
  if (platformId === "txqq") {
    return "在线聚合";
  }
  return getMusicPlatformCapability(platformId)?.label ?? platformId;
}

export function getDefaultSearchPlatformIds(): string[] {
  return ["netease", "qq", "kugou", "kuwo"];
}

/** 搜索页默认可选来源（含本地）；持久化缺失时回退到此列表。 */
export function getDefaultSearchProviderSelection(): string[] {
  return ["local", "netease", "qq"];
}

const KNOWN_SEARCH_PROVIDER_IDS = new Set([
  "local",
  ...WIRED_ONLINE_SEARCH_PLATFORM_IDS,
  ...WIRED_DIRECT_SEARCH_PLATFORM_IDS,
  "txqq",
  "sidecar",
]);

export function normalizeSearchProviderSelection(value: unknown): string[] {
  const defaults = getDefaultSearchProviderSelection();
  if (!Array.isArray(value)) {
    return defaults.slice();
  }
  const selected = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item && KNOWN_SEARCH_PROVIDER_IDS.has(item));
  // 去重保序
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of selected) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    unique.push(id);
  }
  return unique.length > 0 ? unique : defaults.slice();
}

/** 聚合 provider（txqq/sidecar）是否应响应这组来源选择。 */
export function selectionIncludesOnlineAggregators(selected: readonly string[]): boolean {
  return selected.some(
    (id) => id !== "local" && !(WIRED_DIRECT_SEARCH_PLATFORM_IDS as readonly string[]).includes(id),
  );
}
