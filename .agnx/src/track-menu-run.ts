// 场景：曲目菜单执行 — 侧栏右键与播放器三点必须走同一套语义，禁止各写一份 switch。
/* oxlint-disable eslint(complexity) -- 菜单 action 全集中在一处 switch */
import type { WorkspaceAppHostApi } from "@getagnx/app-sdk";
import { deleteMusicTrackCompletely, exportMusicTrackZip } from "./resource/track-files";
import { refreshTrackResourcesAndMaybePersist } from "./resource/refresh-resources";
import { requestTrackAutoPlay } from "./music-autoplay";
import { useMusicDemoStore } from "./store";
import { openMusicTrackDetailSheet } from "./track-detail";
import type { MusicTrackMenuActionId } from "./track-menu";

export interface RunMusicTrackMenuResult {
  /** 短提示；调用方可 toast / 忽略 */
  toast?: string;
  /** 播放器内「更新歌曲」后需强制重载音源 */
  reloadPlayback?: boolean;
}

/**
 * 曲目菜单唯一执行入口（侧栏 itemId / 播放器当前曲）。
 * detail soft-alias 开公共详情壳，绝不 setNowPlaying。
 */
export async function runMusicTrackMenuAction(input: {
  hostApi: WorkspaceAppHostApi;
  action: MusicTrackMenuActionId;
  trackId: string;
}): Promise<RunMusicTrackMenuResult> {
  const trackId = input.trackId.trim();
  if (!trackId) {
    return {};
  }
  const state = useMusicDemoStore.getState();
  const track = state.getTrack(trackId);
  if (!track) {
    return { toast: "曲目不存在" };
  }

  switch (input.action) {
    case "pin": {
      state.togglePinned(trackId);
      const pinned = Boolean(state.getTrack(trackId)?.pinned);
      return { toast: pinned ? "已置顶" : "已取消置顶" };
    }
    case "addPlaylist":
      state.addToQueue(trackId, "end");
      return { toast: "已添加到播放列表" };
    case "playNext":
      state.addToQueue(trackId, "next");
      return { toast: "已设为下一首播放" };
    case "share":
      return { toast: "分享（占位）" };
    case "detail":
      await openMusicTrackDetailSheet(input.hostApi, trackId);
      return {};
    case "exportZip": {
      try {
        const result = await exportMusicTrackZip(input.hostApi, trackId);
        return { toast: `已导出 ${result.entryCount} 个文件 → ${result.path}` };
      } catch (exportError) {
        const message = exportError instanceof Error ? exportError.message : "导出失败";
        if (message.includes("已取消")) {
          return { toast: "已取消导出" };
        }
        return { toast: message };
      }
    }
    case "refreshResources": {
      if (!track.remoteRef) {
        return { toast: "本地上传曲目请重新导入" };
      }
      try {
        const report = await refreshTrackResourcesAndMaybePersist(input.hostApi, trackId);
        return { toast: report.message, reloadPlayback: true };
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : "更新失败";
        return { toast: message };
      }
    }
    case "deleteTrack": {
      const wasPlaying = state.nowPlayingId === trackId;
      try {
        const ok = await deleteMusicTrackCompletely(input.hostApi, trackId);
        if (!ok) {
          return { toast: "删除失败：曲目不存在" };
        }
        if (wasPlaying) {
          const nextId = useMusicDemoStore.getState().nowPlayingId;
          if (nextId) {
            requestTrackAutoPlay(nextId);
          }
        }
        return { toast: "已删除歌曲及本地音源/封面/歌词" };
      } catch (deleteError) {
        const message = deleteError instanceof Error ? deleteError.message : "删除失败";
        return { toast: message };
      }
    }
    default:
      return {};
  }
}
