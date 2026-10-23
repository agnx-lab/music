// 场景：Music Sub App 宿主 API 单点存取，避免 player ↔ search 互相 import 成环。
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";

let hostApi: WorkspaceAppHostApi | null = null;

export function setMusicHostApi(next: WorkspaceAppHostApi): void {
  hostApi = next;
}

export function resetMusicHostApi(): void {
  hostApi = null;
}

export function getMusicHostApi(): WorkspaceAppHostApi {
  if (!hostApi) {
    throw new Error("Music mini-app is not activated");
  }
  return hostApi;
}

export function tryGetMusicHostApi(): WorkspaceAppHostApi | null {
  return hostApi;
}
