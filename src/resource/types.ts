// 场景：音乐搜索资源层类型 — 对接搜索 UI / sidecar，不含具体爬虫实现。

export type MusicProviderId = string;

export type SearchScope = "all" | "track" | "artist" | "album" | "playlist";

export interface RemoteRef {
  providerId: MusicProviderId;
  remoteId: string;
  pageUrl?: string;
}

export interface SearchQuery {
  text: string;
  scope?: SearchScope;
  providerIds?: MusicProviderId[];
  limit?: number;
  /** 1-based 页码；各源自行映射（Pixabay pagi / txqq page） */
  page?: number;
}

export interface SearchHitTrack {
  kind: "track";
  ref: RemoteRef;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  coverUrl?: string;
  /** 搜索阶段附带的歌词（LRC / 纯文本，可选） */
  lyrics?: string;
  /** 本地曲目 id（LocalProvider 命中时） */
  localTrackId?: string;
  /** 搜索阶段已验证的可播直链（仅在线源） */
  playableUrl?: string;
}

export interface SearchHitArtist {
  kind: "artist";
  ref: RemoteRef;
  name: string;
  followerCount?: number;
  trackCount?: number;
  coverUrl?: string;
}

export interface SearchHitAlbum {
  kind: "album";
  ref: RemoteRef;
  title: string;
  artist: string;
  trackCount?: number;
  releaseDate?: string;
  coverUrl?: string;
}

export interface SearchHitPlaylist {
  kind: "playlist";
  ref: RemoteRef;
  title: string;
  creator?: string;
  trackCount?: number;
  coverUrl?: string;
}

export type SearchHit = SearchHitTrack | SearchHitArtist | SearchHitAlbum | SearchHitPlaylist;

export interface SearchResultPage {
  query: SearchQuery;
  suggestions: SearchHitArtist[];
  tracks: SearchHitTrack[];
  artists: SearchHitArtist[];
  albums: SearchHitAlbum[];
  playlists: SearchHitPlaylist[];
  providerErrors?: { providerId: string; message: string }[];
  /**
   * 开发态：各源本次实际触发的搜索 URL（及可选官网对照），便于复制到浏览器核验。
   * 无结果 / 失败时也应尽量带上。
   */
  debugSearchRequests?: SearchDebugRequest[];
  /** 当前页码（1 起） */
  page?: number;
  /** 是否还能增量加载下一页 */
  hasMore?: boolean;
}

/** 开发态搜索调试条目 */
export interface SearchDebugRequest {
  providerId: string;
  /** 实际触发的请求（可为 POST 摘要或完整 http(s) URL） */
  url: string;
  /** 可选：官网/人工对照页 */
  compareUrl?: string;
  note?: string;
}

export interface ResolvedPlayable {
  url: string;
  providerId: string;
  remoteId: string;
  bitrate?: number;
  ext?: string;
  sizeBytes?: number;
  /** 点播解析时顺带刮到的元数据（可选） */
  title?: string;
  artist?: string;
  coverUrl?: string;
}

export interface ResolvedLyrics {
  providerId: string;
  remoteId: string;
  text?: string;
  fileUrl?: string;
}

/** 合集详情种类（音乐人 / 专辑 / 歌单） */
export type CollectionKind = "artist" | "album" | "playlist";

export interface ListCollectionQuery {
  kind: CollectionKind;
  ref: RemoteRef;
  /**
   * 合集展示名。派生 ID（artist:/album:）或源无稳定合集 ID 时，
   * listCollection 用此名向各 provider 拉完整曲目，禁止只做本页 filter。
   */
  title?: string;
  limit?: number;
  page?: number;
}

export interface ListCollectionPage {
  kind: CollectionKind;
  ref: RemoteRef;
  title?: string;
  tracks: SearchHitTrack[];
  page?: number;
  hasMore?: boolean;
  providerErrors?: { providerId: string; message: string }[];
}

/** 搜索 UI 当前打开的合集详情（浏览器本地持久化，抗 HMR） */
export interface SearchActiveCollection {
  kind: CollectionKind;
  title: string;
  subtitle?: string | null;
  coverUrl?: string;
  providerId: string;
  remoteId: string;
  /** 由当前歌曲结果聚合成的假 ID（artist: / album:） */
  derived: boolean;
}

export interface MusicResourceProvider {
  id: MusicProviderId;
  label: string;
  search(query: SearchQuery): Promise<SearchResultPage>;
  resolvePlayable?(ref: RemoteRef): Promise<ResolvedPlayable | null>;
  fetchLyrics?(ref: RemoteRef): Promise<ResolvedLyrics | null>;
  /** 按合集 ID 或 title 拉下属曲目；无能力时返回 null（勿 tracks[0] 乱匹配） */
  listCollection?(query: ListCollectionQuery): Promise<ListCollectionPage | null>;
}
