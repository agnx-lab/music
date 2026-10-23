// 场景：曲目菜单唯一执行入口 — 侧栏与播放器必须同语义（详情不开播）。
import { describe, expect, it, vi, beforeEach } from "vitest";

const togglePinned = vi.fn();
const addToQueue = vi.fn();
const getTrack = vi.fn();

vi.mock("./store", () => ({
  useMusicDemoStore: {
    getState: () => ({
      getTrack,
      togglePinned,
      addToQueue,
      nowPlayingId: null as string | null,
    }),
  },
}));

const openMusicTrackDetailSheet = vi.fn(async () => undefined);
vi.mock("./track-detail", () => ({
  openMusicTrackDetailSheet: (...args: unknown[]) => openMusicTrackDetailSheet(...args),
}));

vi.mock("./resource/track-files", () => ({
  deleteMusicTrackCompletely: vi.fn(),
  exportMusicTrackZip: vi.fn(),
}));

vi.mock("./resource/refresh-resources", () => ({
  refreshTrackResourcesAndMaybePersist: vi.fn(),
}));

vi.mock("./music-autoplay", () => ({
  requestTrackAutoPlay: vi.fn(),
}));

import { runMusicTrackMenuAction } from "./track-menu-run";

describe("runMusicTrackMenuAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTrack.mockReturnValue({
      id: "t1",
      title: "Song",
      pinned: false,
      remoteRef: { providerId: "netease", remoteId: "1" },
    });
  });

  it("详情 soft-alias 开公共壳，不依赖 nowPlaying", async () => {
    const hostApi = {
      ui: {
        openDetailSheet: vi.fn(),
        closeDetailSheet: vi.fn(),
        isDetailSheetOpen: vi.fn(() => false),
      },
    } as never;
    await runMusicTrackMenuAction({
      hostApi,
      action: "detail",
      trackId: "t1",
    });
    expect(openMusicTrackDetailSheet).toHaveBeenCalledWith(hostApi, "t1");
    expect(addToQueue).not.toHaveBeenCalled();
    expect(togglePinned).not.toHaveBeenCalled();
  });

  it("置顶 / 加入列表 / 下一首走同一 store 语义", async () => {
    const hostApi = {} as never;
    await runMusicTrackMenuAction({ hostApi, action: "pin", trackId: "t1" });
    expect(togglePinned).toHaveBeenCalledWith("t1");
    await runMusicTrackMenuAction({ hostApi, action: "addPlaylist", trackId: "t1" });
    expect(addToQueue).toHaveBeenCalledWith("t1", "end");
    await runMusicTrackMenuAction({ hostApi, action: "playNext", trackId: "t1" });
    expect(addToQueue).toHaveBeenCalledWith("t1", "next");
  });
});
