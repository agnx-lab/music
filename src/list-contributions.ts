// 场景：Music 列表面贡献 — 经 activate(host) 注册。
import { Music2 } from "lucide-react-native";
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import { getMusicRuntimeAppId } from "./music-runtime-app-id";
import { MUSIC_APP_ID, MUSIC_LEGACY_APP_ID } from "./music-ids";
import { listTracksAsWorkspaceItems, useMusicDemoStore } from "./store";

export { MUSIC_APP_ID, MUSIC_LEGACY_APP_ID };
export const MUSIC_SEGMENT_ID = "music";
export const MUSIC_PANEL_ID = "player";
export const MUSIC_PROVIDER_ID = "music.tracks";
export const MUSIC_OPEN_PLAYER_COMMAND_ID = "music.open-player";
export const MUSIC_SEARCH_COMMAND_ID = "music.search";
export const MUSIC_UPLOAD_COMMAND_ID = "music.upload";
export const MUSIC_PLAYER_ENTITY_ID = "now-playing";

export function registerMusicListContributions(host: WorkspaceAppHostApi): void {
  const appId = getMusicRuntimeAppId();
  // 可重复调用：卸载后再安装需重新 register；registry 按 key 覆盖。
  host.registerPrimarySegment({
    id: MUSIC_SEGMENT_ID,
    appId,
    label: "音乐",
    order: 55,
    icon: Music2,
    keywords: ["music", "歌曲", "曲目", "播放器", "player"],
    listTitlePresentation: "inline-muted-subtitle",
    itemProviderId: MUSIC_PROVIDER_ID,
    organizeBlockId: MUSIC_SEGMENT_ID,
    emptyHint: "还没有曲目。打开播放器后可在应用内导入本地音频。",
    emptyActionCommandId: MUSIC_OPEN_PLAYER_COMMAND_ID,
    listHeaderCommandIds: [MUSIC_OPEN_PLAYER_COMMAND_ID],
  });
  host.registerItemProvider({
    id: MUSIC_PROVIDER_ID,
    appId,
    subscribe: (listener) => {
      listener(listTracksAsWorkspaceItems());
      return useMusicDemoStore.subscribe(() => {
        listener(listTracksAsWorkspaceItems());
      });
    },
    search: (query) => listTracksAsWorkspaceItems(query),
  });
  host.registerOrganize({
    id: MUSIC_SEGMENT_ID,
    appId,
    label: "音乐",
    sortOptions: [
      { id: "updatedAt", label: "最近更新" },
      { id: "title", label: "名称排序" },
    ],
    defaultSortOptionId: "updatedAt",
    organize: ({ query }) => [
      {
        key: "tracks",
        title: "曲目",
        items: listTracksAsWorkspaceItems(query),
      },
    ],
  });
}

export function resetMusicListContributionsForTests(): void {
  // 列表贡献无模块级缓存；保留 reset 供测试对称调用。
}
