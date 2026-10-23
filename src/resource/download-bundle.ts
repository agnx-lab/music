// 场景：把可播直链 / 封面 / 歌词真实下载到 apps/data，写入曲目与 download-bundle 清单。
import type { WorkspaceAppHostApi, WorkspaceAppManagedFile } from "@agnx-lab/app-sdk";
import { runWithMusicHostTask } from "../host-feedback";
import { ensureTrackAtmospherePalette } from "../extract-cover-atmosphere";
import { MUSIC_APP_ID } from "../music-ids";
import { type DemoTrack, useMusicDemoStore } from "../store";
import { fetchMusicLyrics, resolveMusicPlayable } from "./service";
import { resolveMusicPlayableSrc } from "./host-media";
import { lyricsLikelyBelongToTrack } from "./txqq-provider";
import type { RemoteRef } from "./types";
import { coverUrlForStorage } from "../cover-url-quality";
import { getMusicProviderReferer } from "./provider-catalog";

export interface MusicDownloadBundleReport {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  remoteRef: DemoTrack["remoteRef"];
  sourceUri: string;
  sourceByteSize: number;
  coverUri: string | null;
  coverByteSize: number | null;
  lyricsUri: string | null;
  lyricsByteSize: number | null;
  lyrics: string | null;
  savedAt: number;
}

function sanitizeFileBase(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return cleaned.slice(0, 80) || "track";
}

function textToDataUrl(text: string, mimeType: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function isHttpUri(uri: string | null | undefined): boolean {
  return typeof uri === "string" && /^https?:\/\//.test(uri);
}

function isLocalPersistedUri(uri: string | null | undefined): boolean {
  return typeof uri === "string" && uri.length > 0 && !isHttpUri(uri) && !uri.startsWith("blob:");
}

/** 路径 / URL 取文件名（详情展示用）。 */
export function musicFileNameFromUri(uri: string | null | undefined): string | null {
  if (!uri?.trim()) {
    return null;
  }
  const cleaned = uri.trim().split(/[?#]/)[0] ?? "";
  const parts = cleaned.split(/[/\\]/).filter(Boolean);
  const name = parts[parts.length - 1]?.trim();
  return name || null;
}

export function buildMusicTrackFileBase(track: Pick<DemoTrack, "title" | "artist">): string {
  return sanitizeFileBase(`${track.title}-${track.artist || "unknown"}`);
}

/** 读 download-bundle 清单（不要求当前 sourceKind 已是 local）。 */
export async function readMusicDownloadBundle(
  hostApi: WorkspaceAppHostApi,
  trackId: string,
): Promise<MusicDownloadBundleReport | null> {
  try {
    const existing = (await hostApi.storage.readJson(
      MUSIC_APP_ID,
      `download-bundle.${trackId}`,
    )) as MusicDownloadBundleReport | null;
    if (existing?.trackId === trackId && existing.sourceUri) {
      return existing;
    }
  } catch {
    // ignore
  }
  return null;
}

/** 详情「本地文件」：优先当前本地音源，否则清单里的落盘路径。 */
export function resolveMusicLocalAudioUri(
  track: DemoTrack,
  bundle: MusicDownloadBundleReport | null,
): string | null {
  if (isLocalPersistedUri(track.sourceUri)) {
    return track.sourceUri;
  }
  if (bundle && isLocalPersistedUri(bundle.sourceUri)) {
    return bundle.sourceUri;
  }
  return null;
}

/**
 * 若 download-bundle 已有落盘文件，但 store 被云端 URL 盖掉，则恢复为本地播放。
 * 返回是否写回了 store。
 */
export async function restoreTrackFromDownloadBundleIfNeeded(
  hostApi: WorkspaceAppHostApi,
  trackId: string,
): Promise<boolean> {
  const track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    return false;
  }
  if (isLocalPersistedUri(track.sourceUri) && track.sourceKind === "local") {
    return false;
  }
  const bundle = await readMusicDownloadBundle(hostApi, trackId);
  if (!bundle || !isLocalPersistedUri(bundle.sourceUri)) {
    return false;
  }
  useMusicDemoStore.getState().updateTrack(trackId, {
    sourceUri: bundle.sourceUri,
    sourceKind: "local",
    coverUri: bundle.coverUri ?? track.coverUri,
    lyrics: bundle.lyrics ?? track.lyrics,
  });
  return true;
}

export function isMusicLocalPersistedUri(uri: string | null | undefined): boolean {
  return isLocalPersistedUri(uri);
}

/**
 * 详情「歌词」行：有落盘文件则返回完整路径；仅有内存文本时写入一次 .lrc 并固化 lyricsUri。
 */
export async function resolveMusicLyricsDisplayPath(
  hostApi: WorkspaceAppHostApi,
  track: DemoTrack,
  bundle: MusicDownloadBundleReport | null,
): Promise<string | null> {
  const fromBundle = bundle?.lyricsUri?.trim();
  if (fromBundle && isLocalPersistedUri(fromBundle)) {
    if (track.lyricsUri !== fromBundle) {
      useMusicDemoStore.getState().updateTrack(track.id, { lyricsUri: fromBundle });
    }
    return fromBundle;
  }
  const fromTrack = track.lyricsUri?.trim();
  if (fromTrack && isLocalPersistedUri(fromTrack)) {
    return fromTrack;
  }
  const text = (bundle?.lyrics || track.lyrics || "").trim();
  if (!text) {
    return null;
  }
  const baseName = buildMusicTrackFileBase(track);
  const file = await hostApi.files
    .importFromUrl({
      appId: MUSIC_APP_ID,
      url: textToDataUrl(text, "text/plain;charset=utf-8"),
      title: `${track.title} 歌词`,
      fileName: `${baseName}.lrc`,
      mimeType: "text/plain",
    })
    .catch(() => null);
  const uri = file?.uri?.trim();
  if (!uri || !isLocalPersistedUri(uri)) {
    return null;
  }
  useMusicDemoStore.getState().updateTrack(track.id, {
    lyricsUri: uri,
    lyrics: text,
  });
  if (bundle) {
    const next: MusicDownloadBundleReport = {
      ...bundle,
      lyricsUri: uri,
      lyricsByteSize: file?.byteSize ?? bundle.lyricsByteSize,
      lyrics: text,
      savedAt: Date.now(),
    };
    await hostApi.storage.writeJson(MUSIC_APP_ID, `download-bundle.${track.id}`, next).catch(() => {
      // ignore
    });
  }
  return uri;
}

async function importRequired(
  hostApi: WorkspaceAppHostApi,
  input: {
    url: string;
    title: string;
    fileName: string;
    mimeType?: string;
  },
): Promise<WorkspaceAppManagedFile> {
  const file = await hostApi.files.importFromUrl({
    appId: MUSIC_APP_ID,
    url: input.url,
    title: input.title,
    fileName: input.fileName,
    mimeType: input.mimeType,
  });
  if (!file.uri || (typeof file.byteSize === "number" && file.byteSize <= 0)) {
    throw new Error(`落盘失败：${input.title}`);
  }
  return file;
}

async function resolveAudioSource(
  track: DemoTrack,
  playableUrl: string | null | undefined,
): Promise<{ url: string; ext: string }> {
  let audioUrl = playableUrl?.trim() || "";
  let audioExt = "mp3";
  if (!audioUrl && isHttpUri(track.sourceUri)) {
    audioUrl = track.sourceUri!;
  }
  if (!audioUrl) {
    if (!track.remoteRef) {
      throw new Error("没有可下载地址");
    }
    const resolved = await resolveMusicPlayable(track.remoteRef);
    if (!resolved?.url) {
      throw new Error("解析不到可下载地址");
    }
    return { url: resolved.url, ext: resolved.ext ?? "mp3" };
  }
  const match = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(audioUrl);
  if (match?.[1]) {
    audioExt = match[1].toLowerCase();
  }
  return { url: audioUrl, ext: audioExt };
}

async function maybeProxyDownloadUrl(url: string, track: DemoTrack): Promise<string> {
  const providerId = track.remoteRef?.providerId;
  const referer = getMusicProviderReferer(providerId);
  if (referer) {
    return resolveMusicPlayableSrc(url, { referer });
  }
  return url;
}

async function downloadOptionalCover(
  hostApi: WorkspaceAppHostApi,
  track: DemoTrack,
  baseName: string,
): Promise<WorkspaceAppManagedFile | null> {
  const coverSource = track.coverUri ?? null;
  if (!isHttpUri(coverSource)) {
    return null;
  }
  // 落盘用原图清晰度，避免把搜索缩略图（如 ?param=300x300）写成永久封面。
  const hiResSource = coverUrlForStorage(coverSource);
  const url = await maybeProxyDownloadUrl(hiResSource, track).catch(() => hiResSource);
  return hostApi.files
    .importFromUrl({
      appId: MUSIC_APP_ID,
      url,
      title: `${track.title} 封面`,
      fileName: `${baseName}-cover.jpg`,
    })
    .catch(() => null);
}

async function persistAtmosphereAfterCoverDownload(
  trackId: string,
  coverUri: string | null,
): Promise<void> {
  const coverForExtract = coverUri?.trim() || null;
  if (!coverForExtract || coverForExtract.startsWith("blob:")) {
    return;
  }
  try {
    await ensureTrackAtmospherePalette({
      trackId,
      coverKeyUri: coverForExtract,
      extractUri: coverForExtract,
    });
  } catch {
    // 取色失败不挡下载
  }
}

async function downloadFreshBundle(
  hostApi: WorkspaceAppHostApi,
  track: DemoTrack,
  playableUrl: string | null | undefined,
): Promise<MusicDownloadBundleReport> {
  const baseName = sanitizeFileBase(`${track.title}-${track.artist || "unknown"}`);
  const audio = await resolveAudioSource(track, playableUrl);
  const audioDownloadUrl = await maybeProxyDownloadUrl(audio.url, track);
  const audioFile = await importRequired(hostApi, {
    url: audioDownloadUrl,
    title: `${track.title} - ${track.artist || "未知艺人"}`,
    fileName: `${baseName}.${audio.ext}`,
    mimeType: audio.ext === "flac" ? "audio/flac" : undefined,
  });
  if (!audioFile.byteSize || audioFile.byteSize <= 0) {
    throw new Error("音频落盘为空，拒绝标记为已保存");
  }

  const [coverFile, lyricsResult] = await Promise.all([
    downloadOptionalCover(hostApi, track, baseName),
    downloadOptionalLyrics(hostApi, {
      remoteRef: track.remoteRef,
      track,
      baseName,
    }),
  ]);

  const coverUri = resolveCoverUri(coverFile, track.coverUri ?? null);
  useMusicDemoStore.getState().updateTrack(track.id, {
    sourceUri: audioFile.uri,
    sourceKind: "local",
    coverUri,
    lyrics: lyricsResult.lyrics,
    lyricsUri: lyricsResult.file?.uri ?? track.lyricsUri ?? null,
  });

  const report: MusicDownloadBundleReport = {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album ?? "",
    remoteRef: track.remoteRef ?? null,
    sourceUri: audioFile.uri,
    sourceByteSize: audioFile.byteSize,
    coverUri,
    coverByteSize: coverFile?.byteSize ?? null,
    lyricsUri: lyricsResult.file?.uri ?? null,
    lyricsByteSize: lyricsResult.file?.byteSize ?? null,
    lyrics: lyricsResult.lyrics ?? null,
    savedAt: Date.now(),
  };
  await hostApi.storage.writeJson(MUSIC_APP_ID, `download-bundle.${track.id}`, report);
  await persistAtmosphereAfterCoverDownload(track.id, coverUri);
  return report;
}

async function downloadOptionalLyrics(
  hostApi: WorkspaceAppHostApi,
  input: {
    remoteRef: RemoteRef | null | undefined;
    track: DemoTrack;
    baseName: string;
  },
): Promise<{ lyrics: string | null; file: WorkspaceAppManagedFile | null }> {
  const fetched = input.remoteRef ? await fetchMusicLyrics(input.remoteRef) : null;
  let lyrics = input.track.lyrics ?? null;
  const fetchedText = fetched?.text?.trim() ?? "";
  if (fetchedText && lyricsLikelyBelongToTrack(fetchedText, input.track.title)) {
    lyrics = fetchedText;
  } else if (fetchedText || (lyrics && !lyricsLikelyBelongToTrack(lyrics, input.track.title))) {
    // 拉到的词校验失败，或旧词已串台：不落脏歌词
    lyrics = null;
  }
  if (fetched?.fileUrl && lyrics) {
    const file = await hostApi.files
      .importFromUrl({
        appId: MUSIC_APP_ID,
        url: fetched.fileUrl,
        title: `${input.track.title} 歌词`,
        fileName: `${input.baseName}.lrc`,
        mimeType: "text/plain",
      })
      .catch(() => null);
    return { lyrics, file };
  }
  if (lyrics?.trim()) {
    const file = await hostApi.files
      .importFromUrl({
        appId: MUSIC_APP_ID,
        url: textToDataUrl(lyrics, "text/plain;charset=utf-8"),
        title: `${input.track.title} 歌词`,
        fileName: `${input.baseName}.lrc`,
        mimeType: "text/plain",
      })
      .catch(() => null);
    return { lyrics, file };
  }
  return { lyrics, file: null };
}

async function readExistingBundle(
  hostApi: WorkspaceAppHostApi,
  track: DemoTrack,
): Promise<MusicDownloadBundleReport | null> {
  if (track.sourceKind !== "local" || !isLocalPersistedUri(track.sourceUri)) {
    return null;
  }
  const existing = (await hostApi.storage.readJson(
    MUSIC_APP_ID,
    `download-bundle.${track.id}`,
  )) as MusicDownloadBundleReport | null;
  if (existing?.sourceUri === track.sourceUri && existing.sourceByteSize > 0) {
    return existing;
  }
  return null;
}

function resolveCoverUri(
  coverFile: WorkspaceAppManagedFile | null,
  coverSource: string | null,
): string | null {
  if (coverFile?.uri) {
    return coverFile.uri;
  }
  if (coverSource && !isHttpUri(coverSource)) {
    return coverSource;
  }
  return null;
}

/**
 * 下载整套资源到本地。音频必须成功；封面/歌词尽力而为。
 * 成功后 track.sourceUri 为本地路径、sourceKind=local。
 * `force: true` 时忽略已有清单，重新拉取并覆盖写入。
 */
export async function downloadAndPersistTrackBundle(
  hostApi: WorkspaceAppHostApi,
  trackId: string,
  options?: { playableUrl?: string | null; force?: boolean },
): Promise<MusicDownloadBundleReport> {
  const track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error("曲目不存在");
  }
  if (!options?.force) {
    const existing = await readExistingBundle(hostApi, track);
    if (existing) {
      return existing;
    }
  }
  return runWithMusicHostTask(
    hostApi,
    {
      title: "下载曲目",
      message: `${track.title}${track.artist ? ` · ${track.artist}` : ""}`,
      notifyOnSuccess: {
        title: "已保存到本地",
        message: track.title,
      },
      notifyOnError: true,
    },
    async (report) => {
      report({ message: "下载音频…" });
      const result = await downloadFreshBundle(hostApi, track, options?.playableUrl);
      report({ message: "写入清单…", value: 1, total: 1 });
      return result;
    },
  );
}
