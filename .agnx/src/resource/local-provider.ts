// 场景：本地曲库搜索 Provider — 先通搜索 UI，不依赖在线源。
import { listTracksAsWorkspaceItems, useMusicDemoStore } from "../store";
import type {
  ListCollectionPage,
  ListCollectionQuery,
  MusicResourceProvider,
  SearchHitTrack,
  SearchQuery,
  SearchResultPage,
} from "./types";
import { listCollectionByNameSearch } from "./collection-list-helpers";

function emptyPage(query: SearchQuery): SearchResultPage {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: [],
  };
}

export const localMusicProvider: MusicResourceProvider = {
  id: "local",
  label: "本地",
  async search(query) {
    const text = query.text.trim();
    if (!text) {
      return emptyPage(query);
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage(query);
    }
    const items = listTracksAsWorkspaceItems(text);
    const state = useMusicDemoStore.getState();
    const tracks: SearchHitTrack[] = items.map((item) => {
      const track = state.getTrack(item.id);
      return {
        kind: "track" as const,
        ref: { providerId: "local", remoteId: item.id },
        title: item.title,
        artist: track?.artist || item.subtitle || "",
        album: track?.album,
        coverUrl: track?.coverUri ?? undefined,
        localTrackId: item.id,
      };
    });
    return {
      query,
      suggestions: [],
      tracks,
      artists: [],
      albums: [],
      playlists: [],
      providerErrors: [],
    };
  },
  /** 本地曲库：按艺人/专辑名筛本地条目。 */
  async listCollection(query: ListCollectionQuery): Promise<ListCollectionPage | null> {
    return listCollectionByNameSearch(this, query, { maxPages: 1, pageLimit: 200 });
  },
};
