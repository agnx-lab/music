// 场景：曲目元数据 — 并入 Tab 公共详情「元数据」；⌥⇧D soft-alias 开公共壳，不再自造独立 sheet。
/* oxlint-disable eslint(complexity), eslint-plugin-react-perf(jsx-no-jsx-as-prop) -- 详情行组装；氛围操作区挂 valueContent */
import type {
  WorkspaceAppDetailSheetExtraRow,
  WorkspaceAppDetailSheetExtrasContext,
  WorkspaceAppHostApi,
} from "@agnx-lab/app-sdk";
import { MusicAtmosphereDetailField } from "./detail-sheet-fields";
import { MUSIC_APP_ID } from "./music-ids";
import {
  resolveMusicLocalAudioUri,
  type MusicDownloadBundleReport,
} from "./resource/download-bundle";
import { getMusicPlatformLabel } from "./resource/platform-registry";
import { useMusicDemoStore, type DemoTrack } from "./store";

function resolveTrackPlatformLabel(input: { providerId?: string; sourceKind?: string }): string {
  if (input.providerId) {
    return getMusicPlatformLabel(input.providerId);
  }
  if (input.sourceKind === "local") {
    return "本地";
  }
  return "在线";
}

/** 公共详情投影的曲目：显式 entityId（非 now-playing）优先，否则当前播放。 */
export function resolveMusicPublicDetailTrackId(
  context?: WorkspaceAppDetailSheetExtrasContext,
): string | null {
  const state = useMusicDemoStore.getState();
  const entityId = context?.entityId?.trim();
  if (entityId && entityId !== "now-playing") {
    if (state.getTrack(entityId)) {
      return entityId;
    }
  }
  return state.nowPlayingId?.trim() || null;
}

function resolveLyricsDetailValue(track: DemoTrack): string {
  const lyricsPath = track.lyricsUri?.trim();
  if (lyricsPath) {
    return lyricsPath;
  }
  if ((track.lyrics || "").trim()) {
    return "有歌词文本，但未能写入本地文件";
  }
  return "无";
}

/** 同步组装曲目元数据行（供 surface=public 的 registerDetailSheetExtras）。 */
export function buildMusicTrackPublicDetailExtraRows(input: {
  hostApi: WorkspaceAppHostApi;
  context?: WorkspaceAppDetailSheetExtrasContext;
  dataRoot?: string;
  bundle?: MusicDownloadBundleReport | null;
}): readonly WorkspaceAppDetailSheetExtraRow[] {
  const trackId = resolveMusicPublicDetailTrackId(input.context);
  if (!trackId) {
    return [{ label: "曲目", value: "当前无播放曲目" }];
  }
  const track = useMusicDemoStore.getState().getTrack(trackId);
  if (!track) {
    return [{ label: "曲目", value: "曲目不存在" }];
  }

  const platform = resolveTrackPlatformLabel({
    providerId: track.remoteRef?.providerId,
    sourceKind: track.sourceKind,
  });
  const localAudioUri = resolveMusicLocalAudioUri(track, input.bundle ?? null);
  const coverUri = (track.coverUri || "").trim();
  const playUrl = localAudioUri || track.sourceUri || "无";
  const isLocalSource = Boolean(localAudioUri) || track.sourceKind === "local";
  const palette = track.atmospherePalette;
  const dataRoot = (input.dataRoot || "").trim() || "—";

  const atmosphereRow: WorkspaceAppDetailSheetExtraRow = palette?.dark?.primary
    ? {
        label: "氛围色",
        value: `${palette.light.primary} / ${palette.dark.primary}`,
        helpText: "开沉浸时缓存浅/深双套；切主题选用对应套。可复制 JSON 或加入「我的氛围」。",
        valueContent: (
          <MusicAtmosphereDetailField
            hostApi={input.hostApi}
            primary={palette.dark.primary}
            secondary={palette.dark.secondary}
            tertiary={palette.dark.tertiary}
            luminance="dark"
            sourceLabel={track.title}
          />
        ),
      }
    : {
        label: "氛围色",
        value: coverUri ? "取色失败或未缓存" : "无封面",
      };

  return [
    { label: "歌名", value: track.title, copyText: track.title },
    {
      label: "艺人",
      value: track.artist || "未知艺人",
      copyText: track.artist || "未知艺人",
    },
    { label: "专辑", value: track.album || "无", copyText: track.album || "无" },
    { label: "平台", value: platform, copyText: platform },
    {
      label: "来源",
      value: isLocalSource ? "本地文件" : "在线云播",
    },
    {
      label: "页面",
      value: track.remoteRef?.pageUrl || "无",
      copyText: track.remoteRef?.pageUrl || undefined,
    },
    { label: "播放地址", value: playUrl, copyText: playUrl === "无" ? undefined : playUrl },
    {
      label: "本地文件",
      value: localAudioUri || "无",
      copyText: localAudioUri || undefined,
    },
    {
      label: "封面",
      value: coverUri || "无",
      copyText: coverUri || undefined,
    },
    {
      label: "歌词",
      value: resolveLyricsDetailValue(track),
      copyText: track.lyricsUri?.trim() || undefined,
    },
    atmosphereRow,
    { label: "应用数据目录", value: dataRoot, copyText: dataRoot === "—" ? undefined : dataRoot },
  ];
}

/**
 * ⌥⇧D / 旧「详情」soft-alias：切换公共详情壳（元数据含曲目行）。
 * 不再打开独立 openDetailSheet。
 */
export async function openMusicTrackDetailSheet(
  hostApi: WorkspaceAppHostApi,
  _trackId: string,
): Promise<void> {
  if (hostApi.ui.isTabPublicDetailOpen()) {
    hostApi.ui.closeTabPublicDetail();
    return;
  }
  hostApi.ui.openTabPublicDetail({
    appId: MUSIC_APP_ID,
    pane: "metadata",
  });
}
