// 场景：同曲后台续播判定 — Tab 重挂载不得误判为需要 hard-load。
import { afterEach, describe, expect, it } from "vitest";
import {
  isCrossOriginHttpMusicSrc,
  isMusicAutoplayBlockedError,
  isMusicPlaybackLiveOnTrack,
  isMusicPlayInterruptedError,
  readMusicPlaybackDurationSec,
  safeMusicPlay,
  setMusicPlaybackBackgroundActive,
  setMusicPlaybackLoadedMeta,
  whenMusicPlaybackMetadataReady,
} from "./playback-engine";

function mockAudio(input: { src: string; paused: boolean }): HTMLAudioElement {
  return {
    src: input.src,
    paused: input.paused,
  } as HTMLAudioElement;
}

describe("isMusicPlaybackLiveOnTrack", () => {
  afterEach(() => {
    setMusicPlaybackLoadedMeta(null);
    setMusicPlaybackBackgroundActive(false);
  });

  it("returns true when global loaded meta matches even if component refs are empty", () => {
    setMusicPlaybackLoadedMeta({ trackId: "t1", sourceUri: "file://local/a.mp3" });

    expect(
      isMusicPlaybackLiveOnTrack({
        trackId: "t1",
        sourceUri: "file://local/a.mp3",
        nowPlayingId: "t1",
        audio: mockAudio({ src: "https://example.com/a.mp3", paused: false }),
        loadedTrackId: null,
        loadedSourceUri: null,
      }),
    ).toBe(true);
  });

  it("returns false when track switched", () => {
    setMusicPlaybackLoadedMeta({ trackId: "t1", sourceUri: "file://local/a.mp3" });

    expect(
      isMusicPlaybackLiveOnTrack({
        trackId: "t2",
        sourceUri: "file://local/b.mp3",
        nowPlayingId: "t2",
        audio: mockAudio({ src: "https://example.com/a.mp3", paused: false }),
        loadedTrackId: null,
        loadedSourceUri: null,
      }),
    ).toBe(false);
  });

  it("returns true on cold remount when meta missing but audio still playing nowPlaying", () => {
    expect(
      isMusicPlaybackLiveOnTrack({
        trackId: "t1",
        sourceUri: "file://local/a.mp3",
        nowPlayingId: "t1",
        audio: mockAudio({ src: "blob:http://localhost/x", paused: false }),
        loadedTrackId: null,
        loadedSourceUri: null,
      }),
    ).toBe(true);
  });

  it("returns false on track switch when loaded ref still points at previous track", () => {
    expect(
      isMusicPlaybackLiveOnTrack({
        trackId: "t2",
        sourceUri: "file://local/b.mp3",
        nowPlayingId: "t2",
        audio: mockAudio({ src: "blob:http://localhost/a", paused: false }),
        loadedTrackId: "t1",
        loadedSourceUri: "file://local/a.mp3",
      }),
    ).toBe(false);
  });
});

describe("isMusicPlayInterruptedError", () => {
  it("detects Chrome play/pause abort", () => {
    const abort = new Error("The play() request was interrupted by a call to pause().");
    abort.name = "AbortError";
    expect(isMusicPlayInterruptedError(abort)).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMusicPlayInterruptedError(new Error("no supported source"))).toBe(false);
  });
});

describe("isMusicAutoplayBlockedError", () => {
  it("detects NotAllowedError", () => {
    const err = new Error(
      "play() failed because the user didn't interact with the document first.",
    );
    err.name = "NotAllowedError";
    expect(isMusicAutoplayBlockedError(err)).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMusicAutoplayBlockedError(new Error("no supported source"))).toBe(false);
  });
});

describe("safeMusicPlay", () => {
  it("returns false on NotAllowedError instead of throwing", async () => {
    const audio = {
      paused: true,
      play: async () => {
        const err = new Error("NotAllowedError");
        err.name = "NotAllowedError";
        throw err;
      },
    } as HTMLAudioElement;
    await expect(safeMusicPlay(audio)).resolves.toBe(false);
  });
});

describe("readMusicPlaybackDurationSec / whenMusicPlaybackMetadataReady", () => {
  it("returns 0 for NaN duration", () => {
    expect(readMusicPlaybackDurationSec({ duration: Number.NaN } as HTMLAudioElement)).toBe(0);
  });

  it("returns finite positive duration", () => {
    expect(readMusicPlaybackDurationSec({ duration: 201.4 } as HTMLAudioElement)).toBe(201.4);
  });

  it("resolves immediately when duration already ready", async () => {
    await expect(
      whenMusicPlaybackMetadataReady({
        duration: 90,
        readyState: 1,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      } as unknown as HTMLAudioElement),
    ).resolves.toBe(90);
  });
});

describe("isCrossOriginHttpMusicSrc", () => {
  it("flags daemon http media and ignores blob/local paths", () => {
    expect(isCrossOriginHttpMusicSrc("http://127.0.0.1:6767/api/files/media?token=x")).toBe(true);
    expect(isCrossOriginHttpMusicSrc("blob:http://localhost:8083/abc")).toBe(false);
    expect(isCrossOriginHttpMusicSrc("/Users/me/.agnx/apps/data/a.mp3")).toBe(false);
  });
});
