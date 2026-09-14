// 场景：Agent play_query 本地/在线选曲评分与优先级（不加载完整 music store）。
import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  sourceUri: string;
  sourceKind: "local" | "cloud";
}

const defaultTracks: MockTrack[] = [
  {
    id: "t1",
    title: "晴天",
    artist: "周杰伦",
    album: "",
    sourceUri: "/tmp/t1.mp3",
    sourceKind: "local",
  },
  {
    id: "t2",
    title: "春日",
    artist: "某某",
    album: "",
    sourceUri: "/tmp/t2.mp3",
    sourceKind: "local",
  },
  {
    id: "t3",
    title: "春日漫游",
    artist: "A",
    album: "",
    sourceUri: "/tmp/t3.mp3",
    sourceKind: "local",
  },
];

const tracks: MockTrack[] = [];

function resetTracks(next: MockTrack[] = defaultTracks): void {
  tracks.splice(0, tracks.length, ...next.map((track) => ({ ...track })));
}

const storeState = {
  tracks,
  searchProviderIds: ["local", "netease", "qq"],
  getTrack: (id: string) => tracks.find((t) => t.id === id) ?? null,
  setNowPlaying: vi.fn(),
  upsertTrackFromSearchHit: vi.fn(
    (hit: {
      title: string;
      artist: string;
      ref: { providerId: string; remoteId: string };
      playableUrl?: string | null;
    }) => {
      const id = `online-${hit.ref.remoteId}`;
      const track: MockTrack = {
        id,
        title: hit.title,
        artist: hit.artist,
        album: "",
        sourceUri: hit.playableUrl || `/tmp/${id}.mp3`,
        sourceKind: "cloud",
      };
      tracks.push(track);
      return track;
    },
  ),
};

vi.mock("./store", () => ({
  useMusicDemoStore: {
    getState: () => storeState,
  },
  listTracksAsWorkspaceItems: (query: string) => {
    const q = query.trim().toLowerCase();
    return tracks
      .filter((t) => {
        const hay = `${t.title} ${t.artist} ${t.album}`.toLowerCase();
        return (
          !q ||
          hay.includes(q) ||
          q.split(/[\s,，、/+]+/).some((tok) => tok.length >= 2 && hay.includes(tok))
        );
      })
      .map((t) => ({ id: t.id, title: t.title }));
  },
  isMusicTrackDownloadedLocally: (track: { sourceUri?: string }) =>
    Boolean(track.sourceUri && !track.sourceUri.startsWith("http")),
}));

vi.mock("./playback-runtime", () => ({
  applyMusicPlaybackIntent: vi.fn(async () => ({ audioPaused: false })),
  ensureMusicPlaybackRuntime: vi.fn(),
  loadAndPlayTrackUriHeadless: vi.fn(async () => true),
}));

vi.mock("./resource/download-bundle", () => ({
  downloadAndPersistTrackBundle: vi.fn(async () => undefined),
}));

vi.mock("./resource/service", () => ({
  searchPlayableMusic: vi.fn(async () => ({
    tracks: [],
    hasMore: false,
    providerErrors: [],
  })),
}));

import { findBestLocalTrack, pickBestOnlineHit, playMusicByQuery } from "./agent-play-query";
import type { SearchHitTrack } from "./resource/types";
import { searchPlayableMusic } from "./resource/service";
import { downloadAndPersistTrackBundle } from "./resource/download-bundle";
import { loadAndPlayTrackUriHeadless } from "./playback-runtime";

beforeEach(() => {
  vi.clearAllMocks();
  resetTracks();
});

describe("findBestLocalTrack", () => {
  it("prefers title match for 春日 query", () => {
    const hit = findBestLocalTrack("春日");
    expect(hit?.id).toBe("t2");
  });

  it("matches token in title for 春日相关", () => {
    resetTracks([
      {
        id: "t3",
        title: "春日漫游",
        artist: "A",
        album: "",
        sourceUri: "/tmp/t3.mp3",
        sourceKind: "local",
      },
      {
        id: "t4",
        title: "冬天",
        artist: "B",
        album: "",
        sourceUri: "/tmp/t4.mp3",
        sourceKind: "local",
      },
    ]);
    const hit = findBestLocalTrack("春日相关");
    expect(hit?.id).toBe("t3");
  });

  it("does not false-match local on weak English stopwords", () => {
    resetTracks([
      {
        id: "mj",
        title: "You Rock My World",
        artist: "Michael Jackson",
        album: "",
        sourceUri: "/tmp/mj.mp3",
        sourceKind: "local",
      },
      {
        id: "local-other",
        title: "晴天",
        artist: "周杰伦",
        album: "",
        sourceUri: "/tmp/other.mp3",
        sourceKind: "local",
      },
    ]);
    expect(findBestLocalTrack("Never Gonna Give You Up")).toBeNull();
  });
});

describe("pickBestOnlineHit", () => {
  it("prefers localTrackId then playable title match", () => {
    const hits: SearchHitTrack[] = [
      {
        kind: "track",
        ref: { providerId: "qq", remoteId: "1" },
        title: "春日",
        artist: "X",
        playableUrl: "https://example.com/a.mp3",
      },
      {
        kind: "track",
        ref: { providerId: "local", remoteId: "t9" },
        title: "春日别处",
        artist: "Y",
        localTrackId: "t9",
      },
    ];
    const best = pickBestOnlineHit(hits, "春日");
    expect(best?.localTrackId).toBe("t9");
  });
});

describe("playMusicByQuery", () => {
  it("plays local match without online search", async () => {
    const result = await playMusicByQuery({
      host: {} as never,
      query: "春日",
    });
    expect(result.ok).toBe(true);
    expect(result.source).toBe("local");
    expect(result.trackId).toBe("t2");
    expect(searchPlayableMusic).not.toHaveBeenCalled();
    expect(loadAndPlayTrackUriHeadless).toHaveBeenCalled();
  });

  it("searches online and plays when local misses", async () => {
    resetTracks([
      {
        id: "local-other",
        title: "晴天",
        artist: "周杰伦",
        album: "",
        sourceUri: "/tmp/other.mp3",
        sourceKind: "local",
      },
    ]);
    vi.mocked(searchPlayableMusic).mockResolvedValueOnce({
      tracks: [
        {
          kind: "track",
          ref: { providerId: "qq", remoteId: "online-1" },
          title: "春日野",
          artist: "在线艺人",
          playableUrl: "https://example.com/spring.mp3",
        },
      ],
      hasMore: false,
      providerErrors: [],
    } as never);

    const result = await playMusicByQuery({
      host: {} as never,
      query: "春日野",
      download: true,
    });
    expect(result.ok).toBe(true);
    expect(result.source).toBe("online");
    expect(searchPlayableMusic).toHaveBeenCalled();
    expect(vi.mocked(searchPlayableMusic).mock.calls[0]?.[0]).toMatchObject({
      text: "春日野",
      providerIds: ["local", "netease", "qq"],
    });
    expect(downloadAndPersistTrackBundle).toHaveBeenCalled();
    expect(loadAndPlayTrackUriHeadless).toHaveBeenCalled();
  });

  it("passes explicit providerIds to online search", async () => {
    resetTracks([]);
    vi.mocked(searchPlayableMusic).mockResolvedValueOnce({
      tracks: [
        {
          kind: "track",
          ref: { providerId: "qq", remoteId: "online-2" },
          title: "稻香",
          artist: "周杰伦",
          playableUrl: "https://example.com/daoxiang.mp3",
        },
      ],
      hasMore: false,
      providerErrors: [],
    } as never);

    await playMusicByQuery({
      host: {} as never,
      query: "稻香",
      providerIds: ["qq"],
      download: false,
    });
    expect(vi.mocked(searchPlayableMusic).mock.calls[0]?.[0]).toMatchObject({
      providerIds: ["qq"],
    });
  });

  it("falls through to online when local only has weak English overlap", async () => {
    resetTracks([
      {
        id: "mj",
        title: "You Rock My World",
        artist: "Michael Jackson",
        album: "",
        sourceUri: "/tmp/mj.mp3",
        sourceKind: "local",
      },
    ]);
    vi.mocked(searchPlayableMusic).mockResolvedValueOnce({
      tracks: [
        {
          kind: "track",
          ref: { providerId: "qq", remoteId: "rick-1" },
          title: "Never Gonna Give You Up",
          artist: "Rick Astley",
          playableUrl: "https://example.com/rick.mp3",
        },
      ],
      hasMore: false,
      providerErrors: [],
    } as never);

    const result = await playMusicByQuery({
      host: {} as never,
      query: "Never Gonna Give You Up",
      download: true,
    });

    expect(result.ok).toBe(true);
    expect(result.source).toBe("online");
    expect(result.title).toBe("Never Gonna Give You Up");
    expect(searchPlayableMusic).toHaveBeenCalled();
  });

  it("returns local_not_found when preferLocalOnly and no match", async () => {
    const result = await playMusicByQuery({
      host: {} as never,
      query: "完全不存在的歌名xyz",
      preferLocalOnly: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("local_not_found");
    expect(searchPlayableMusic).not.toHaveBeenCalled();
  });
});
