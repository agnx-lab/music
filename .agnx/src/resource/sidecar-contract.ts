// 场景：Music 自研 sidecar contract — Sub App 只认这里，不直接认第三方接口 shape。
import { getDefaultSearchPlatformIds } from "./platform-registry";
import type { RemoteRef, SearchQuery, SearchScope } from "./types";

export type MusicSidecarSearchKind = "song" | "album" | "playlist" | "artist";

export interface MusicSidecarSearchRequest {
  keyword: string;
  kind: MusicSidecarSearchKind;
  sourceIds: string[];
  limit?: number;
}

export interface MusicSidecarSearchEnvelope {
  items: unknown[];
}

export interface MusicSidecarResolveRequest {
  sourceId: string;
  remoteId: string;
}

export type MusicSidecarCollectionKind = "artist" | "album" | "playlist";

export interface MusicSidecarCollectionRequest {
  sourceId: string;
  remoteId: string;
  kind: MusicSidecarCollectionKind;
  limit?: number;
  page?: number;
}

export function buildSidecarCollectionUrl(
  baseUrl: string,
  request: MusicSidecarCollectionRequest,
): string {
  const url = new URL("/api/v1/music/collection", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("source", request.sourceId);
  url.searchParams.set("id", request.remoteId);
  url.searchParams.set("type", request.kind);
  if (request.limit != null) {
    url.searchParams.set("limit", String(request.limit));
  }
  if (request.page != null) {
    url.searchParams.set("page", String(request.page));
  }
  return url.toString();
}

export function resolveSidecarSearchKinds(scope: SearchScope): MusicSidecarSearchKind[] {
  if (scope === "track") {
    return ["song"];
  }
  if (scope === "artist") {
    return ["artist"];
  }
  if (scope === "album") {
    return ["album"];
  }
  if (scope === "playlist") {
    return ["playlist"];
  }
  return ["song", "artist", "album", "playlist"];
}

export function buildSidecarSearchRequest(
  query: SearchQuery,
  kind: MusicSidecarSearchKind,
): MusicSidecarSearchRequest {
  const sourceIds = (query.providerIds ?? []).filter(
    (providerId) => providerId && providerId !== "local",
  );
  return {
    keyword: query.text.trim(),
    kind,
    sourceIds: sourceIds.length > 0 ? sourceIds : getDefaultSearchPlatformIds(),
    limit: query.limit,
  };
}

export function normalizeThirdPartySearchPayload(payload: unknown): MusicSidecarSearchEnvelope {
  function visit(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (!value || typeof value !== "object") {
      return [];
    }
    const record = value as {
      data?: unknown;
      list?: unknown;
      items?: unknown;
      songs?: unknown;
      albums?: unknown;
      playlists?: unknown;
      artists?: unknown;
      result?: unknown;
    };
    for (const candidate of [
      record.data,
      record.list,
      record.items,
      record.songs,
      record.albums,
      record.playlists,
      record.artists,
      record.result,
    ]) {
      const items = visit(candidate);
      if (items.length > 0) {
        return items;
      }
    }
    return [];
  }
  return {
    items: visit(payload),
  };
}

export function buildSidecarResolveRequest(ref: RemoteRef): MusicSidecarResolveRequest {
  return {
    sourceId: ref.providerId,
    remoteId: ref.remoteId,
  };
}
