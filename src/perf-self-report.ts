// 场景：Music 性能自报 — Tab 可见且播放中时写 host.storage perf-self-report-v1。
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import { MUSIC_APP_ID } from "./music-ids";
import { tryGetMusicHostApi } from "./music-host";
import { useMusicDemoStore } from "./store";

const PERF_SELF_REPORT_KEY = "perf-self-report-v1";
const PERF_SELF_REPORT_RING = 24;
const SAMPLE_EVERY_MS = 2_000;

interface PerfSample {
  at: number;
  fpsEstimate?: number;
  longtaskCountDelta?: number;
  busy?: string;
  note?: string;
}

interface PerfDoc {
  version: 1;
  appId: string;
  samples: PerfSample[];
}

let stopHandle: (() => void) | null = null;
let longtaskDelta = 0;
let longtaskObserver: { disconnect: () => void } | null = null;

function installLongtaskObserver(): void {
  if (longtaskObserver || typeof PerformanceObserver === "undefined") {
    return;
  }
  try {
    const observer = new PerformanceObserver((list) => {
      longtaskDelta += list.getEntries().length;
    });
    observer.observe({ type: "longtask", buffered: false } as PerformanceObserverInit);
    longtaskObserver = observer;
  } catch {
    longtaskObserver = null;
  }
}

async function writeSample(host: WorkspaceAppHostApi, sample: PerfSample): Promise<void> {
  const raw = await host.storage.readJson(MUSIC_APP_ID, PERF_SELF_REPORT_KEY);
  const prev: PerfDoc =
    raw && typeof raw === "object"
      ? {
          version: 1,
          appId: MUSIC_APP_ID,
          samples: Array.isArray((raw as PerfDoc).samples) ? (raw as PerfDoc).samples : [],
        }
      : { version: 1, appId: MUSIC_APP_ID, samples: [] };
  const next: PerfDoc = {
    version: 1,
    appId: MUSIC_APP_ID,
    samples: [...prev.samples, sample].slice(-PERF_SELF_REPORT_RING),
  };
  await host.storage.writeJson(MUSIC_APP_ID, PERF_SELF_REPORT_KEY, next);
}

export function startMusicPerfSelfReport(host: WorkspaceAppHostApi): () => void {
  stopMusicPerfSelfReport();
  installLongtaskObserver();

  let timer: ReturnType<typeof setInterval> | null = null;
  let musicVisible = false;
  const unsubs: Array<() => void> = [];

  unsubs.push(
    host.tabs.onVisibleChange((event) => {
      if (event.appId === MUSIC_APP_ID) {
        musicVisible = event.visible;
      }
    }),
  );
  unsubs.push(
    host.tabs.onFocus((event) => {
      if (event.kind === "mini-app" && event.appId === MUSIC_APP_ID) {
        musicVisible = true;
      }
    }),
  );
  unsubs.push(
    host.lifecycle.onSuspend(() => {
      musicVisible = false;
    }),
  );

  const tick = () => {
    void (async () => {
      const state = useMusicDemoStore.getState();
      if (!musicVisible || !state.wantsPlaying) {
        return;
      }
      const lt = longtaskDelta;
      longtaskDelta = 0;
      const playing = state.nowPlayingId ? state.getTrack(state.nowPlayingId) : undefined;
      const hasLyrics = Boolean(playing?.lyrics?.trim());
      const sample: PerfSample = {
        at: Date.now(),
        longtaskCountDelta: lt > 0 ? lt : undefined,
        busy: hasLyrics ? "lyrics-karaoke" : "playback",
        note: hasLyrics ? "播放中且有歌词" : "播放中",
      };
      const live = tryGetMusicHostApi();
      if (!live) {
        return;
      }
      try {
        await writeSample(live, sample);
      } catch {
        // 自报失败不打断播放
      }
    })();
  };

  timer = setInterval(tick, SAMPLE_EVERY_MS);
  // 首帧稍晚，等 Tab 可见事件
  setTimeout(tick, 1_200);

  stopHandle = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    for (const unsub of unsubs) {
      unsub();
    }
    longtaskObserver?.disconnect();
    longtaskObserver = null;
    stopHandle = null;
  };
  return stopHandle;
}

export function stopMusicPerfSelfReport(): void {
  stopHandle?.();
  stopHandle = null;
}
