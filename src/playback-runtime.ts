// 场景：音乐单例 Audio 的 ended/timeupdate 常驻监听 — 进设置/切 Tab 卸载 UI 后仍能续播与切歌。
import {
  applyMusicPlaybackVolume,
  getMusicPlaybackAudio,
  safeMusicPlay,
  setMusicPlaybackBackgroundActive,
  setMusicPlaybackLoadedMeta,
  setMusicPlaybackSrc,
} from "./playback-engine";
import { publishMusicPlaybackFocusClaim } from "./playback-leader";
import { requestTrackAutoPlay } from "./music-autoplay";
import { getMusicHostApi } from "./music-host";
import { shouldRestoreMusicPlaybackAfterColdStart } from "./playback-cold-restore";
import {
  MUSIC_PLAYBACK_SESSION_BUILD,
  readMusicPlaybackSessionSnapshotSync,
  resolveMusicPlaybackSessionMerge,
  resolveMusicPlaybackSessionWrite,
  writeMusicPlaybackSessionSnapshotSync,
} from "./playback-session";
import { getMusicBoundSync, useMusicDemoStore } from "./store";

export { shouldRestoreMusicPlaybackAfterColdStart } from "./playback-cold-restore";

function publishMusicPlaybackSessionBuildStamp(): void {
  const bag = globalThis as typeof globalThis & {
    __agnxMusicPlaybackSessionBuild?: string;
  };
  bag.__agnxMusicPlaybackSessionBuild = MUSIC_PLAYBACK_SESSION_BUILD;
}

export interface MusicPlaybackUiSink {
  onTimeUpdate?: (currentTime: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

const uiSinks = new Set<MusicPlaybackUiSink>();
let runtimeInstalled = false;
let runtimeAudio: HTMLAudioElement | null = null;

export function subscribeMusicPlaybackUi(sink: MusicPlaybackUiSink): () => void {
  ensureMusicPlaybackRuntime();
  uiSinks.add(sink);
  return () => {
    uiSinks.delete(sink);
  };
}

function notifyPlaying(playing: boolean): void {
  for (const sink of uiSinks) {
    sink.onPlayingChange?.(playing);
  }
}

function notifyTime(currentTime: number): void {
  for (const sink of uiSinks) {
    sink.onTimeUpdate?.(currentTime);
  }
}

/**
 * 把 audio 进度写回 store（会触发 zustand persist 全量序列化）。
 * 播放中的 timeupdate 禁止每拍走这里；仅 pause / seek / 切歌 / 隐藏窗口 / ended / 节流快照 等调用。
 * 同时同步写 localStorage 播放会话块，供硬刷新原子恢复。
 */
export function syncMusicPlaybackPositionToStore(force = false): void {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  const state = useMusicDemoStore.getState();
  if (!state.nowPlayingId) {
    return;
  }
  const second = Math.max(0, Math.floor(audio.currentTime || 0));
  if (!force && state.playbackPositionSec === second) {
    writeLiveMusicPlaybackSessionSnapshot(second);
    return;
  }
  state.setPlaybackPosition(second);
  writeLiveMusicPlaybackSessionSnapshot(second);
}

/** 边界/pagehide：整块会话写入同步 localStorage（不依赖 AsyncStorage 是否写完）。 */
export function flushMusicPlaybackSessionSnapshot(): void {
  const audio = getMusicPlaybackAudio();
  const state = useMusicDemoStore.getState();
  const liveSec =
    audio && Number.isFinite(audio.currentTime) ? Math.max(0, Math.floor(audio.currentTime)) : 0;
  const livePlaying = Boolean(audio && audio.src && !audio.paused);
  // 刷新瞬间 store.wantsPlaying 可能滞后；以真实出声为准，避免会话块写成「暂停+进度」。
  if (livePlaying && !state.wantsPlaying) {
    state.setWantsPlaying(true);
  }
  if (state.nowPlayingId && liveSec > state.playbackPositionSec) {
    state.setPlaybackPosition(liveSec);
  }
  const latest = useMusicDemoStore.getState();
  // remount/水合瞬间 nowPlaying 可能短暂为空：禁止用空快照冲掉已有会话。
  const next = resolveMusicPlaybackSessionWrite({
    nowPlayingId: latest.nowPlayingId,
    wantsPlaying: latest.wantsPlaying || livePlaying,
    playbackPositionSec: Math.max(latest.playbackPositionSec, liveSec),
    livePlaying,
    existing: readMusicPlaybackSessionSnapshotSync(),
  });
  if (!next) {
    return;
  }
  writeMusicPlaybackSessionSnapshotSync(next);
}

function writeLiveMusicPlaybackSessionSnapshot(positionSec: number): void {
  const state = useMusicDemoStore.getState();
  const audio = getMusicPlaybackAudio();
  const livePlaying = Boolean(audio && audio.src && !audio.paused);
  const next = resolveMusicPlaybackSessionWrite({
    nowPlayingId: state.nowPlayingId,
    wantsPlaying: state.wantsPlaying || livePlaying,
    playbackPositionSec: Math.max(0, Math.floor(positionSec)),
    livePlaying,
    existing: readMusicPlaybackSessionSnapshotSync(),
  });
  if (!next) {
    return;
  }
  writeMusicPlaybackSessionSnapshotSync(next);
}

/** 水合后把同步会话块合并进 store（进度取大；意图以快照为准）。 */
export function applyMusicPlaybackSessionSnapshotAfterHydrate(): boolean {
  const state = useMusicDemoStore.getState();
  const merged = resolveMusicPlaybackSessionMerge({
    storeNowPlayingId: state.nowPlayingId,
    storeWantsPlaying: state.wantsPlaying,
    storePlaybackPositionSec: state.playbackPositionSec,
    snapshot: readMusicPlaybackSessionSnapshotSync(),
  });
  if (!merged.apply) {
    return false;
  }
  if (
    merged.playbackPositionSec === state.playbackPositionSec &&
    merged.wantsPlaying === state.wantsPlaying
  ) {
    return false;
  }
  if (merged.playbackPositionSec !== state.playbackPositionSec) {
    state.setPlaybackPosition(merged.playbackPositionSec);
  }
  if (merged.wantsPlaying !== state.wantsPlaying) {
    state.setWantsPlaying(merged.wantsPlaying);
  }
  return true;
}

function installPlaybackPositionLifecycleFlush(): void {
  if (typeof document === "undefined") {
    return;
  }
  const bag = globalThis as typeof globalThis & {
    __agnxMusicPositionLifecycleInstalled?: boolean;
  };
  if (bag.__agnxMusicPositionLifecycleInstalled) {
    return;
  }
  bag.__agnxMusicPositionLifecycleInstalled = true;
  const flush = () => {
    flushMusicPlaybackSessionSnapshot();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flush();
    }
  });
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
}

let wantsPlayingBridgeInstalled = false;
let lastBridgedWantsPlaying: boolean | null = null;

/**
 * 将 store.wantsPlaying 落到真实 Audio 单例。
 * Agent 工具 / 侧栏 / 无 UI 场景只改 store 时必须走这里，否则会出现「状态已暂停、声音还在播」。
 */
export async function applyMusicPlaybackIntent(wantsPlaying: boolean): Promise<{
  wantsPlaying: boolean;
  audioPaused: boolean | null;
  applied: boolean;
}> {
  ensureMusicPlaybackRuntime();
  const next = Boolean(wantsPlaying);
  if (next) {
    await publishMusicPlaybackFocusClaim(getMusicBoundSync());
  }
  lastBridgedWantsPlaying = next;
  const store = useMusicDemoStore.getState();
  if (store.wantsPlaying !== next) {
    store.setWantsPlaying(next);
  }
  const applied = await syncWantsPlayingToAudio(next);
  // 意图变更也刷同步会话块（暂停/起播），与进度同块。
  flushMusicPlaybackSessionSnapshot();
  const audio = getMusicPlaybackAudio();
  return {
    wantsPlaying: useMusicDemoStore.getState().wantsPlaying,
    audioPaused: audio ? audio.paused : null,
    applied,
  };
}

async function syncWantsPlayingToAudio(wantsPlaying: boolean): Promise<boolean> {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return false;
  }
  if (!wantsPlaying) {
    try {
      if (!audio.paused) {
        audio.pause();
      }
    } catch {
      // ignore
    }
    // 暂停边界：立刻固化进度，避免播放中每秒 setState+persist。
    syncMusicPlaybackPositionToStore(true);
    notifyPlaying(false);
    setMusicPlaybackBackgroundActive(false);
    return true;
  }
  // 仅在已有可播 src 且当前暂停时尝试 play；换源仍交给 player / headless loader
  if (!audio.src || !audio.paused) {
    if (!audio.paused) {
      notifyPlaying(true);
      setMusicPlaybackBackgroundActive(true);
    }
    return Boolean(audio.src);
  }
  const ok = await safeMusicPlay(audio);
  notifyPlaying(ok);
  if (ok) {
    setMusicPlaybackBackgroundActive(true);
  } else if (useMusicDemoStore.getState().wantsPlaying) {
    // 自动播放策略：保留 wantsPlaying，只把 UI 拉回「未在出声」；手势再抢播。
    notifyPlaying(false);
    setMusicPlaybackBackgroundActive(true);
    installMusicAutoplayUnlockRetry();
  }
  return ok;
}

/** 非 leader 端收到远端 sync 后静音本地输出，不改动共享 wantsPlaying。 */
export function pauseLocalMusicAudioOutput(): void {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  try {
    if (!audio.paused) {
      audio.pause();
    }
  } catch {
    // ignore
  }
  syncMusicPlaybackPositionToStore(true);
  notifyPlaying(false);
  setMusicPlaybackBackgroundActive(false);
}

/** 远端客户端抢占音频焦点：静音本端输出，本端播放态仅写本地 AsyncStorage。 */
export function yieldMusicPlaybackToRemoteClient(): void {
  pauseLocalMusicAudioOutput();
  if (useMusicDemoStore.getState().wantsPlaying) {
    lastBridgedWantsPlaying = false;
    useMusicDemoStore.getState().setWantsPlaying(false);
  }
}

function ensureWantsPlayingBridge(): void {
  if (wantsPlayingBridgeInstalled) {
    return;
  }
  wantsPlayingBridgeInstalled = true;
  lastBridgedWantsPlaying = useMusicDemoStore.getState().wantsPlaying;
  useMusicDemoStore.subscribe((state) => {
    if (state.wantsPlaying === lastBridgedWantsPlaying) {
      return;
    }
    lastBridgedWantsPlaying = state.wantsPlaying;
    void syncWantsPlayingToAudio(state.wantsPlaying);
  });
}

async function resolveHeadlessPlayableUri(rawUri: string): Promise<string | null> {
  const trimmed = rawUri.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//.test(trimmed) || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const host = getMusicHostApi();
  if (!host?.files?.resolveObjectUrl) {
    // 无宿主解析能力时不要硬塞本地路径进 Audio（会把正在播的 src 弄坏，回来时长变 0）。
    return null;
  }
  try {
    return await host.files.resolveObjectUrl(trimmed);
  } catch {
    return null;
  }
}

/**
 * 无 UI 时换源续播：不要先 pause（打断 autoplay 链）。
 * 解析失败则保持当前 Audio 不动，只记 wantsPlaying，等播放器挂载再加载。
 */
export async function loadAndPlayTrackUriHeadless(input: {
  trackId: string;
  sourceUri: string;
  /** 冷启动恢复进度（秒）；在 loadedmetadata 后再 seek。 */
  seekSec?: number;
}): Promise<boolean> {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return false;
  }
  const uri = await resolveHeadlessPlayableUri(input.sourceUri);
  if (!uri) {
    useMusicDemoStore.getState().setWantsPlaying(true);
    return false;
  }
  try {
    // 无 UI 路径不会跑 player 的 volume effect，必须在 headless play 前套上 persist 音量。
    const prefs = useMusicDemoStore.getState();
    applyMusicPlaybackVolume(prefs.volume, prefs.muted);
    let playbackAudio = audio;
    if (audio.src !== uri) {
      playbackAudio = setMusicPlaybackSrc(audio, uri);
      applyMusicPlaybackVolume(prefs.volume, prefs.muted);
      playbackAudio.load();
    }
    setMusicPlaybackLoadedMeta({ trackId: input.trackId, sourceUri: input.sourceUri });
    const seekSec =
      typeof input.seekSec === "number" && Number.isFinite(input.seekSec) && input.seekSec > 0
        ? input.seekSec
        : 0;
    if (seekSec > 0) {
      const applySeek = () => {
        try {
          if (Number.isFinite(playbackAudio.duration) && playbackAudio.duration > 0) {
            playbackAudio.currentTime = Math.min(
              seekSec,
              Math.max(0, playbackAudio.duration - 0.25),
            );
          } else {
            playbackAudio.currentTime = seekSec;
          }
        } catch {
          // ignore
        }
      };
      if (playbackAudio.readyState >= 1) {
        applySeek();
      } else {
        playbackAudio.addEventListener("loadedmetadata", applySeek, { once: true });
      }
    }
    const ok = await safeMusicPlay(playbackAudio);
    notifyPlaying(ok);
    // 失败时绝不能把 wantsPlaying 打成 false：否则冷启动竞态会把「要播」意图冲掉并落盘。
    if (ok) {
      useMusicDemoStore.getState().setWantsPlaying(true);
      setMusicPlaybackBackgroundActive(true);
    }
    return ok;
  } catch {
    // 失败时不要清空 src；保留上一状态，交给下次挂载恢复
    useMusicDemoStore.getState().setWantsPlaying(true);
    return false;
  }
}

/**
 * 宿主冷启动 / 包 activate 后：若 persist 里 wantsPlaying，则无 Tab 也 headless 续播。
 * 成功后才锁死；条件未齐（水合未完成）或 play/解析失败时允许重试。
 */
let coldStartRestoreSucceeded = false;
let coldStartRestoreInFlight = false;
let coldRestoreWatchInstalled = false;
let coldRestoreRetryTimer: ReturnType<typeof setTimeout> | null = null;
let coldRestoreGestureUnlockInstalled = false;

export function resetMusicColdStartRestoreForTests(): void {
  coldStartRestoreSucceeded = false;
  coldStartRestoreInFlight = false;
  coldRestoreWatchInstalled = false;
  coldRestoreGestureUnlockInstalled = false;
  if (coldRestoreRetryTimer) {
    clearTimeout(coldRestoreRetryTimer);
    coldRestoreRetryTimer = null;
  }
}

function scheduleMusicColdRestoreRetry(delayMs: number): void {
  if (coldStartRestoreSucceeded || coldRestoreRetryTimer) {
    return;
  }
  coldRestoreRetryTimer = setTimeout(() => {
    coldRestoreRetryTimer = null;
    void maybeRestoreMusicPlaybackAfterColdStart();
  }, delayMs);
}

/** 自动播放策略拦下时：每次用户手势再抢 headless play，成功才卸监听（不依赖打开 Music Tab）。 */
function installMusicAutoplayUnlockRetry(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (coldRestoreGestureUnlockInstalled) {
    return;
  }
  coldRestoreGestureUnlockInstalled = true;
  const onGesture = () => {
    void maybeRestoreMusicPlaybackAfterColdStart().then((ok) => {
      if (!ok) {
        return undefined;
      }
      document.removeEventListener("pointerdown", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
      document.removeEventListener("click", onGesture, true);
      coldRestoreGestureUnlockInstalled = false;
      return undefined;
    });
  };
  document.addEventListener("pointerdown", onGesture, true);
  document.addEventListener("keydown", onGesture, true);
  document.addEventListener("click", onGesture, true);
}

/**
 * 水合晚到 / 列表 refresh 后 wantsPlaying 才变 true 时补跑续播。
 * activate 时调用一次即可。
 */
export function ensureMusicColdRestoreWatch(): void {
  if (coldRestoreWatchInstalled) {
    return;
  }
  coldRestoreWatchInstalled = true;
  let lastWantsPlaying = useMusicDemoStore.getState().wantsPlaying;
  useMusicDemoStore.subscribe((state) => {
    const wants = state.wantsPlaying;
    const rising = wants && !lastWantsPlaying;
    lastWantsPlaying = wants;
    if (!rising || coldStartRestoreSucceeded || coldStartRestoreInFlight) {
      return;
    }
    void maybeRestoreMusicPlaybackAfterColdStart();
  });
}

export async function maybeRestoreMusicPlaybackAfterColdStart(): Promise<boolean> {
  if (coldStartRestoreInFlight) {
    return false;
  }
  if (typeof Audio === "undefined") {
    return false;
  }
  // 先吃同步会话块，避免水合竞态下用 AsyncStorage 里的旧进度 0 起播。
  applyMusicPlaybackSessionSnapshotAfterHydrate();
  const state = useMusicDemoStore.getState();
  ensureMusicPlaybackRuntime();
  const audio = getMusicPlaybackAudio();
  // 已成功且仍在播：直接返回；若已成功但已暂停（suspend/策略），允许再抢播。
  if (coldStartRestoreSucceeded && audio && !audio.paused && audio.src) {
    setMusicPlaybackBackgroundActive(true);
    return true;
  }
  const target = shouldRestoreMusicPlaybackAfterColdStart(state);
  if (!target) {
    // 条件未齐（常见：双 rehydrate 竞态 / host 水合未到）：不锁死，留给 watch / 重试。
    return false;
  }
  coldStartRestoreInFlight = true;
  try {
    if (audio && !audio.paused && audio.src) {
      setMusicPlaybackBackgroundActive(true);
      coldStartRestoreSucceeded = true;
      return true;
    }
    const latest = useMusicDemoStore.getState();
    const session = readMusicPlaybackSessionSnapshotSync();
    const seekSec =
      session && session.nowPlayingId === target.trackId
        ? Math.max(latest.playbackPositionSec, session.playbackPositionSec)
        : latest.playbackPositionSec;
    const started = await loadAndPlayTrackUriHeadless({
      trackId: target.trackId,
      sourceUri: target.sourceUri,
      seekSec,
    });
    if (started) {
      coldStartRestoreSucceeded = true;
      return true;
    }
    // 解析失败或自动播放策略：保留意图，延迟 + 手势再试（仍不需要打开 Music Tab）。
    useMusicDemoStore.getState().setWantsPlaying(true);
    coldStartRestoreSucceeded = false;
    scheduleMusicColdRestoreRetry(1_200);
    installMusicAutoplayUnlockRetry();
    return false;
  } finally {
    coldStartRestoreInFlight = false;
  }
}

function handleEnded(): void {
  syncMusicPlaybackPositionToStore(true);
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  const store = useMusicDemoStore.getState();
  notifyPlaying(false);

  if (store.playMode === "loop-one") {
    audio.currentTime = 0;
    void safeMusicPlay(audio).then((ok) => {
      notifyPlaying(ok);
      store.setWantsPlaying(ok);
      if (ok) {
        setMusicPlaybackBackgroundActive(true);
      }
      return undefined;
    });
    return;
  }

  const next = store.playNext();
  if (!next) {
    store.setWantsPlaying(false);
    setMusicPlaybackBackgroundActive(false);
    return;
  }

  store.setWantsPlaying(true);
  requestTrackAutoPlay(next.id);
  setMusicPlaybackBackgroundActive(true);

  // 有播放器 UI：只改 store，交给 player 的换曲 effect 加载。
  if (uiSinks.size > 0) {
    return;
  }

  const uri = next.sourceUri?.trim();
  if (uri) {
    void loadAndPlayTrackUriHeadless({ trackId: next.id, sourceUri: uri });
  }
}

function handleTimeUpdate(): void {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  // UI 进度走 8Hz 外部时钟；store/persist 不全量每秒写。
  notifyTime(audio.currentTime || 0);
  // 播放中每 ≥5s 同步写 localStorage 会话块（不触发整库 AsyncStorage），缩小硬刷新丢进度窗口。
  if (audio.paused || !useMusicDemoStore.getState().nowPlayingId) {
    return;
  }
  const sec = Math.max(0, Math.floor(audio.currentTime || 0));
  const bag = globalThis as typeof globalThis & {
    __agnxMusicSessionThrottleSec?: number;
  };
  // 初始 0：约每 5 秒写一次（5/10/15…），避免 last=-1 时在第 4 秒就写完再空等。
  const last = bag.__agnxMusicSessionThrottleSec ?? 0;
  if (sec > 0 && sec - last >= 5) {
    bag.__agnxMusicSessionThrottleSec = sec;
    writeLiveMusicPlaybackSessionSnapshot(sec);
  }
}

/** 安装一次常驻监听；若 Audio 单例被替换则重新绑定。播放器卸载不得 remove。 */
export function ensureMusicPlaybackRuntime(): void {
  if (typeof Audio === "undefined") {
    return;
  }
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  if (runtimeInstalled && runtimeAudio === audio) {
    return;
  }
  if (runtimeAudio && runtimeAudio !== audio) {
    runtimeAudio.removeEventListener("ended", handleEnded);
    runtimeAudio.removeEventListener("timeupdate", handleTimeUpdate);
  }
  runtimeAudio = audio;
  runtimeInstalled = true;
  publishMusicPlaybackSessionBuildStamp();
  audio.addEventListener("ended", handleEnded);
  audio.addEventListener("timeupdate", handleTimeUpdate);
  ensureWantsPlayingBridge();
  installPlaybackPositionLifecycleFlush();
}
