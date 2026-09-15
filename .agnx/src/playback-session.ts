// 场景：Music 播放会话整块快照 — localStorage 同步落盘，硬刷新不丢进度/意图。
/** 与 AsyncStorage 大文档解耦：仅 nowPlaying + wantsPlaying + position，pagehide 可同步写完。 */

export const MUSIC_PLAYBACK_SESSION_STORAGE_KEY = "agnx.music.playback-session.v1";

/** 调试热更可见戳：remount 后可在控制台看 `__agnxMusicPlaybackSessionBuild`。 */
export const MUSIC_PLAYBACK_SESSION_BUILD = "session-noclobber-v2";

export interface MusicPlaybackSessionSnapshot {
  nowPlayingId: string | null;
  wantsPlaying: boolean;
  playbackPositionSec: number;
  updatedAt: number;
}

export function normalizeMusicPlaybackSessionSnapshot(
  raw: unknown,
): MusicPlaybackSessionSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const doc = raw as Record<string, unknown>;
  const nowPlayingId =
    typeof doc.nowPlayingId === "string" && doc.nowPlayingId.trim().length > 0
      ? doc.nowPlayingId.trim()
      : doc.nowPlayingId === null
        ? null
        : null;
  if (doc.nowPlayingId != null && typeof doc.nowPlayingId !== "string") {
    return null;
  }
  const positionRaw = doc.playbackPositionSec;
  const playbackPositionSec =
    typeof positionRaw === "number" && Number.isFinite(positionRaw) && positionRaw >= 0
      ? Math.floor(positionRaw)
      : 0;
  const updatedRaw = doc.updatedAt;
  const updatedAt =
    typeof updatedRaw === "number" && Number.isFinite(updatedRaw) && updatedRaw > 0
      ? Math.floor(updatedRaw)
      : 0;
  if (!updatedAt) {
    return null;
  }
  return {
    nowPlayingId,
    wantsPlaying: Boolean(doc.wantsPlaying),
    playbackPositionSec,
    updatedAt,
  };
}

export function buildMusicPlaybackSessionSnapshot(input: {
  nowPlayingId: string | null;
  wantsPlaying: boolean;
  playbackPositionSec: number;
  audioCurrentTimeSec?: number;
  updatedAt?: number;
}): MusicPlaybackSessionSnapshot {
  const live =
    typeof input.audioCurrentTimeSec === "number" && Number.isFinite(input.audioCurrentTimeSec)
      ? Math.max(0, Math.floor(input.audioCurrentTimeSec))
      : 0;
  const storeSec =
    typeof input.playbackPositionSec === "number" && Number.isFinite(input.playbackPositionSec)
      ? Math.max(0, Math.floor(input.playbackPositionSec))
      : 0;
  return {
    nowPlayingId: input.nowPlayingId?.trim() ? input.nowPlayingId.trim() : null,
    wantsPlaying: Boolean(input.wantsPlaying),
    playbackPositionSec: Math.max(storeSec, live),
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

/** 同步写入 localStorage；硬刷新/pagehide 必须走这条，不能只靠 AsyncStorage。 */
export function writeMusicPlaybackSessionSnapshotSync(
  snapshot: MusicPlaybackSessionSnapshot,
): boolean {
  if (typeof localStorage === "undefined") {
    return false;
  }
  try {
    localStorage.setItem(MUSIC_PLAYBACK_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function readMusicPlaybackSessionSnapshotSync(): MusicPlaybackSessionSnapshot | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(MUSIC_PLAYBACK_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeMusicPlaybackSessionSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * 水合后合并：同曲时取较大进度；意图以快照为准（pagehide/节流刚写过的真值）。
 * 不同曲不改 nowPlaying（曲目权威仍在 AsyncStorage）。
 * 快照进度为 0 且 store 更大时保留 store 进度（防止被脏 0 快照冲掉）。
 */
export function resolveMusicPlaybackSessionMerge(input: {
  storeNowPlayingId: string | null;
  storeWantsPlaying: boolean;
  storePlaybackPositionSec: number;
  snapshot: MusicPlaybackSessionSnapshot | null;
}): {
  apply: boolean;
  playbackPositionSec: number;
  wantsPlaying: boolean;
} {
  const snap = input.snapshot;
  if (!snap?.nowPlayingId) {
    return {
      apply: false,
      playbackPositionSec: input.storePlaybackPositionSec,
      wantsPlaying: input.storeWantsPlaying,
    };
  }
  if (input.storeNowPlayingId && input.storeNowPlayingId !== snap.nowPlayingId) {
    return {
      apply: false,
      playbackPositionSec: input.storePlaybackPositionSec,
      wantsPlaying: input.storeWantsPlaying,
    };
  }
  const storeSec =
    typeof input.storePlaybackPositionSec === "number" &&
    Number.isFinite(input.storePlaybackPositionSec)
      ? Math.max(0, Math.floor(input.storePlaybackPositionSec))
      : 0;
  return {
    apply: true,
    playbackPositionSec: Math.max(storeSec, snap.playbackPositionSec),
    wantsPlaying: snap.wantsPlaying,
  };
}

/**
 * 写盘前决议：无曲目则跳过（禁止用 null/0 冲掉已有会话）；
 * 同曲进度不降级；remount 瞬间 store/audio 都是 0 时保留原 wantsPlaying。
 */
export function resolveMusicPlaybackSessionWrite(input: {
  nowPlayingId: string | null;
  wantsPlaying: boolean;
  playbackPositionSec: number;
  livePlaying?: boolean;
  existing: MusicPlaybackSessionSnapshot | null;
  updatedAt?: number;
}): MusicPlaybackSessionSnapshot | null {
  const id = input.nowPlayingId?.trim() ? input.nowPlayingId.trim() : null;
  if (!id) {
    return null;
  }
  const existing = input.existing;
  const sameTrack = Boolean(existing?.nowPlayingId && existing.nowPlayingId === id);
  const incomingSec =
    typeof input.playbackPositionSec === "number" && Number.isFinite(input.playbackPositionSec)
      ? Math.max(0, Math.floor(input.playbackPositionSec))
      : 0;
  let playbackPositionSec = incomingSec;
  if (sameTrack && existing && existing.playbackPositionSec > playbackPositionSec) {
    playbackPositionSec = existing.playbackPositionSec;
  }
  const livePlaying = Boolean(input.livePlaying);
  let wantsPlaying = Boolean(input.wantsPlaying) || livePlaying;
  if (sameTrack && existing?.wantsPlaying && !livePlaying && incomingSec === 0) {
    wantsPlaying = true;
  }
  return buildMusicPlaybackSessionSnapshot({
    nowPlayingId: id,
    wantsPlaying,
    playbackPositionSec,
    updatedAt: input.updatedAt,
  });
}
