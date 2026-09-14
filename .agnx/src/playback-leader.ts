// 场景：跨端「音频焦点」— 播放态各端本地；另一端开始播时仅通知本端静音，不同步曲目/进度。
import type { WorkspaceAppHostApi, WorkspaceAppSyncApi } from "@getagnx/app-sdk";

export const MUSIC_PLAYBACK_FOCUS_CHANNEL = "music-playback-focus";

import { MUSIC_APP_ID } from "./music-ids";

let localClientId: string | null = null;
let localClientIdPromise: Promise<string | null> | null = null;

export function resetMusicPlaybackLeaderForTests(): void {
  localClientId = null;
  localClientIdPromise = null;
}

export function setLocalPlaybackClientIdForTests(clientId: string | null): void {
  localClientId = clientId;
}

export function initMusicPlaybackLeader(host: WorkspaceAppHostApi): void {
  if (localClientIdPromise) {
    return;
  }
  localClientIdPromise = (async () => {
    try {
      const id = await host.connection?.getClientId?.();
      localClientId = typeof id === "string" && id.trim() ? id.trim() : null;
    } catch {
      localClientId = null;
    }
    return localClientId;
  })();
}

export function whenLocalPlaybackClientIdReady(): Promise<string | null> {
  if (localClientId) {
    return Promise.resolve(localClientId);
  }
  return localClientIdPromise ?? Promise.resolve(null);
}

export function getLocalPlaybackClientId(): string | null {
  return localClientId;
}

/** 本端开始出声前广播焦点，让其它客户端静音本地 Audio（不改各自本地播放态落盘）。 */
export async function publishMusicPlaybackFocusClaim(
  sync: WorkspaceAppSyncApi | null | undefined,
): Promise<void> {
  const clientId = await whenLocalPlaybackClientIdReady();
  if (!clientId || !sync) {
    return;
  }
  sync.publish({
    appId: MUSIC_APP_ID,
    channel: MUSIC_PLAYBACK_FOCUS_CHANNEL,
    revision: Date.now(),
    payload: { clientId },
  });
}

export function shouldHandleRemotePlaybackFocusClaim(
  publisherClientId: string | undefined,
): boolean {
  const publisher = publisherClientId?.trim();
  if (!publisher) {
    return false;
  }
  const local = getLocalPlaybackClientId();
  return Boolean(local && publisher !== local);
}
