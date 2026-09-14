// 场景：P4 短 appId 迁移 — 注册/存储用宿主注入的 scan appId，packaged 为 music、同捆仍为 legacy。
import type { WorkspaceAppHostApi } from "@getagnx/app-sdk";
import { MUSIC_APP_ID, MUSIC_LEGACY_APP_ID } from "./music-ids";

let runtimeAppId = MUSIC_APP_ID;

export function setMusicRuntimeAppId(appId: string): void {
  const trimmed = appId.trim();
  runtimeAppId = trimmed || MUSIC_APP_ID;
}

export function getMusicRuntimeAppId(): string {
  return runtimeAppId;
}

export function bindMusicRuntimeAppIdFromHost(host: WorkspaceAppHostApi): void {
  setMusicRuntimeAppId(host.appId?.trim() || MUSIC_APP_ID);
}

/** storage readJson 失败或空文档时尝试的另一 appId（迁盘 data 目录）。 */
export function getMusicLegacyStorageAppId(): string | null {
  const current = getMusicRuntimeAppId();
  if (current === MUSIC_APP_ID) {
    return MUSIC_LEGACY_APP_ID;
  }
  if (current === MUSIC_LEGACY_APP_ID) {
    return MUSIC_APP_ID;
  }
  return null;
}

export function resetMusicRuntimeAppIdForTests(): void {
  runtimeAppId = MUSIC_APP_ID;
}
