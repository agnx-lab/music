// 场景：音乐子应用唯一 HTMLAudioElement，避免多 Tab/热更新/双包叠播；音量支持 0–200%（GainNode）。
import { MUSIC_APP_ID } from "./music-ids";
const GLOBAL_AUDIO_KEY = "__agnx_music_playback_audio__";
const GLOBAL_GAIN_KEY = "__agnx_music_playback_gain__";
const GLOBAL_LOADED_KEY = "__agnx_music_playback_loaded__";
/** MediaElementSource 已绑过当前 Audio（不可解绑；跨域出声必须换新元素）。 */
const GLOBAL_MES_BOUND_KEY = "__agnx_music_playback_mes_bound__";
/** 与 `packages/app/src/workspace-apps/media-playback-tab-retain.ts` 必须同名。 */
const BACKGROUND_ACTIVE_KEY = "__agnx_music_playback_background_active__";
const BACKGROUND_LISTENERS_KEY = "__agnx_music_playback_background_listeners__";

interface MusicGainGraph {
  context: AudioContext;
  gain: GainNode;
}

export interface MusicPlaybackLoadedMeta {
  trackId: string;
  sourceUri: string;
}

type GlobalAudioHost = typeof globalThis & {
  [GLOBAL_AUDIO_KEY]?: HTMLAudioElement;
  [GLOBAL_GAIN_KEY]?: MusicGainGraph;
  [GLOBAL_LOADED_KEY]?: MusicPlaybackLoadedMeta;
  [GLOBAL_MES_BOUND_KEY]?: boolean;
  [BACKGROUND_ACTIVE_KEY]?: boolean;
  [BACKGROUND_LISTENERS_KEY]?: Set<() => void>;
};

function readGlobalAudio(): HTMLAudioElement | null {
  const host = globalThis as GlobalAudioHost;
  return host[GLOBAL_AUDIO_KEY] ?? null;
}

function writeGlobalAudio(audio: HTMLAudioElement | null): void {
  const host = globalThis as GlobalAudioHost;
  if (audio) {
    host[GLOBAL_AUDIO_KEY] = audio;
  } else {
    delete host[GLOBAL_AUDIO_KEY];
  }
}

function readGlobalGain(): MusicGainGraph | null {
  return (globalThis as GlobalAudioHost)[GLOBAL_GAIN_KEY] ?? null;
}

function writeGlobalGain(value: MusicGainGraph | null): void {
  const host = globalThis as GlobalAudioHost;
  if (value) {
    host[GLOBAL_GAIN_KEY] = value;
  } else {
    delete host[GLOBAL_GAIN_KEY];
  }
}

/** 跨域 http(s) 媒体：MediaElementSource 无 CORS 会「进度走、完全无声」。 */
export function isCrossOriginHttpMusicSrc(uri: string): boolean {
  const trimmed = uri.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  if (typeof location === "undefined" || !location.origin) {
    return true;
  }
  try {
    return new URL(trimmed).origin !== location.origin;
  } catch {
    return true;
  }
}

/** 拆掉 Gain 图，让跨域 http 回退到 element.volume 出声。 */
export function tearDownMusicPlaybackGainGraph(): void {
  const graph = readGlobalGain();
  if (!graph) {
    return;
  }
  try {
    void graph.context.close();
  } catch {
    // ignore
  }
  writeGlobalGain(null);
}

function recreateMusicPlaybackAudioElement(): HTMLAudioElement {
  tearDownMusicPlaybackGainGraph();
  const host = globalThis as GlobalAudioHost;
  delete host[GLOBAL_MES_BOUND_KEY];
  try {
    const old = readGlobalAudio();
    if (old) {
      old.pause();
      old.removeAttribute("src");
      old.load();
    }
  } catch {
    // ignore
  }
  writeGlobalAudio(null);
  sharedAudio = null;
  const next = getMusicPlaybackAudio();
  if (!next) {
    throw new Error("无法创建音频元素");
  }
  return next;
}

/**
 * 设置可播 src。
 * 跨域 http：若已绑 MediaElementSource，必须换新 Audio，否则关 context 也永远无声。
 * 返回实际使用的 audio（可能已换新实例）。
 */
export function setMusicPlaybackSrc(audio: HTMLAudioElement, uri: string): HTMLAudioElement {
  const trimmed = uri.trim();
  if (!trimmed) {
    return audio;
  }
  let target = audio;
  if (isCrossOriginHttpMusicSrc(trimmed)) {
    const host = globalThis as GlobalAudioHost;
    if (host[GLOBAL_MES_BOUND_KEY] || readGlobalGain()) {
      target = recreateMusicPlaybackAudioElement();
    } else {
      tearDownMusicPlaybackGainGraph();
    }
    target.crossOrigin = "anonymous";
  }
  if (target.src !== trimmed) {
    target.src = trimmed;
  }
  return target;
}

let sharedAudio: HTMLAudioElement | null = readGlobalAudio();

/** 全应用共用一个 Audio；重复调用 / HMR 后仍返回同一实例。 */
export function getMusicPlaybackAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") {
    return null;
  }
  const existing = sharedAudio ?? readGlobalAudio();
  if (existing) {
    sharedAudio = existing;
    writeGlobalAudio(existing);
    return existing;
  }
  sharedAudio = new Audio();
  sharedAudio.preload = "auto";
  // 跨域 daemon 媒体要进 Web Audio 时需要；blob/同域无害。
  sharedAudio.crossOrigin = "anonymous";
  writeGlobalAudio(sharedAudio);
  return sharedAudio;
}

export function getMusicPlaybackLoadedMeta(): MusicPlaybackLoadedMeta | null {
  return (globalThis as GlobalAudioHost)[GLOBAL_LOADED_KEY] ?? null;
}

export function setMusicPlaybackLoadedMeta(meta: MusicPlaybackLoadedMeta | null): void {
  const host = globalThis as GlobalAudioHost;
  if (meta) {
    host[GLOBAL_LOADED_KEY] = meta;
  } else {
    delete host[GLOBAL_LOADED_KEY];
  }
}

/**
 * 标记后台续播中：工作区 keep-alive 据此钉住 music Tab，避免开新 Tab 时 LRU 卸掉播放器
 * 导致重挂载误走 hard-load。
 */
export function setMusicPlaybackBackgroundActive(active: boolean): void {
  const host = globalThis as GlobalAudioHost;
  if (Boolean(host[BACKGROUND_ACTIVE_KEY]) === active) {
    if (active) {
      bootMusicPlaybackRuntimeFromEngine();
    }
    syncMusicRetainToHostApi(active);
    return;
  }
  host[BACKGROUND_ACTIVE_KEY] = active;
  if (active) {
    bootMusicPlaybackRuntimeFromEngine();
  }
  host[BACKGROUND_LISTENERS_KEY]?.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore subscriber errors
    }
  });
  syncMusicRetainToHostApi(active);
}

function syncMusicRetainToHostApi(active: boolean): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const musicHost = require("./music-host") as {
      tryGetMusicHostApi?: () => {
        background?: {
          requestRetain?: (input: { appId: string; active: boolean; reason?: string }) => void;
        };
      } | null;
    };
    musicHost.tryGetMusicHostApi?.()?.background?.requestRetain?.({
      appId: MUSIC_APP_ID,
      active,
      reason: "playback",
    });
  } catch {
    // 未 activate 或旧宿主无 background：仅靠 legacy globalThis
  }
}

export function getMusicPlaybackBackgroundActive(): boolean {
  return Boolean((globalThis as GlobalAudioHost)[BACKGROUND_ACTIVE_KEY]);
}

/** 在起播路径尽早挂上常驻 ended/timeupdate（避免仅依赖播放器 mount）。 */
function bootMusicPlaybackRuntimeFromEngine(): void {
  try {
    // 延迟 require 避免 engine↔runtime 循环依赖在模块初始化期爆炸
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const runtime = require("./playback-runtime") as {
      ensureMusicPlaybackRuntime?: () => void;
    };
    runtime.ensureMusicPlaybackRuntime?.();
  } catch {
    // ignore
  }
}

/** 同曲同源且单例仍在播 → 禁止 remount 后重新 load。 */
export function isMusicPlaybackLiveOnTrack(input: {
  trackId: string;
  sourceUri: string;
  nowPlayingId: string | null;
  audio: HTMLAudioElement | null;
  loadedTrackId: string | null;
  loadedSourceUri: string | null;
}): boolean {
  const { trackId, sourceUri, nowPlayingId, audio } = input;
  if (!audio || !audio.src || audio.paused) {
    return false;
  }
  if (trackId !== nowPlayingId) {
    return false;
  }
  const meta = getMusicPlaybackLoadedMeta();
  // 同曲换源（云→本地）必须走软切，不能当成 live remount。
  if (meta?.trackId === trackId && meta.sourceUri !== sourceUri) {
    return false;
  }
  if (
    input.loadedTrackId === trackId &&
    input.loadedSourceUri != null &&
    input.loadedSourceUri !== sourceUri
  ) {
    return false;
  }
  const sameTrack = input.loadedTrackId === trackId || meta?.trackId === trackId;
  const sameSource = input.loadedSourceUri === sourceUri || meta?.sourceUri === sourceUri;
  if (sameTrack && sameSource) {
    return true;
  }
  // Cold remount：refs/meta 皆空，但单例仍在播当前 nowPlaying → 禁止 hard-load。
  // 切曲时 loadedTrackId 通常仍指向旧曲，不得走此分支。
  return input.loadedTrackId == null && meta == null;
}

/** 可读的总时长（秒）；NaN/Infinity/未就绪 → 0。 */
export function readMusicPlaybackDurationSec(audio: HTMLAudioElement | null | undefined): number {
  if (!audio) {
    return 0;
  }
  const raw = audio.duration;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  return raw;
}

/**
 * 等到 audio 有有效 duration（或超时）。
 * 网页刷新后 metadata 常在 UI 监听挂上前就触发过，硬等一次可避免右边总时长卡在 00:00。
 */
export function whenMusicPlaybackMetadataReady(
  audio: HTMLAudioElement,
  timeoutMs = 8_000,
): Promise<number> {
  const existing = readMusicPlaybackDurationSec(audio);
  if (existing > 0) {
    return Promise.resolve(existing);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      resolve(readMusicPlaybackDurationSec(audio));
    };
    const onMeta = () => {
      if (readMusicPlaybackDurationSec(audio) > 0) {
        finish();
      }
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    // 已 readyState>=1 时再读一次（事件可能已错过）
    if (audio.readyState >= 1) {
      onMeta();
    }
    const timer = setTimeout(finish, Math.max(0, timeoutMs));
    if (typeof timer === "object" && timer && "unref" in timer) {
      try {
        (timer as { unref: () => void }).unref();
      } catch {
        // ignore
      }
    }
  });
}

function ensureMusicPlaybackGain(audio: HTMLAudioElement): GainNode | null {
  if (typeof AudioContext === "undefined") {
    return null;
  }
  // 跨域 http：未开齐 CORS 时 MediaElementSource 输出全 0（进度走、人耳无声）。
  if (audio.src && isCrossOriginHttpMusicSrc(audio.src)) {
    return null;
  }
  const existing = readGlobalGain();
  if (existing) {
    return existing.gain;
  }
  try {
    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const gain = context.createGain();
    source.connect(gain);
    gain.connect(context.destination);
    writeGlobalGain({ context, gain });
    (globalThis as GlobalAudioHost)[GLOBAL_MES_BOUND_KEY] = true;
    audio.volume = 1;
    return gain;
  } catch {
    return null;
  }
}

/** 应用音量：0–2（200%）；优先 Web Audio Gain，否则退回 element.volume（最高 100%）。 */
export function applyMusicPlaybackVolume(volume: number, muted: boolean): void {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  const level = muted ? 0 : Math.min(2, Math.max(0, volume));
  const gain = ensureMusicPlaybackGain(audio);
  if (gain) {
    audio.volume = 1;
    gain.gain.value = level;
    const ctx = readGlobalGain()?.context;
    if (ctx && ctx.state === "suspended") {
      // 同步路径无法 await；真正起播前 safeMusicPlay 会再 resume
      void ctx.resume();
    }
    return;
  }
  audio.volume = Math.min(1, level);
}

/** 浏览器常见竞态：play() 尚未 settle 就被 pause()/换源打断，不应当作用户可见失败。 */
export function isMusicPlayInterruptedError(error: unknown): boolean {
  if (error == null) {
    return false;
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    if (String((error as { name?: unknown }).name) === "AbortError") {
      return true;
    }
  }
  let message = "";
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = String(error);
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("interrupted by a call to pause") ||
    lower.includes("the play() request was interrupted") ||
    lower.includes("interrupted by a new load request")
  );
}

/** 浏览器自动播放策略拦截（刷新后无用户手势）。 */
export function isMusicAutoplayBlockedError(error: unknown): boolean {
  if (error == null) {
    return false;
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = String((error as { name?: unknown }).name);
    if (name === "NotAllowedError") {
      return true;
    }
  }
  let message = "";
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = String(error);
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("notallowederror") ||
    lower.includes("user didn't interact") ||
    lower.includes("user has not interacted") ||
    lower.includes("play() can only be initiated") ||
    lower.includes("the request is not allowed by the user agent")
  );
}

/** 恢复 Gain 用的 AudioContext；网页刷新后常为 suspended，不 resume 会「像在播却没声」。 */
export async function resumeMusicPlaybackAudioContext(): Promise<void> {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  // 确保 graph 已建（volume effect / headless 都会走到）
  ensureMusicPlaybackGain(audio);
  const ctx = readGlobalGain()?.context;
  if (!ctx || ctx.state !== "suspended") {
    return;
  }
  try {
    await ctx.resume();
  } catch {
    // 仍可能要等用户手势；交给上层重试
  }
}

/** 安全 play：打断类 / 自动播放拦截返回 false，不抛；先 resume AudioContext。 */
export async function safeMusicPlay(audio: HTMLAudioElement): Promise<boolean> {
  try {
    await resumeMusicPlaybackAudioContext();
    await audio.play();
    return !audio.paused;
  } catch (error) {
    if (isMusicPlayInterruptedError(error)) {
      return !audio.paused;
    }
    if (isMusicAutoplayBlockedError(error)) {
      return false;
    }
    throw error;
  }
}

/** 停止并断开当前媒体，供主动停播/切源前调用（路由卸载勿用）。 */
export function stopMusicPlaybackAudio(): void {
  const audio = sharedAudio ?? readGlobalAudio();
  if (!audio) {
    return;
  }
  try {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  } catch {
    // ignore
  }
  setMusicPlaybackLoadedMeta(null);
  setMusicPlaybackBackgroundActive(false);
}

/**
 * 切曲前调用：暂停单例并确保不会残留第二个 Audio。
 * HMR / 双入口曾导致旧 Audio 仍在播、新 UI 已换曲。
 * 同时把 currentTime 归零，避免 timeupdate / 进度条短暂沿用上一首位置。
 */
export function prepareMusicPlaybackSourceChange(): HTMLAudioElement | null {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return null;
  }
  try {
    audio.pause();
  } catch {
    // ignore
  }
  try {
    if (Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
      audio.currentTime = 0;
    }
  } catch {
    // 无媒体 / 未就绪时可能抛错
  }
  setMusicPlaybackLoadedMeta(null);
  return audio;
}
