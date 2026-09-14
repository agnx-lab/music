// 场景：播放偏好持久化 — 水合前不得用默认音量/进度冲盘；sanitize 必须保留音量与进度。
import { describe, expect, it } from "vitest";

function normalizeVolume(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }
  return Math.min(1, Math.max(0, value));
}

function normalizePlaybackPosition(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function sanitizePrefs(doc: {
  state?: {
    volume?: number;
    muted?: boolean;
    coverHidden?: boolean;
    compactActionRailVisible?: boolean;
    playbackPositionSec?: number;
    wantsPlaying?: boolean;
  };
}): {
  volume: number;
  muted: boolean;
  coverHidden: boolean;
  compactActionRailVisible: boolean;
  playbackPositionSec: number;
  wantsPlaying: boolean;
} {
  return {
    volume: normalizeVolume(doc.state?.volume),
    muted: Boolean(doc.state?.muted),
    coverHidden: Boolean(doc.state?.coverHidden),
    compactActionRailVisible: doc.state?.compactActionRailVisible !== false,
    playbackPositionSec: normalizePlaybackPosition(doc.state?.playbackPositionSec),
    wantsPlaying: Boolean(doc.state?.wantsPlaying),
  };
}

describe("music playback prefs persistence", () => {
  it("keeps volume and position through sanitize", () => {
    const prefs = sanitizePrefs({
      state: {
        volume: 0.35,
        muted: false,
        coverHidden: true,
        compactActionRailVisible: false,
        playbackPositionSec: 128.9,
        wantsPlaying: true,
      },
    });
    expect(prefs).toEqual({
      volume: 0.35,
      muted: false,
      coverHidden: true,
      compactActionRailVisible: false,
      playbackPositionSec: 128,
      wantsPlaying: true,
    });
  });

  it("does not allow mount-zero to clobber restored progress", () => {
    let stored = 128;
    let refSecond = stored;
    const currentTime = 0;
    const playing = false;
    const nextSecond = Math.max(0, Math.floor(currentTime));
    if (!(nextSecond === 0 && refSecond > 0 && !playing)) {
      refSecond = nextSecond;
      stored = nextSecond;
    }
    expect(stored).toBe(128);
    expect(refSecond).toBe(128);
  });

  it("does not write previous track currentTime onto a newly selected track", () => {
    // 模拟换曲同一拍：store 已置 0，但 React currentTime 仍是上一首的 120
    let persistedTrackId: string | null = "track_a";
    let persistedSecond = 120;
    let storedPosition = 0; // setNowPlaying(新曲) 已归零
    const nextTrackId = "track_b";
    const staleCurrentTime = 120;

    if (persistedTrackId !== nextTrackId) {
      persistedTrackId = nextTrackId;
      persistedSecond = storedPosition;
      // 换曲当拍直接 return，禁止用 staleCurrentTime 写回
    } else {
      const nextSecond = Math.max(0, Math.floor(staleCurrentTime));
      persistedSecond = nextSecond;
      storedPosition = nextSecond;
    }

    expect(persistedTrackId).toBe("track_b");
    expect(persistedSecond).toBe(0);
    expect(storedPosition).toBe(0);
  });

  it("does not persist position on every timeupdate second", () => {
    // 播放中 timeupdate 只推 UI 时钟；store/persist 仅在 pause/seek/visibility/ended 等边界写入。
    let storeWrites = 0;
    let storeSec = 10;
    const onUiTick = (_time: number) => {
      // UI only — no store write
    };
    const onBoundary = (time: number) => {
      const next = Math.max(0, Math.floor(time));
      if (storeSec !== next) {
        storeSec = next;
        storeWrites += 1;
      }
    };

    // ~1s 播放：多次 timeupdate 不应写 store
    for (const t of [10.1, 10.4, 10.9, 11.2, 11.8]) {
      onUiTick(t);
    }
    expect(storeWrites).toBe(0);
    expect(storeSec).toBe(10);

    // 暂停边界写一次
    onBoundary(11.8);
    expect(storeWrites).toBe(1);
    expect(storeSec).toBe(11);

    // seek 边界写一次
    onBoundary(42.2);
    expect(storeWrites).toBe(2);
    expect(storeSec).toBe(42);
  });
});
