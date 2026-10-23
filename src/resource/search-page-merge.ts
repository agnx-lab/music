// 场景：搜索分页合并 — 歌曲/音乐人/专辑/歌单按 ref（及名称别名）去重，避免「加载更多」叠重复卡片。
import type {
  SearchHitAlbum,
  SearchHitArtist,
  SearchHitPlaylist,
  SearchHitTrack,
  SearchResultPage,
} from "./types";

function refKey(providerId: string, remoteId: string): string {
  return `${providerId.trim()}:${remoteId.trim()}`;
}

export function searchHitTrackKey(track: SearchHitTrack): string {
  return refKey(track.ref.providerId, track.ref.remoteId);
}

export function searchHitArtistKey(artist: SearchHitArtist): string {
  const remote = artist.ref.remoteId?.trim() ?? "";
  if (remote && !remote.startsWith("artist:")) {
    return refKey(artist.ref.providerId, remote);
  }
  return refKey(artist.ref.providerId, `name:${artist.name.trim().toLowerCase()}`);
}

export function searchHitAlbumKey(album: SearchHitAlbum): string {
  const remote = album.ref.remoteId?.trim() ?? "";
  if (remote && !remote.startsWith("album:")) {
    return refKey(album.ref.providerId, remote);
  }
  const artist = (album.artist ?? "").trim().toLowerCase();
  return refKey(album.ref.providerId, `title:${album.title.trim().toLowerCase()}|artist:${artist}`);
}

export function searchHitPlaylistKey(playlist: SearchHitPlaylist): string {
  const remote = playlist.ref.remoteId?.trim() ?? "";
  if (remote) {
    return refKey(playlist.ref.providerId, remote);
  }
  return refKey(playlist.ref.providerId, `title:${playlist.title.trim().toLowerCase()}`);
}

function appendUniqueByKey<T>(
  existing: readonly T[],
  incoming: readonly T[],
  keyOf: (item: T) => string,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of existing) {
    const key = keyOf(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  for (const item of incoming) {
    const key = keyOf(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** 将下一页搜索结果并入当前页；四类命中均去重。 */
export function mergeSearchResultPages(
  current: SearchResultPage,
  more: SearchResultPage,
  nextPageNum: number,
): SearchResultPage {
  const tracks = appendUniqueByKey(current.tracks, more.tracks, searchHitTrackKey);
  const artists = appendUniqueByKey(current.artists, more.artists, searchHitArtistKey);
  const albums = appendUniqueByKey(current.albums, more.albums, searchHitAlbumKey);
  const playlists = appendUniqueByKey(current.playlists, more.playlists, searchHitPlaylistKey);
  const appendedTrackCount = tracks.length - current.tracks.length;
  return {
    ...current,
    tracks,
    artists,
    albums,
    playlists,
    providerErrors: [...(current.providerErrors ?? []), ...(more.providerErrors ?? [])],
    debugSearchRequests: [
      ...(current.debugSearchRequests ?? []),
      ...(more.debugSearchRequests ?? []),
    ],
    page: nextPageNum,
    // 仅歌曲增长才视为还有下一页；否则空翻页会反复叠艺人/专辑卡片
    hasMore: Boolean(more.hasMore) && appendedTrackCount > 0,
  };
}
