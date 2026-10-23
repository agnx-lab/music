// 场景：Music sidecar 基址解析 — 环境变量 / runtime 注入 / dev 本机探测。
declare const __DEV__: boolean | undefined;

import { fetchMusicSidecarJson } from "./sidecar-fetch";

const DEV_PROBE_BASE_URL = "http://127.0.0.1:8080";
/** 探测失败后多久再试，避免一次失败把整次会话永久关掉。 */
const DEV_PROBE_RETRY_MS = 15_000;

let discoveredDevBaseUrl: string | null | undefined;
let discoveredDevBaseUrlAt = 0;

export function getMusicSidecarBaseUrlSync(): string | null {
  const runtimeUrl =
    typeof globalThis === "object" &&
    "AGNX_MUSIC_SIDECAR_URL" in globalThis &&
    typeof globalThis.AGNX_MUSIC_SIDECAR_URL === "string"
      ? globalThis.AGNX_MUSIC_SIDECAR_URL
      : null;
  const envUrl =
    typeof process !== "undefined" &&
    typeof process.env?.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL === "string"
      ? process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL
      : null;
  const baseUrl = (runtimeUrl ?? envUrl ?? "").trim();
  return baseUrl ? baseUrl.replace(/\/+$/, "") : null;
}

async function probeDevSidecarBaseUrl(): Promise<string | null> {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return null;
  }
  try {
    const payload = await fetchMusicSidecarJson(
      `${DEV_PROBE_BASE_URL}/api/v1/music/search?q=ping&type=song&limit=1`,
    );
    return payload && typeof payload === "object" ? DEV_PROBE_BASE_URL : null;
  } catch {
    return null;
  }
}

/** 解析 sidecar 基址；dev 下未显式配置时会探测本机 8080。 */
export async function getMusicSidecarBaseUrl(): Promise<string | null> {
  const configured = getMusicSidecarBaseUrlSync();
  if (configured) {
    return configured;
  }
  const now = Date.now();
  if (discoveredDevBaseUrl !== undefined) {
    // 成功结果可长期复用；失败结果到期后重探。
    if (discoveredDevBaseUrl != null || now - discoveredDevBaseUrlAt < DEV_PROBE_RETRY_MS) {
      return discoveredDevBaseUrl;
    }
  }
  discoveredDevBaseUrl = await probeDevSidecarBaseUrl();
  discoveredDevBaseUrlAt = now;
  return discoveredDevBaseUrl;
}

export function clearMusicSidecarBaseUrlCache(): void {
  discoveredDevBaseUrl = undefined;
  discoveredDevBaseUrlAt = 0;
}

export function isMusicSidecarConfiguredSync(): boolean {
  return getMusicSidecarBaseUrlSync() != null;
}
