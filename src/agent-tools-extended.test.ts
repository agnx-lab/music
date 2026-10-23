// 场景：Music Agent 工具 P0 — list_library / list_queue / set_play_mode / queue_ops / track_ops。
import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  sourceUri: string | null;
  sourceKind: "local" | "cloud";
  pinned?: boolean;
  liked?: boolean;
  bookmarked?: boolean;
  coverUri?: string | null;
  lyrics?: string | null;
  lyricsUri?: string | null;
  atmospherePalette?: {
    dark: { primary: string; secondary?: string; tertiary?: string };
    light: { primary: string; secondary?: string; tertiary?: string };
    coverKey: string;
    extractVersion?: number;
  } | null;
  remoteRef?: { providerId: string; remoteId: string; pageUrl?: string } | null;
  updatedAt: number;
}

const tracks: MockTrack[] = [];
let queueIds: string[] = [];
let nowPlayingId: string | null = null;
let playMode: "sequence" | "loop-one" | "shuffle" = "sequence";
let lyricsDensity: "compact" | "relaxed" = "compact";
let atmospherePushEnabled = true;
let coverBackdropEnabled = true;
let coverBackdropBlur = 10;
let coverBackdropOpacity = 0.55;
let coverBackdropIncludeTabBar = false;
let searchCacheTtlMinutes = 15;
let searchProviderIds = ["local", "netease", "qq"];
let volume = 1;
let muted = false;
let coverHidden = false;
let compactActionRailVisible = true;
let playerSurface: "player" | "search" = "player";
let wantsPlaying = false;

function resetState(nextTracks: MockTrack[]): void {
  tracks.splice(0, tracks.length, ...nextTracks.map((t) => ({ ...t })));
  queueIds = nextTracks.slice(0, 2).map((t) => t.id);
  nowPlayingId = queueIds[0] ?? null;
  playMode = "sequence";
  lyricsDensity = "compact";
  atmospherePushEnabled = true;
  coverBackdropEnabled = true;
  coverBackdropBlur = 10;
  coverBackdropOpacity = 0.55;
  coverBackdropIncludeTabBar = false;
  searchCacheTtlMinutes = 15;
  searchProviderIds = ["local", "netease", "qq"];
  volume = 1;
  muted = false;
  coverHidden = false;
  compactActionRailVisible = true;
  playerSurface = "player";
  wantsPlaying = false;
}

const storeApi = {
  get tracks() {
    return tracks;
  },
  get queueIds() {
    return queueIds;
  },
  get nowPlayingId() {
    return nowPlayingId;
  },
  get playMode() {
    return playMode;
  },
  get lyricsDensity() {
    return lyricsDensity;
  },
  get atmospherePushEnabled() {
    return atmospherePushEnabled;
  },
  get coverBackdropEnabled() {
    return coverBackdropEnabled;
  },
  get coverBackdropBlur() {
    return coverBackdropBlur;
  },
  get coverBackdropOpacity() {
    return coverBackdropOpacity;
  },
  get coverBackdropIncludeTabBar() {
    return coverBackdropIncludeTabBar;
  },
  get searchCacheTtlMinutes() {
    return searchCacheTtlMinutes;
  },
  get searchProviderIds() {
    return searchProviderIds;
  },
  get volume() {
    return volume;
  },
  get muted() {
    return muted;
  },
  get coverHidden() {
    return coverHidden;
  },
  get compactActionRailVisible() {
    return compactActionRailVisible;
  },
  get playerSurface() {
    return playerSurface;
  },
  get wantsPlaying() {
    return wantsPlaying;
  },
  getTrack: (id: string) => tracks.find((t) => t.id === id),
  setPlayMode: (mode: typeof playMode) => {
    playMode = mode;
  },
  setQueueIds: (ids: string[]) => {
    queueIds = [...ids];
  },
  addToQueue: (id: string, position: "end" | "next" = "end") => {
    if (!tracks.some((t) => t.id === id)) {
      return false;
    }
    const next = queueIds.filter((qid) => qid !== id);
    if (position === "next") {
      const currentIndex = nowPlayingId ? next.indexOf(nowPlayingId) : -1;
      const insertAt = currentIndex >= 0 ? currentIndex + 1 : 0;
      next.splice(insertAt, 0, id);
    } else {
      next.push(id);
    }
    queueIds = next;
    return true;
  },
  removeFromQueue: (id: string) => {
    if (!queueIds.includes(id)) {
      return false;
    }
    queueIds = queueIds.filter((qid) => qid !== id);
    if (nowPlayingId === id) {
      nowPlayingId = queueIds[0] ?? null;
    }
    return true;
  },
  deleteTrack: (id: string) => {
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx < 0) {
      return false;
    }
    tracks.splice(idx, 1);
    queueIds = queueIds.filter((qid) => qid !== id);
    if (nowPlayingId === id) {
      nowPlayingId = queueIds[0] ?? null;
    }
    return true;
  },
  togglePinned: (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) {
      return null;
    }
    track.pinned = !track.pinned;
    return Boolean(track.pinned);
  },
  setSearchProviderIds: (ids: string[]) => {
    searchProviderIds = ids.length > 0 ? [...ids] : ["local"];
  },
};

vi.mock("./list-contributions", () => ({
  MUSIC_APP_ID: "com.example.music",
}));

vi.mock("./store", () => ({
  useMusicDemoStore: {
    getState: () => storeApi,
  },
  isMusicTrackDownloadedLocally: (track: MockTrack | null | undefined) =>
    Boolean(
      track &&
      track.sourceKind === "local" &&
      track.sourceUri &&
      !/^https?:\/\//i.test(track.sourceUri) &&
      !track.sourceUri.startsWith("blob:"),
    ),
}));

vi.mock("./playback-engine", () => ({
  getMusicPlaybackAudio: () => null,
}));

vi.mock("./playback-runtime", () => ({
  applyMusicPlaybackIntent: vi.fn(async () => ({ audioPaused: true })),
  ensureMusicPlaybackRuntime: vi.fn(),
}));

vi.mock("./agent-play-query", () => ({
  findBestLocalTrack: vi.fn(() => null),
  playMusicByQuery: vi.fn(async () => ({ ok: false })),
}));

vi.mock("./resource/service", () => ({
  searchPlayableMusic: vi.fn(async () => ({ tracks: [], hasMore: false, providerErrors: [] })),
  listMusicProviders: vi.fn(() => [
    { id: "local", label: "本地" },
    { id: "txqq", label: "在线聚合" },
  ]),
}));

vi.mock("./resource/platform-registry", () => ({
  getMusicPlatformLabel: (id: string) => (id === "netease" ? "网易云" : id),
}));

vi.mock("./resource/provider-catalog", () => ({
  getMusicProviderCapabilities: (id: string) => {
    if (id === "local") {
      return {
        id: "local",
        label: "本地",
        searchMode: "local",
        resolveMode: "none",
        playablePolicy: "local",
        wiredForSearch: true,
      };
    }
    if (id === "txqq") {
      return {
        id: "txqq",
        label: "在线聚合",
        searchMode: "aggregator",
        resolveMode: "inline",
        playablePolicy: "search-inline",
        wiredForSearch: true,
        isAggregator: true,
      };
    }
    return null;
  },
}));

import {
  getAppPrefsTool,
  getTrackDetailTool,
  listLibraryTool,
  listProvidersTool,
  listQueueTool,
  queueOpsTool,
  setPlayModeTool,
  setSearchProvidersTool,
  trackOpsTool,
} from "./agent-tools";
import { searchPlayableMusic } from "./resource/service";
import { playMusicByQuery } from "./agent-play-query";

const defaultTracks: MockTrack[] = [
  {
    id: "t1",
    title: "晴天",
    artist: "周杰伦",
    album: "专辑",
    sourceUri: "/tmp/t1.mp3",
    sourceKind: "local",
    pinned: true,
    updatedAt: 1,
  },
  {
    id: "t2",
    title: "春日",
    artist: "某某",
    album: "专辑",
    sourceUri: "/tmp/t2.mp3",
    sourceKind: "local",
    updatedAt: 1,
  },
  {
    id: "t3",
    title: "夜曲",
    artist: "周杰伦",
    album: "专辑",
    sourceUri: "https://x/a.mp3",
    sourceKind: "cloud",
    lyrics: "[00:01.00]夜曲",
    lyricsUri: null,
    coverUri: "https://x/cover.jpg",
    remoteRef: {
      providerId: "netease",
      remoteId: "123",
      pageUrl: "https://music.163.com/song?id=123",
    },
    atmospherePalette: {
      dark: { primary: "#112233", secondary: "#445566" },
      light: { primary: "#CCDDEE", secondary: "#AABBCC" },
      coverKey: "https://x/cover.jpg",
      extractVersion: 3,
    },
    updatedAt: 1,
  },
];

describe("music agent tools P0", () => {
  beforeEach(() => {
    resetState(defaultTracks);
  });

  it("lists library with query and pinnedOnly", () => {
    const all = listLibraryTool({ limit: 10 });
    expect(all.ok).toBe(true);
    expect(all.total).toBe(3);
    expect((all.tracks as Array<{ id: string }>).map((row) => row.id)).toEqual(["t1", "t2", "t3"]);

    const q = listLibraryTool({ query: "周杰伦" });
    expect(q.total).toBe(2);

    const pinned = listLibraryTool({ pinnedOnly: true });
    expect(pinned.total).toBe(1);
    expect((pinned.tracks as Array<{ id: string }>)[0]?.id).toBe("t1");
  });

  it("lists queue with now-playing marker", () => {
    const queue = listQueueTool({});
    expect(queue.ok).toBe(true);
    expect(queue.total).toBe(2);
    expect(queue.nowPlayingId).toBe("t1");
    const rows = queue.tracks as Array<{ id: string; isNowPlaying: boolean }>;
    expect(rows.map((row) => row.id)).toEqual(["t1", "t2"]);
    expect(rows[0]?.isNowPlaying).toBe(true);
  });

  it("sets play mode", () => {
    expect(setPlayModeTool({ mode: "shuffle" })).toMatchObject({
      ok: true,
      playMode: "shuffle",
    });
    expect(storeApi.playMode).toBe("shuffle");
    expect(setPlayModeTool({ mode: "nope" }).ok).toBe(false);
  });

  it("mutates queue add/remove/clear", () => {
    expect(queueOpsTool({ action: "add", trackId: "t3", position: "end" }).ok).toBe(true);
    expect(storeApi.queueIds).toEqual(["t1", "t2", "t3"]);

    expect(queueOpsTool({ action: "remove", trackId: "t2" }).ok).toBe(true);
    expect(storeApi.queueIds).toEqual(["t1", "t3"]);

    expect(queueOpsTool({ action: "clear" }).ok).toBe(true);
    expect(storeApi.queueIds).toEqual([]);
  });

  it("pins/unpins and requires confirm for delete", () => {
    expect(trackOpsTool({ action: "unpin", trackId: "t1" })).toMatchObject({
      ok: true,
      pinned: false,
      changed: true,
    });
    expect(storeApi.getTrack("t1")?.pinned).toBe(false);

    expect(trackOpsTool({ action: "pin", trackId: "t1" })).toMatchObject({
      ok: true,
      pinned: true,
      changed: true,
    });

    expect(trackOpsTool({ action: "delete", trackId: "t2" })).toMatchObject({
      ok: false,
      error: "confirm_required",
    });
    expect(storeApi.getTrack("t2")).toBeTruthy();

    expect(trackOpsTool({ action: "delete", trackId: "t2", confirm: true }).ok).toBe(true);
    expect(storeApi.getTrack("t2")).toBeUndefined();
  });
});

describe("music agent tools P1", () => {
  beforeEach(() => {
    resetState(defaultTracks);
  });

  it("reads track detail fields aligned with ⌥D", () => {
    const detail = getTrackDetailTool({ trackId: "t3" });
    expect(detail).toMatchObject({
      ok: true,
      trackId: "t3",
      title: "夜曲",
      platform: "网易云",
      source: "在线云播",
      pageUrl: "https://music.163.com/song?id=123",
      hasLyrics: true,
      coverUri: "https://x/cover.jpg",
    });
    expect((detail.atmospherePalette as { dark: { primary: string } }).dark.primary).toBe(
      "#112233",
    );
    expect(getTrackDetailTool({ trackId: "missing" }).ok).toBe(false);
  });

  it("reads app prefs including Cmd+I fields", () => {
    lyricsDensity = "relaxed";
    playMode = "loop-one";
    const prefs = getAppPrefsTool();
    expect(prefs).toMatchObject({
      ok: true,
      lyricsDensity: "relaxed",
      playMode: "loop-one",
      atmospherePushEnabled: true,
      coverBackdropEnabled: true,
      coverBackdropBlur: 10,
      coverBackdropOpacity: 0.55,
      coverBackdropIncludeTabBar: false,
      searchCacheTtlMinutes: 15,
      libraryCount: 3,
    });
    expect(prefs.searchProviderIds).toEqual(["local", "netease", "qq"]);
  });
});

describe("music agent tools P2", () => {
  beforeEach(() => {
    resetState(defaultTracks);
    vi.mocked(searchPlayableMusic).mockClear();
    vi.mocked(playMusicByQuery).mockClear();
  });

  it("lists providers with trait tags", () => {
    const result = listProvidersTool();
    expect(result.ok).toBe(true);
    expect(result.total).toBe(2);
    const providers = result.providers as Array<{ id: string; traits: string[] }>;
    const local = providers.find((p) => p.id === "local");
    const txqq = providers.find((p) => p.id === "txqq");
    expect(local?.traits).toEqual(
      expect.arrayContaining(["search:local", "playable:local", "wired-for-search"]),
    );
    expect(txqq?.traits).toEqual(expect.arrayContaining(["aggregator", "search:aggregator"]));
  });

  it("sets search providers", () => {
    expect(setSearchProvidersTool({ providerIds: ["local", "qq"] })).toMatchObject({
      ok: true,
      searchProviderIds: ["local", "qq"],
    });
    expect(storeApi.searchProviderIds).toEqual(["local", "qq"]);
    expect(setSearchProvidersTool({}).ok).toBe(false);
  });
});
