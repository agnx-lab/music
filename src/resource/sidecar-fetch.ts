// 场景：Music HTTP JSON — 优先走宿主代理，避免 Electron 渲染进程 CORS。
export interface MusicHttpFetchInit {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

let fetchJsonImpl: ((url: string, init?: MusicHttpFetchInit) => Promise<unknown>) | null = null;

export function setMusicSidecarFetchJson(
  impl: ((url: string, init?: MusicHttpFetchInit) => Promise<unknown>) | null,
): void {
  fetchJsonImpl = impl;
}

export async function fetchMusicSidecarJson(
  url: string,
  init?: MusicHttpFetchInit,
): Promise<unknown> {
  if (fetchJsonImpl) {
    return fetchJsonImpl(url, init);
  }
  const method = init?.method ?? "GET";
  const response = await fetch(url, {
    method,
    headers: init?.headers,
    body: method === "GET" ? undefined : init?.body,
  });
  let body: unknown = null;
  if (typeof response.text === "function") {
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = { raw: text };
      }
    }
  } else if (typeof response.json === "function") {
    body = await response.json();
  }
  if (!response.ok) {
    if (body && typeof body === "object" && "code" in (body as Record<string, unknown>)) {
      return body;
    }
    throw new Error(`Sidecar request failed: ${response.status}`);
  }
  return body;
}
