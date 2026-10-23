// 场景：com.example.music 入口 — 宿主按 manifest.main / 包名 import 后调用 activate(host)。
import type { WorkspaceAppHostApi, WorkspaceAppModule } from "@agnx-lab/app-sdk";
import { MUSIC_APP_ID } from "./music-ids";
import { bindMusicRuntimeAppIdFromHost } from "./music-runtime-app-id";
import { setMusicPlaybackBackgroundActive, stopMusicPlaybackAudio } from "./playback-engine";
import { ensureMusicPlaybackRuntime } from "./playback-runtime";
import { initMusicPlaybackLeader } from "./playback-leader";
import { registerMusicApp } from "./player";
import { registerMusicAgentTools } from "./agent-tools";
import { resetMusicHostApi } from "./music-host";
import { stopMusicPerfSelfReport } from "./perf-self-report";
import { useMusicDemoStore } from "./store";

export const appId = MUSIC_APP_ID;

export function activate(host: WorkspaceAppHostApi): void {
  bindMusicRuntimeAppIdFromHost(host);
  initMusicPlaybackLeader(host);
  registerMusicApp(host);
  registerMusicAgentTools(host);
  // 包激活即挂常驻 ended/timeupdate，不依赖播放器 Tab 是否挂载。
  ensureMusicPlaybackRuntime();
}

export function deactivate(_host: WorkspaceAppHostApi): void {
  stopMusicPerfSelfReport();
  setMusicPlaybackBackgroundActive(false);
  stopMusicPlaybackAudio();
  useMusicDemoStore.getState().setWantsPlaying(false);
  resetMusicHostApi();
}

const moduleExport: WorkspaceAppModule = {
  appId: MUSIC_APP_ID,
  activate,
  deactivate,
};

export default moduleExport;

export { MUSIC_APP_ID } from "./music-ids";
export { MUSIC_PANEL_ID, MUSIC_PROVIDER_ID, MUSIC_SEGMENT_ID } from "./list-contributions";
export {
  bindMusicHostStorage,
  listTracksAsWorkspaceItems,
  refreshMusicListFromHostStorage,
  trackToListItem,
  useMusicDemoStore,
  type DemoTrack,
  type MusicPlayMode,
  type MusicTrackSourceKind,
} from "./store";
