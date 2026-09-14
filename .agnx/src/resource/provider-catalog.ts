// 场景：音乐源能力目录 — 统一声明搜索/点播/可播策略，避免 service 按 id 硬编码分叉。
import type { MusicProviderId } from "./types";

/** 搜索实现族 */
export type MusicSearchMode = "local" | "api" | "html" | "browser" | "aggregator";

/** 点播解析族 */
export type MusicResolveMode = "none" | "inline" | "api" | "html" | "browser";

/**
 * 可播准入策略：
 * - local：本地曲库
 * - search-inline：搜索结果必须自带 playableUrl，否则丢弃
 * - resolve-verify：进列表前/后走 resolve 验证
 * - deferred-browser：仅有详情页，点播时再截流（桌面浏览器）
 */
export type MusicPlayablePolicy = "local" | "search-inline" | "resolve-verify" | "deferred-browser";

/** 合集详情能力：none=无；name-search=按名搜索过滤；api=真合集接口 */
export type MusicListCollectionMode = "none" | "name-search" | "api";

export interface MusicProviderCapabilities {
  id: MusicProviderId;
  label: string;
  searchMode: MusicSearchMode;
  resolveMode: MusicResolveMode;
  playablePolicy: MusicPlayablePolicy;
  /** 已通过可播/下载验收，允许出现在搜索条件 */
  wiredForSearch: boolean;
  /** 合集详情实现；缺省 none */
  listCollection?: MusicListCollectionMode;
  /** txqq/sidecar：勾选网易云等平台时一并启用 */
  isAggregator?: boolean;
  /** 搜索走隐藏浏览器慢路径（串行） */
  browserSearch?: boolean;
  /** 播放/下载请求建议 Referer */
  referer?: string;
  /** providersForRemoteResolve 非精确命中时的排序（越小越先） */
  resolvePriority?: number;
  /** 签名直链大概有效期（秒）；用于刷新策略提示 */
  urlTtlSeconds?: number;
  notes?: string;
}

/**
 * 唯一能力表。新增源：先填 planned 能力，验收通过后再把 wiredForSearch=true 并挂到 service.providers。
 */
export const MUSIC_PROVIDER_CAPABILITIES: readonly MusicProviderCapabilities[] = [
  {
    id: "local",
    label: "本地",
    searchMode: "local",
    resolveMode: "none",
    playablePolicy: "local",
    wiredForSearch: true,
    listCollection: "name-search",
  },
  {
    id: "txqq",
    label: "在线聚合",
    searchMode: "aggregator",
    resolveMode: "inline",
    playablePolicy: "search-inline",
    wiredForSearch: true,
    isAggregator: true,
    listCollection: "name-search",
    resolvePriority: 50,
    notes: "无艺人/专辑详情 API；listCollection=多页搜索+字段过滤",
  },
  {
    id: "sidecar",
    label: "本机资源服务",
    searchMode: "aggregator",
    resolveMode: "api",
    playablePolicy: "search-inline",
    wiredForSearch: true,
    isAggregator: true,
    listCollection: "api",
    resolvePriority: 10,
  },
  {
    id: "aiguo",
    label: "爱听",
    searchMode: "html",
    resolveMode: "api",
    playablePolicy: "resolve-verify",
    wiredForSearch: true,
    listCollection: "name-search",
    resolvePriority: 20,
    referer: "https://www.6uq.cn/",
  },
  {
    id: "pixabay",
    label: "Pixabay",
    searchMode: "browser",
    resolveMode: "browser",
    playablePolicy: "deferred-browser",
    wiredForSearch: true,
    browserSearch: true,
    resolvePriority: 30,
    referer: "https://pixabay.com/",
  },
  {
    id: "soundstripe",
    label: "Soundstripe",
    searchMode: "browser",
    resolveMode: "browser",
    playablePolicy: "deferred-browser",
    wiredForSearch: true,
    browserSearch: true,
    resolvePriority: 40,
    referer: "https://www.soundstripe.com/",
  },
  {
    id: "audiocom",
    label: "Audio.com",
    searchMode: "api",
    resolveMode: "api",
    playablePolicy: "search-inline",
    wiredForSearch: true,
    listCollection: "name-search",
    resolvePriority: 25,
    referer: "https://audio.com/",
    urlTtlSeconds: 518_400,
    notes: "api.audio.com 搜索自带签名 mp3；listCollection=按名搜索过滤",
  },
  {
    id: "muzvox",
    label: "MuzVox",
    searchMode: "html",
    resolveMode: "html",
    listCollection: "name-search",
    playablePolicy: "search-inline",
    wiredForSearch: true,
    resolvePriority: 28,
    referer: "https://muzvox.org/",
    notes: "muzvox.org HTML 搜索自带 storage mp3-download 直链；可播可下",
  },
] as const;

const CAP_BY_ID = new Map(MUSIC_PROVIDER_CAPABILITIES.map((item) => [item.id, item] as const));

export function getMusicProviderCapabilities(providerId: string): MusicProviderCapabilities | null {
  return CAP_BY_ID.get(providerId) ?? null;
}

export function listWiredDirectSearchProviderIds(): string[] {
  return MUSIC_PROVIDER_CAPABILITIES.filter(
    (item) =>
      item.wiredForSearch &&
      !item.isAggregator &&
      item.id !== "local" &&
      item.searchMode !== "aggregator",
  ).map((item) => item.id);
}

export function isBrowserSearchProviderId(providerId: string): boolean {
  return getMusicProviderCapabilities(providerId)?.browserSearch === true;
}

export function isDeferredBrowserProviderId(providerId: string | undefined): boolean {
  if (!providerId) {
    return false;
  }
  return getMusicProviderCapabilities(providerId)?.playablePolicy === "deferred-browser";
}

export function isAggregatorProviderId(providerId: string): boolean {
  return getMusicProviderCapabilities(providerId)?.isAggregator === true;
}

export function getMusicProviderReferer(providerId: string | undefined): string | undefined {
  if (!providerId) {
    return undefined;
  }
  return getMusicProviderCapabilities(providerId)?.referer;
}

/** 非精确 resolve 时的排序键（越小越先）。 */
export function getMusicProviderResolvePriority(providerId: string): number {
  const cap = getMusicProviderCapabilities(providerId);
  if (typeof cap?.resolvePriority === "number") {
    return cap.resolvePriority;
  }
  return 99;
}

export function shouldIncludeProviderForSelection(
  providerId: string,
  selected: readonly string[] | undefined,
): boolean {
  if (!selected || selected.length === 0) {
    return true;
  }
  if (providerId === "local") {
    return selected.includes("local");
  }
  if (isAggregatorProviderId(providerId)) {
    if (selected.includes(providerId)) {
      return true;
    }
    // 与 platform-registry.selectionIncludesOnlineAggregators 对齐：勾了非本地、非直连源即开聚合
    const direct = new Set(listWiredDirectSearchProviderIds());
    return selected.some((id) => id !== "local" && !direct.has(id));
  }
  return selected.includes(providerId);
}
