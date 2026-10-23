// 场景：合集曲目解析瀑布 — listCollection 优先，本地页内匹配作乐观缓存，再相关搜索。
import { listMusicCollection, searchPlayableMusic } from "./service";
import type { CollectionKind, SearchActiveCollection, SearchHitTrack, SearchScope } from "./types";

export type CollectionTrackSource = "local" | "list" | "related" | "empty";

export interface ResolvedCollectionTracks {
  tracks: SearchHitTrack[];
  source: CollectionTrackSource;
}

export function isDerivedCollectionRemoteId(remoteId: string): boolean {
  return remoteId.startsWith("artist:") || remoteId.startsWith("album:");
}

export function filterTracksForCollection(
  tracks: readonly SearchHitTrack[],
  collection: Pick<SearchActiveCollection, "kind" | "title">,
): SearchHitTrack[] {
  if (collection.kind === "artist") {
    const name = collection.title.trim().toLowerCase();
    if (!name) {
      return [];
    }
    return tracks.filter((track) => track.artist.trim().toLowerCase() === name);
  }
  if (collection.kind === "album") {
    const title = collection.title.trim().toLowerCase();
    if (!title) {
      return [];
    }
    return tracks.filter((track) => (track.album ?? "").trim().toLowerCase() === title);
  }
  // 歌单无法从扁平歌曲结果可靠还原
  return [];
}

/**
 * 合集曲目解析（可离线调用，不依赖详情页状态）：
 * 1. 非派生 ID：优先 listCollection（真详情）
 * 2. 本页搜索结果里的匹配（乐观 / 降级）
 * 3. 按合集名再搜 + 本地筛选（related）
 *
 * 不再「有本页匹配就跳过远端」——那会把艺人/专辑锁死在搜索页子集。
 */
export async function resolveCollectionTracks(input: {
  collection: Pick<
    SearchActiveCollection,
    "kind" | "title" | "providerId" | "remoteId" | "derived"
  >;
  pageTracks?: readonly SearchHitTrack[];
  providerIds?: readonly string[];
  searchScope?: SearchScope;
  /** 若调用方已有新鲜 list 缓存可直接传入，跳过网络 */
  cachedListTracks?: readonly SearchHitTrack[] | null;
}): Promise<ResolvedCollectionTracks> {
  const local = filterTracksForCollection(input.pageTracks ?? [], input.collection);
  if (input.cachedListTracks && input.cachedListTracks.length > 0) {
    return { tracks: [...input.cachedListTracks], source: "list" };
  }

  // 派生 / 真实 ID 都走 listCollection；title 供无稳定合集 ID 的源拉完整列表
  const listed = await listMusicCollection({
    kind: input.collection.kind,
    title: input.collection.title,
    ref: {
      providerId: input.collection.providerId,
      remoteId: input.collection.remoteId,
    },
  });
  if (listed && listed.tracks.length > 0) {
    return { tracks: [...listed.tracks], source: "list" };
  }

  // 远端未实现或失败时：本页匹配作乐观降级
  if (local.length > 0) {
    return { tracks: local, source: "local" };
  }

  const title = input.collection.title.trim();
  if (!title) {
    return { tracks: [], source: "empty" };
  }

  const relatedPage = await searchPlayableMusic({
    text: title,
    scope: input.searchScope ?? "all",
    providerIds: input.providerIds ? [...input.providerIds] : undefined,
    page: 1,
  });
  const matched = filterTracksForCollection(relatedPage.tracks, input.collection);
  const tracks = matched.length > 0 ? matched : relatedPage.tracks;
  if (tracks.length === 0) {
    return { tracks: [], source: "empty" };
  }
  return { tracks, source: "related" };
}

export function collectionTrackSourceHint(input: {
  kind: CollectionKind;
  source: CollectionTrackSource;
  derived?: boolean;
  loading?: boolean;
  title?: string;
  empty?: boolean;
  /** @deprecated 合集已改为仅本页过滤，保留字段兼容测试 */
  hasOptimisticTracks?: boolean;
}): string {
  let kindLabel = "歌单";
  if (input.kind === "artist") {
    kindLabel = "音乐人";
  } else if (input.kind === "album") {
    kindLabel = "专辑";
  }
  if (input.loading && !input.hasOptimisticTracks) {
    return `正在加载「${input.title ?? ""}」曲目…`;
  }
  if (input.source === "local") {
    return `来源：当前搜索结果中的${kindLabel}匹配。加载更多 = 原搜索翻页后再过滤。`;
  }
  if (input.source === "list" || input.source === "related") {
    return `来源：当前搜索结果中的${kindLabel}匹配。`;
  }
  if (input.empty) {
    return `当前搜索结果里没有「${input.title ?? ""}」的匹配歌曲。可加载更多或重新搜索。`;
  }
  return "暂无曲目。";
}

export function collectionTrackCountSuffix(source: CollectionTrackSource): string {
  if (source === "local" || source === "list" || source === "related") {
    return "（本页过滤）";
  }
  return "";
}

/** 合集曲目缺封面时回落合集封面（艺人/专辑页常见：详情有头像，曲目无 pic）。 */
export function fillTracksMissingCover(
  tracks: readonly SearchHitTrack[],
  fallbackCoverUrl?: string | null,
): SearchHitTrack[] {
  const fallback = fallbackCoverUrl?.trim() || "";
  if (!fallback) {
    return [...tracks];
  }
  return tracks.map((track) => {
    if (track.coverUrl?.trim()) {
      return track;
    }
    return { ...track, coverUrl: fallback };
  });
}
