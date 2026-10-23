// 场景：曲目导出 ZIP / 物理删除三件套 + 侧栏删除同语义。
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import { MUSIC_APP_ID } from "../music-ids";
import { useMusicDemoStore, type DemoTrack } from "../store";
import {
  buildMusicTrackFileBase,
  downloadAndPersistTrackBundle,
  isMusicLocalPersistedUri,
  musicFileNameFromUri,
  readMusicDownloadBundle,
  resolveMusicLocalAudioUri,
  resolveMusicLyricsDisplayPath,
  type MusicDownloadBundleReport,
} from "./download-bundle";

function extensionOfUri(uri: string, fallback: string): string {
  const name = musicFileNameFromUri(uri);
  const match = name ? /\.([A-Za-z0-9]{1,8})$/.exec(name) : null;
  return match?.[1]?.toLowerCase() ?? fallback;
}

function collectManagedLocalUris(
  track: DemoTrack,
  bundle: MusicDownloadBundleReport | null,
  lyricsPath: string | null,
): string[] {
  const uris = new Set<string>();
  const push = (uri: string | null | undefined) => {
    const value = uri?.trim();
    if (value && isMusicLocalPersistedUri(value)) {
      uris.add(value);
    }
  };
  push(resolveMusicLocalAudioUri(track, bundle));
  push(track.coverUri);
  push(bundle?.coverUri);
  push(lyricsPath);
  push(bundle?.lyricsUri);
  return [...uris];
}

export async function exportMusicTrackZip(
  hostApi: WorkspaceAppHostApi,
  trackId: string,
): Promise<{ path: string; entryCount: number }> {
  let track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error("曲目不存在");
  }

  let bundle = await readMusicDownloadBundle(hostApi, trackId);
  let audioUri = resolveMusicLocalAudioUri(track, bundle);
  if (!audioUri) {
    await downloadAndPersistTrackBundle(hostApi, trackId, {
      playableUrl: track.sourceUri && /^https?:\/\//.test(track.sourceUri) ? track.sourceUri : null,
      force: true,
    });
    track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
    if (!track) {
      throw new Error("曲目不存在");
    }
    bundle = await readMusicDownloadBundle(hostApi, trackId);
    audioUri = resolveMusicLocalAudioUri(track, bundle);
  }
  if (!audioUri) {
    throw new Error("没有可导出的本地音源，请先「更新资源」");
  }

  const lyricsPath = await resolveMusicLyricsDisplayPath(hostApi, track, bundle);
  bundle = await readMusicDownloadBundle(hostApi, trackId);
  const coverUri =
    (bundle?.coverUri && isMusicLocalPersistedUri(bundle.coverUri) ? bundle.coverUri : null) ||
    (track.coverUri && isMusicLocalPersistedUri(track.coverUri) ? track.coverUri : null);

  const base = buildMusicTrackFileBase(track);
  const entries: { name: string; uri: string }[] = [
    { name: `${base}.${extensionOfUri(audioUri, "mp3")}`, uri: audioUri },
  ];
  if (coverUri) {
    entries.push({ name: `${base}.${extensionOfUri(coverUri, "jpg")}`, uri: coverUri });
  }
  if (lyricsPath) {
    entries.push({ name: `${base}.lrc`, uri: lyricsPath });
  }

  const result = await hostApi.files.exportZip({
    title: "选择导出目录",
    fileName: `${base}.zip`,
    entries,
  });
  if (!result) {
    throw new Error("已取消导出");
  }
  return { path: result.path, entryCount: result.entryCount };
}

/**
 * 物理删除音源/封面/歌词（apps/data 内）+ 清 download-bundle + 从列表移除。
 * 侧栏「删除曲目」与播放器「删除」必须共用此函数。
 */
export async function deleteMusicTrackCompletely(
  hostApi: WorkspaceAppHostApi,
  trackId: string,
): Promise<boolean> {
  const track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    return false;
  }
  const bundle = await readMusicDownloadBundle(hostApi, trackId);
  const lyricsPath =
    bundle?.lyricsUri && isMusicLocalPersistedUri(bundle.lyricsUri) ? bundle.lyricsUri : null;
  const uris = collectManagedLocalUris(track, bundle, lyricsPath);
  if (uris.length > 0) {
    await hostApi.files.deleteUris(uris).catch(() => ({ deleted: [], skipped: uris }));
  }
  await hostApi.storage.writeJson(MUSIC_APP_ID, `download-bundle.${trackId}`, null).catch(() => {
    // ignore
  });
  return useMusicDemoStore.getState().deleteTrack(trackId);
}
