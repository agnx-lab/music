// 场景：音乐资源聚合服务 — UI 只依赖本层；本地 + txqq 聚合（结果自带可播直链）+ 可选 sidecar。
import { localMusicProvider } from "./local-provider";
import { getMusicPlatformCapability } from "./platform-registry";
import { aiguoMusicProvider } from "./aiguo-provider";
import { audiocomMusicProvider } from "./audiocom-provider";
import { muzvoxMusicProvider } from "./muzvox-provider";
import {
  getMusicProviderResolvePriority,
  isBrowserSearchProviderId,
  isDeferredBrowserProviderId,
  shouldIncludeProviderForSelection,
} from "./provider-catalog";
import { sidecarMusicProvider } from "./sidecar-provider";
import { txqqMusicProvider } from "./txqq-provider";
import { pixabayMusicProvider, soundstripeMusicProvider } from "./web-browser-provider";
import { verifyPlayableTracks } from "./playable-filter";
import { mergeSearchDebugRequests } from "./search-debug-urls";
import type {
  ListCollectionPage,
  ListCollectionQuery,
  MusicResourceProvider,
  RemoteRef,
  ResolvedLyrics,
  ResolvedPlayable,
  SearchQuery,
  SearchResultPage,
} from "./types";

const providers: MusicResourceProvider[] = [
  localMusicProvider,
  txqqMusicProvider,
  aiguoMusicProvider,
  audiocomMusicProvider,
  muzvoxMusicProvider,
  pixabayMusicProvider,
  soundstripeMusicProvider,
  // 始终挂上 sidecar：未配置/探测失败时 provider 自行静默空结果，不挡本地与 txqq
  sidecarMusicProvider,
];

function resolveOnlineProviders(): MusicResourceProvider[] {
  return providers;
}

export function listMusicProviders(): { id: string; label: string }[] {
  return resolveOnlineProviders().map((provider) => ({ id: provider.id, label: provider.label }));
}

export function listIntegratedMusicPlatforms(): {
  id: string;
  label: string;
  status: "local" | "sidecar-ready" | "planned";
}[] {
  return [
    "local",
    "netease",
    "qq",
    "kugou",
    "kuwo",
    "aiguo",
    "audiocom",
    "muzvox",
    "pixabay",
    "soundstripe",
    "migu",
    "bilibili",
  ]
    .map((id) => getMusicPlatformCapability(id))
    .filter(
      (item): item is NonNullable<ReturnType<typeof getMusicPlatformCapability>> => item != null,
    )
    .map((item) => ({ id: item.id, label: item.label, status: item.status }));
}

function mergeProviderErrors(
  ...groups: Array<{ providerId: string; message: string }[] | undefined>
): { providerId: string; message: string }[] {
  const seen = new Set<string>();
  const merged: { providerId: string; message: string }[] = [];
  for (const group of groups) {
    for (const item of group ?? []) {
      const key = `${item.providerId}:${item.message}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function isBrowserSearchProvider(provider: MusicResourceProvider): boolean {
  return isBrowserSearchProviderId(provider.id);
}

function createEmptySearchPage(query: SearchQuery): SearchResultPage {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: [],
    debugSearchRequests: [],
    page: Math.max(1, Math.floor(query.page ?? 1)),
    hasMore: false,
  };
}

function mergeProviderPageInto(merged: SearchResultPage, page: SearchResultPage): void {
  merged.suggestions.push(...page.suggestions);
  merged.tracks.push(...page.tracks);
  merged.artists.push(...page.artists);
  merged.albums.push(...page.albums);
  merged.playlists.push(...page.playlists);
  if (page.providerErrors?.length) {
    merged.providerErrors = mergeProviderErrors(merged.providerErrors, page.providerErrors);
  }
  if (page.debugSearchRequests?.length) {
    merged.debugSearchRequests = mergeSearchDebugRequests(
      merged.debugSearchRequests,
      page.debugSearchRequests,
    );
  }
  if (page.hasMore) {
    merged.hasMore = true;
  }
  if (typeof page.page === "number") {
    merged.page = Math.max(merged.page ?? 1, page.page);
  }
}

function snapshotSearchPage(page: SearchResultPage): SearchResultPage {
  return {
    ...page,
    suggestions: [...page.suggestions],
    tracks: [...page.tracks],
    artists: [...page.artists],
    albums: [...page.albums],
    playlists: [...page.playlists],
    providerErrors: [...(page.providerErrors ?? [])],
    debugSearchRequests: [...(page.debugSearchRequests ?? [])],
  };
}

export interface SearchMusicOptions {
  /** 每完成一个 provider 回调一次（已合并快照）；单源失败不得清空先前结果 */
  onPartial?: (page: SearchResultPage) => void;
}

export async function searchMusic(
  query: SearchQuery,
  options?: SearchMusicOptions,
): Promise<SearchResultPage> {
  const selected = query.providerIds;
  const enabled = resolveOnlineProviders().filter((provider) =>
    shouldIncludeProviderForSelection(provider.id, selected),
  );

  const fast = enabled.filter((provider) => !isBrowserSearchProvider(provider));
  // 浏览器源共用单窗串行队列：显式串行且稳定排序，避免慢源/挂源拖死快源出结果
  const browser = enabled
    .filter((provider) => isBrowserSearchProvider(provider))
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));

  const merged = createEmptySearchPage(query);
  const emitPartial = () => {
    options?.onPartial?.(snapshotSearchPage(merged));
  };

  const runProvider = async (provider: MusicResourceProvider): Promise<void> => {
    try {
      const page = await provider.search(query);
      mergeProviderPageInto(merged, page);
    } catch (reason) {
      merged.providerErrors = mergeProviderErrors(merged.providerErrors, [
        {
          providerId: provider.id,
          message: reason instanceof Error ? reason.message : "搜索失败",
        },
      ]);
    }
    emitPartial();
  };

  if (fast.length > 0) {
    await Promise.all(fast.map((provider) => runProvider(provider)));
  }
  for (const provider of browser) {
    await runProvider(provider);
  }

  merged.providerErrors = mergeProviderErrors(merged.providerErrors);
  merged.debugSearchRequests = mergeSearchDebugRequests(merged.debugSearchRequests);
  if (merged.page == null) {
    merged.page = Math.max(1, Math.floor(query.page ?? 1));
  }
  return snapshotSearchPage(merged);
}

function applyPlayableFilterKeepErrors(page: SearchResultPage): SearchResultPage {
  const scope = page.query.scope ?? "all";
  if (scope !== "all" && scope !== "track") {
    return page;
  }
  const localHits = page.tracks.filter((track) => track.localTrackId);
  const readyHits = page.tracks.filter((track) => !track.localTrackId && track.playableUrl);
  const deferredBrowserHits = page.tracks.filter(
    (track) =>
      !track.localTrackId &&
      !track.playableUrl &&
      Boolean(track.ref.pageUrl) &&
      isDeferredBrowserProviderId(track.ref.providerId),
  );
  const pendingHits = page.tracks.filter(
    (track) =>
      !track.localTrackId &&
      !track.playableUrl &&
      !deferredBrowserHits.some(
        (item) =>
          item.ref.providerId === track.ref.providerId && item.ref.remoteId === track.ref.remoteId,
      ),
  );
  return {
    ...page,
    tracks: [...localHits, ...readyHits, ...deferredBrowserHits, ...pendingHits],
    providerErrors: mergeProviderErrors(page.providerErrors),
  };
}

/** 搜索并只保留可播条目：已有 playableUrl 的直接保留，其余走 resolver 验证。 */
export async function searchPlayableMusic(
  query: SearchQuery,
  options?: SearchMusicOptions,
): Promise<SearchResultPage> {
  const page = await searchMusic(query, {
    onPartial: (partial) => {
      // 部分结果先展示可立即用的条目（含浏览器延后点播），不因慢源阻塞
      const quick = applyPlayableFilterKeepErrors(partial);
      const withoutPending = {
        ...quick,
        tracks: quick.tracks.filter(
          (track) =>
            Boolean(track.localTrackId) ||
            Boolean(track.playableUrl) ||
            (Boolean(track.ref.pageUrl) && isDeferredBrowserProviderId(track.ref.providerId)),
        ),
      };
      options?.onPartial?.(withoutPending);
    },
  });
  const scope = query.scope ?? "all";
  if (scope !== "all" && scope !== "track") {
    return page;
  }
  const localHits = page.tracks.filter((track) => track.localTrackId);
  const readyHits = page.tracks.filter((track) => !track.localTrackId && track.playableUrl);
  // 浏览器源：有详情页即可进列表，点播时再截流（避免搜索阶段开几十个隐藏窗）
  const deferredBrowserHits = page.tracks.filter(
    (track) =>
      !track.localTrackId &&
      !track.playableUrl &&
      Boolean(track.ref.pageUrl) &&
      isDeferredBrowserProviderId(track.ref.providerId),
  );
  const pendingHits = page.tracks.filter(
    (track) =>
      !track.localTrackId &&
      !track.playableUrl &&
      !deferredBrowserHits.some(
        (item) =>
          item.ref.providerId === track.ref.providerId && item.ref.remoteId === track.ref.remoteId,
      ),
  );
  const { verified } = await verifyPlayableTracks(pendingHits, async (ref) => {
    const resolved = await resolveMusicPlayable(ref);
    return resolved ? { url: resolved.url } : null;
  });
  const seen = new Set<string>();
  const tracks = [];
  for (const track of [...localHits, ...readyHits, ...deferredBrowserHits, ...verified]) {
    const key = track.localTrackId ?? `${track.ref.providerId}:${track.ref.remoteId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tracks.push(track);
  }
  return {
    ...page,
    tracks,
    // 保留源级降级文案，勿在可播过滤时清空
    providerErrors: mergeProviderErrors(page.providerErrors),
  };
}

/** 解析顺序：同名 provider 优先；聚合源里 sidecar 先于 txqq（避免错误回退串歌）。 */
function providersForRemoteResolve(ref: RemoteRef): MusicResourceProvider[] {
  const all = resolveOnlineProviders().filter((provider) => provider.id !== "local");
  const exact = all.filter((provider) => provider.id === ref.providerId);
  const rest = all
    .filter((provider) => provider.id !== ref.providerId)
    .slice()
    .sort((left, right) => {
      return getMusicProviderResolvePriority(left.id) - getMusicProviderResolvePriority(right.id);
    });
  return [...exact, ...rest];
}

function playableMatchesRef(resolved: ResolvedPlayable, ref: RemoteRef): boolean {
  if (resolved.remoteId && ref.remoteId && resolved.remoteId !== ref.remoteId) {
    return false;
  }
  if (resolved.providerId && ref.providerId && resolved.providerId !== ref.providerId) {
    // 聚合源可能用平台 id（netease）而非 provider.id（sidecar/txqq）回填
    if (resolved.providerId === "sidecar" || resolved.providerId === "txqq") {
      return true;
    }
    if (ref.providerId === "sidecar" || ref.providerId === "txqq") {
      return true;
    }
    return false;
  }
  return true;
}

export async function resolveMusicPlayable(ref: RemoteRef): Promise<ResolvedPlayable | null> {
  if (!ref.providerId || ref.providerId === "local") {
    return null;
  }
  for (const provider of providersForRemoteResolve(ref)) {
    if (!provider.resolvePlayable) {
      continue;
    }
    const resolved = await provider.resolvePlayable(ref);
    if (resolved?.url?.trim() && playableMatchesRef(resolved, ref)) {
      return resolved;
    }
  }
  return null;
}

export async function fetchMusicLyrics(ref: RemoteRef): Promise<ResolvedLyrics | null> {
  if (!ref.providerId || ref.providerId === "local") {
    return null;
  }
  for (const provider of providersForRemoteResolve(ref)) {
    if (!provider.fetchLyrics) {
      continue;
    }
    const resolved = await provider.fetchLyrics(ref);
    if (!resolved) {
      continue;
    }
    if (resolved.remoteId && ref.remoteId && resolved.remoteId !== ref.remoteId) {
      continue;
    }
    return resolved;
  }
  return null;
}

/**
 * 按合集 ref / title 拉曲目列表。
 * - 真实合集 ID：优先 ref.providerId 同源，再试其他实现了 listCollection 的源
 * - 派生 ID（artist:/album:）：带 title 走各源 listCollection（禁止直接 return null）
 * 全部失败时由 UI 降级本页匹配 / 相关搜索。
 */
export async function listMusicCollection(
  query: ListCollectionQuery,
): Promise<ListCollectionPage | null> {
  const remoteId = query.ref.remoteId?.trim() ?? "";
  const title = (query.title ?? "").trim();
  const derived = remoteId.startsWith("artist:") || remoteId.startsWith("album:");
  if (!remoteId && !title) {
    return null;
  }

  const enriched: ListCollectionQuery = {
    ...query,
    title: title || undefined,
    ref: {
      ...query.ref,
      remoteId: remoteId || query.ref.remoteId,
    },
  };

  const candidates = orderListCollectionProviders(
    resolveOnlineProviders().filter((provider) => provider.listCollection),
    query.ref.providerId?.trim() ?? "",
  ).filter((provider) => {
    // 远端合集不要落到 local 曲库「按名搜索」冒充详情
    const preferred = query.ref.providerId?.trim() ?? "";
    if (preferred && preferred !== "local" && provider.id === "local") {
      return false;
    }
    return true;
  });

  for (const provider of candidates) {
    try {
      const page = await provider.listCollection!(enriched);
      if (!page || page.tracks.length === 0) {
        continue;
      }
      // 真实 ID：拒绝串合集；派生 ID 允许源站返回自身 remoteId
      if (!derived && page.ref.remoteId && remoteId && page.ref.remoteId !== remoteId) {
        continue;
      }
      return page;
    } catch {
      // 单个 provider 失败不影响后续
    }
  }
  return null;
}

function orderListCollectionProviders(
  list: MusicResourceProvider[],
  preferredId: string,
): MusicResourceProvider[] {
  if (!preferredId) {
    return list;
  }
  const preferred = list.filter((provider) => provider.id === preferredId);
  const rest = list.filter((provider) => provider.id !== preferredId);
  return [...preferred, ...rest];
}
