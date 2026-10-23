// 场景：在真实宿主里跑搜索→点播落盘冒烟（写 storage 请求/结果，供 Agent 无人值守验收）。
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import { MUSIC_APP_ID } from "../music-ids";
import { useMusicDemoStore } from "../store";
import { downloadAndPersistTrackBundle } from "./download-bundle";
import { searchMusic } from "./service";

export const MUSIC_UI_SMOKE_REQUEST_KEY = "ui-smoke-request";
export const MUSIC_UI_SMOKE_RESULT_KEY = "ui-smoke-result";

export interface MusicUiSmokeRequest {
  nonce: string;
  keyword: string;
  requestedAt: number;
}

export interface MusicUiSmokeResult {
  nonce: string;
  ok: boolean;
  steps: Array<{ name: string; ok: boolean; detail?: string }>;
  error?: string;
  finishedAt: number;
  downloaded?: {
    trackId: string;
    title: string;
    sourceUri: string;
    byteSize: number;
  };
  searchHitCount?: number;
  playableHitCount?: number;
}

function isSmokeRequest(value: unknown): value is MusicUiSmokeRequest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.nonce === "string" &&
    row.nonce.trim().length > 0 &&
    typeof row.keyword === "string" &&
    row.keyword.trim().length > 0 &&
    typeof row.requestedAt === "number"
  );
}

export async function runMusicUiSmoke(
  hostApi: WorkspaceAppHostApi,
  request: MusicUiSmokeRequest,
): Promise<MusicUiSmokeResult> {
  const steps: MusicUiSmokeResult["steps"] = [];
  const keyword = request.keyword.trim();
  try {
    useMusicDemoStore.getState().setPlayerSurface("search");
    steps.push({ name: "open-search-surface", ok: true });

    useMusicDemoStore.getState().pushSearchHistory(keyword);
    const history = useMusicDemoStore.getState().searchHistory;
    steps.push({
      name: "push-search-history",
      ok: history.includes(keyword),
      detail: history.join(","),
    });

    const page = await searchMusic({ text: keyword, scope: "track" });
    const playable = page.tracks.filter((hit) => Boolean(hit.playableUrl?.trim()));
    steps.push({
      name: "search-playable-hits",
      ok: playable.length > 0,
      detail: `hits=${page.tracks.length} playable=${playable.length}`,
    });
    if (playable.length === 0) {
      throw new Error(`搜索「${keyword}」没有可播直链`);
    }

    const hit = playable[0]!;
    const created = useMusicDemoStore.getState().upsertTrackFromSearchHit(hit);
    const playableUrl = hit.playableUrl?.trim() || null;
    steps.push({
      name: "upsert-track",
      ok: Boolean(created.id) && Boolean(playableUrl),
      detail: `${created.title} (${created.id}) url=${playableUrl ? "yes" : "no"}`,
    });

    useMusicDemoStore.getState().updateTrack(created.id, {
      sourceUri: playableUrl,
      sourceKind: "cloud",
    });
    useMusicDemoStore.getState().setNowPlaying(created.id);
    useMusicDemoStore.getState().setWantsPlaying(true);
    useMusicDemoStore.getState().setPlayerSurface("search");
    const afterPlay = useMusicDemoStore.getState();
    const playing = afterPlay.tracks.find((item) => item.id === created.id);
    steps.push({
      name: "cloud-play-stay-search",
      ok:
        afterPlay.playerSurface === "search" &&
        playing?.sourceKind === "cloud" &&
        Boolean(playing.sourceUri && /^https?:\/\//.test(playing.sourceUri)),
      detail: `surface=${afterPlay.playerSurface} kind=${playing?.sourceKind}`,
    });

    const report = await downloadAndPersistTrackBundle(hostApi, created.id, {
      playableUrl,
      force: true,
    });
    const track = useMusicDemoStore.getState().tracks.find((item) => item.id === created.id);
    const localOk =
      report.sourceByteSize >= 1000 &&
      track?.sourceKind === "local" &&
      Boolean(track.sourceUri) &&
      !/^https?:\/\//.test(track.sourceUri ?? "");
    steps.push({
      name: "save-local-overwrite",
      ok: localOk,
      detail: `bytes=${report.sourceByteSize} uri=${report.sourceUri}`,
    });
    if (!localOk) {
      throw new Error("落盘失败或仍是远程 URL");
    }

    const result: MusicUiSmokeResult = {
      nonce: request.nonce,
      ok: steps.every((step) => step.ok),
      steps,
      finishedAt: Date.now(),
      searchHitCount: page.tracks.length,
      playableHitCount: playable.length,
      downloaded: {
        trackId: created.id,
        title: report.title,
        sourceUri: report.sourceUri,
        byteSize: report.sourceByteSize,
      },
    };
    await hostApi.storage.writeJson(MUSIC_APP_ID, MUSIC_UI_SMOKE_RESULT_KEY, result);
    return result;
  } catch (error) {
    const result: MusicUiSmokeResult = {
      nonce: request.nonce,
      ok: false,
      steps,
      error: error instanceof Error ? error.message : String(error),
      finishedAt: Date.now(),
    };
    await hostApi.storage.writeJson(MUSIC_APP_ID, MUSIC_UI_SMOKE_RESULT_KEY, result);
    return result;
  }
}

/** activate 后轮询 storage 请求；同一 nonce 只跑一次。 */
export function startMusicUiSmokeWatcher(hostApi: WorkspaceAppHostApi): () => void {
  let stopped = false;
  let running = false;
  let lastNonce: string | null = null;

  const tick = async () => {
    if (stopped || running) {
      return;
    }
    running = true;
    try {
      const raw = await hostApi.storage.readJson(MUSIC_APP_ID, MUSIC_UI_SMOKE_REQUEST_KEY);
      if (!isSmokeRequest(raw)) {
        return;
      }
      if (raw.nonce === lastNonce) {
        return;
      }
      // 过期请求忽略（避免旧文件反复触发）
      if (Date.now() - raw.requestedAt > 5 * 60_000) {
        return;
      }
      lastNonce = raw.nonce;
      await runMusicUiSmoke(hostApi, raw);
    } catch (error) {
      console.warn("[com.example.music] ui smoke watcher failed", error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, 1500);
  void tick();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
