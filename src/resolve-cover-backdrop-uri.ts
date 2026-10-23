// 场景：Music 封面 → 宿主 Image 可用 URI（优先可持久化 http/data）。
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import { coverUrlForHero } from "./cover-url-quality";

function isDirectImageUri(uri: string): boolean {
  return /^https?:\/\//.test(uri) || uri.startsWith("data:") || uri.startsWith("blob:");
}

/**
 * 解析可给宿主 Image 用的封面 URI。
 * http/data/blob 直接用；本地托管路径经 files.resolveObjectUrl。
 * 优先 coverUri 的 http 形态（可跨刷新持久化），其次才用已 resolve 的展示 URI。
 */
export async function resolveMusicCoverBackdropImageUri(input: {
  hostApi: WorkspaceAppHostApi;
  coverUri: string | null | undefined;
  displayUri?: string | null | undefined;
}): Promise<string | null> {
  const cover = input.coverUri?.trim() || null;
  const display = input.displayUri?.trim() || null;

  if (cover && /^https?:\/\//.test(cover)) {
    return coverUrlForHero(cover);
  }
  if (cover && cover.startsWith("data:")) {
    return cover;
  }
  if (display && isDirectImageUri(display)) {
    return coverUrlForHero(display);
  }
  if (cover && cover.startsWith("blob:")) {
    return cover;
  }
  if (cover && !isDirectImageUri(cover)) {
    try {
      return await input.hostApi.files.resolveObjectUrl(cover);
    } catch {
      return display && isDirectImageUri(display) ? display : null;
    }
  }
  return null;
}
