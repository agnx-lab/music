// 场景：Music 宿主媒体能力注入 — Range 代理与隐藏浏览器截流（由 registerMusicApp 绑定）。
export interface MusicMediaProxyResult {
  proxyUrl: string;
  id: string;
}

export interface MusicBrowserCaptureInput {
  pageUrl?: string;
  preset?: "pixabay-music-search" | "soundstripe-library-search" | "soundstripe-home" | "none";
  query?: string;
  clickButtonText?: string;
  timeoutMs?: number;
  /** 只刮列表、不点播放（搜索多结果） */
  listOnly?: boolean;
  /** 搜索结果页码（1 起） */
  page?: number;
}

export interface MusicBrowserCaptureTrack {
  title: string;
  artist?: string;
  pageUrl?: string;
  mediaUrl?: string;
  coverUrl?: string;
  durationMs?: number;
}

export interface MusicBrowserCaptureResult {
  mediaUrls: string[];
  tracks?: MusicBrowserCaptureTrack[];
  finalUrl: string;
  title: string;
  preset: string;
  pageHint?: string;
  hasMore?: boolean;
  page?: number;
}

type CreateMediaProxyUrl = (input: {
  url: string;
  referer?: string;
}) => Promise<MusicMediaProxyResult>;

type CaptureBrowserMedia = (input: MusicBrowserCaptureInput) => Promise<MusicBrowserCaptureResult>;

let createMediaProxyUrlImpl: CreateMediaProxyUrl | null = null;
let captureBrowserMediaImpl: CaptureBrowserMedia | null = null;

export function setMusicHostMediaApis(input: {
  createMediaProxyUrl?: CreateMediaProxyUrl | null;
  captureBrowserMedia?: CaptureBrowserMedia | null;
}): void {
  createMediaProxyUrlImpl = input.createMediaProxyUrl ?? null;
  captureBrowserMediaImpl = input.captureBrowserMedia ?? null;
}

/** 云端 http(s) 播放前换成本机 Range 代理；无宿主能力时原样返回。 */
export async function resolveMusicPlayableSrc(
  url: string,
  options?: { referer?: string },
): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed) || !createMediaProxyUrlImpl) {
    return trimmed;
  }
  // 已是本机代理则不再套娃
  if (/^http:\/\/127\.0\.0\.1:\d+\/p\//i.test(trimmed)) {
    return trimmed;
  }
  try {
    const proxied = await createMediaProxyUrlImpl({
      url: trimmed,
      referer: options?.referer,
    });
    return proxied.proxyUrl || trimmed;
  } catch {
    return trimmed;
  }
}

export async function captureMusicBrowserMedia(
  input: MusicBrowserCaptureInput,
): Promise<MusicBrowserCaptureResult> {
  if (!captureBrowserMediaImpl) {
    throw new Error("当前宿主不支持隐藏浏览器截流（需要桌面 Electron）");
  }
  return captureBrowserMediaImpl(input);
}

export function hasMusicBrowserCapture(): boolean {
  return captureBrowserMediaImpl != null;
}
