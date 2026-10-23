// 场景：合集（音乐人/专辑/歌单）详情曲目缓存 — 与搜索关键词缓存分离，按实体 ref 索引。
import type { CollectionKind, SearchHitTrack } from "./types";

export const DEFAULT_MUSIC_COLLECTION_CACHE_TTL_MINUTES = 15;
export const MUSIC_COLLECTION_CACHE_MAX_ENTRIES = 40;

export type MusicCollectionDetailSource = "list" | "related" | "local";

export interface MusicCollectionDetailCacheEntry {
  kind: CollectionKind;
  providerId: string;
  remoteId: string;
  title: string;
  tracks: SearchHitTrack[];
  source: MusicCollectionDetailSource;
  updatedAt: number;
}

export function buildMusicCollectionCacheKey(input: {
  kind: CollectionKind;
  providerId: string;
  remoteId: string;
}): string {
  return `${input.kind}::${input.providerId.trim()}::${input.remoteId.trim()}`;
}

export function isMusicCollectionCacheFresh(
  entry: MusicCollectionDetailCacheEntry | null | undefined,
  ttlMinutes: number,
  now = Date.now(),
): boolean {
  if (!entry || !Array.isArray(entry.tracks) || !entry.updatedAt) {
    return false;
  }
  const ttlMs = Math.max(1, ttlMinutes) * 60_000;
  return now - entry.updatedAt < ttlMs;
}

export function findMusicCollectionCacheEntry(
  entries: MusicCollectionDetailCacheEntry[],
  input: { kind: CollectionKind; providerId: string; remoteId: string },
): MusicCollectionDetailCacheEntry | null {
  const key = buildMusicCollectionCacheKey(input);
  return (
    entries.find(
      (entry) =>
        buildMusicCollectionCacheKey({
          kind: entry.kind,
          providerId: entry.providerId,
          remoteId: entry.remoteId,
        }) === key,
    ) ?? null
  );
}

export function upsertMusicCollectionCacheEntry(
  entries: MusicCollectionDetailCacheEntry[],
  next: MusicCollectionDetailCacheEntry,
  maxEntries = MUSIC_COLLECTION_CACHE_MAX_ENTRIES,
): MusicCollectionDetailCacheEntry[] {
  const key = buildMusicCollectionCacheKey(next);
  const filtered = entries.filter(
    (entry) =>
      buildMusicCollectionCacheKey({
        kind: entry.kind,
        providerId: entry.providerId,
        remoteId: entry.remoteId,
      }) !== key,
  );
  return [next, ...filtered].slice(0, maxEntries);
}
