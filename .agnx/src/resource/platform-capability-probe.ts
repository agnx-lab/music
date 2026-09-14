// 场景：对 music.txqq.pro 做真实探测，产出各平台「搜歌/可播直链/下载字节/封面/歌词」能力矩阵。
import type { SearchHitTrack } from "./types";

export const TXQQ_PROBE_ENDPOINT = "https://music.txqq.pro/";
export const TXQQ_PROBE_SOURCES = ["netease", "qq", "kugou", "kuwo"] as const;
export type TxqqProbeSource = (typeof TXQQ_PROBE_SOURCES)[number];

export interface PlatformCapabilityProbe {
  providerId: TxqqProbeSource;
  keyword: string;
  searchOk: boolean;
  hitCount: number;
  playableCount: number;
  sampleTitle: string | null;
  sampleArtist: string | null;
  hasCover: boolean;
  hasLyricsText: boolean;
  downloadOk: boolean;
  downloadBytes: number;
  downloadStatus: number | null;
  error: string | null;
}

interface TxqqSearchItem {
  type?: string;
  songid?: string | number;
  title?: string;
  author?: string;
  url?: string;
  pic?: string;
  lrc?: string;
}

async function postTxqqSearch(keyword: string, source: TxqqProbeSource): Promise<TxqqSearchItem[]> {
  const body = new URLSearchParams({
    input: keyword,
    filter: "name",
    type: source,
    page: "1",
  }).toString();
  const response = await fetch(TXQQ_PROBE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Origin: "https://music.txqq.pro",
      Referer: "https://music.txqq.pro/",
    },
    body,
  });
  const text = await response.text();
  let payload: { code?: number; data?: TxqqSearchItem[] };
  try {
    payload = JSON.parse(text) as { code?: number; data?: TxqqSearchItem[] };
  } catch {
    throw new Error(`txqq 非 JSON 响应 HTTP ${response.status}`);
  }
  if (payload.code !== 200 || !Array.isArray(payload.data)) {
    throw new Error(`txqq code=${String(payload.code)} empty`);
  }
  return payload.data;
}

function toPlayableHits(items: TxqqSearchItem[], source: TxqqProbeSource): SearchHitTrack[] {
  const hits: SearchHitTrack[] = [];
  for (const item of items) {
    const playableUrl = typeof item.url === "string" ? item.url.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const remoteId = String(item.songid ?? "").trim();
    if (!playableUrl || !title || !remoteId) {
      continue;
    }
    hits.push({
      kind: "track",
      ref: { providerId: source, remoteId },
      title,
      artist: typeof item.author === "string" ? item.author.trim() : "",
      coverUrl: typeof item.pic === "string" ? item.pic : undefined,
      playableUrl,
    });
  }
  return hits;
}

async function probeDownload(url: string): Promise<{ ok: boolean; bytes: number; status: number }> {
  const response = await fetch(url, {
    headers: { Referer: "https://music.txqq.pro/" },
  });
  const bytes = Buffer.from(await response.arrayBuffer()).byteLength;
  return {
    ok: response.ok && bytes >= 1000,
    bytes,
    status: response.status,
  };
}

/** 对单个平台做真实搜 + 可选首条可播直链下载探测。 */
export async function probeTxqqPlatformCapability(input: {
  source: TxqqProbeSource;
  keyword?: string;
  download?: boolean;
}): Promise<PlatformCapabilityProbe> {
  const keyword = input.keyword?.trim() || "晴天";
  const base: PlatformCapabilityProbe = {
    providerId: input.source,
    keyword,
    searchOk: false,
    hitCount: 0,
    playableCount: 0,
    sampleTitle: null,
    sampleArtist: null,
    hasCover: false,
    hasLyricsText: false,
    downloadOk: false,
    downloadBytes: 0,
    downloadStatus: null,
    error: null,
  };
  try {
    const raw = await postTxqqSearch(keyword, input.source);
    const playable = toPlayableHits(raw, input.source);
    base.searchOk = true;
    base.hitCount = raw.length;
    base.playableCount = playable.length;
    const sample = playable[0];
    const rawSample = raw.find((item) => {
      const url = typeof item.url === "string" ? item.url.trim() : "";
      return Boolean(url);
    });
    if (sample) {
      base.sampleTitle = sample.title;
      base.sampleArtist = sample.artist || null;
      base.hasCover = Boolean(sample.coverUrl);
    }
    if (typeof rawSample?.lrc === "string" && rawSample.lrc.trim().length > 0) {
      base.hasLyricsText = true;
    }
    if (input.download !== false && sample?.playableUrl) {
      const dl = await probeDownload(sample.playableUrl);
      base.downloadOk = dl.ok;
      base.downloadBytes = dl.bytes;
      base.downloadStatus = dl.status;
    }
    return base;
  } catch (error) {
    base.error = error instanceof Error ? error.message : String(error);
    return base;
  }
}

export async function probeAllTxqqPlatforms(input?: {
  keyword?: string;
  download?: boolean;
}): Promise<PlatformCapabilityProbe[]> {
  const results: PlatformCapabilityProbe[] = [];
  for (const source of TXQQ_PROBE_SOURCES) {
    results.push(
      await probeTxqqPlatformCapability({
        source,
        keyword: input?.keyword,
        download: input?.download,
      }),
    );
  }
  return results;
}

/** 把探测结果格式化成文档表格行（搜歌/可播/下载/歌词/封面/艺人）。 */
export function formatCapabilityTableRows(probes: PlatformCapabilityProbe[]): string[] {
  return probes.map((probe) => {
    let search = "❌";
    if (probe.searchOk) {
      search = probe.hitCount > 0 ? "✅" : "⚠️ 空";
    }
    const playable = probe.playableCount > 0 ? `✅ ${probe.playableCount}` : "❌";
    let download = "—";
    if (probe.downloadOk) {
      download = `✅ ${(probe.downloadBytes / 1024).toFixed(0)}KB`;
    } else if (probe.playableCount > 0) {
      download = "❌";
    }
    const lyrics = probe.hasLyricsText ? "✅" : "⚠️";
    const cover = probe.hasCover ? "✅" : "⚠️";
    const artist = probe.sampleArtist ? "✅" : "⚠️";
    let note = `可播 ${probe.playableCount}/${probe.hitCount}`;
    if (probe.error) {
      note = probe.error;
    } else if (probe.sampleTitle) {
      note = `样例「${probe.sampleTitle}」· 可播 ${probe.playableCount}/${probe.hitCount}`;
    }
    return `| \`${probe.providerId}\` | ${search} | — | — | — | ${playable} | ${download} | ${lyrics} | ${cover} | ${artist} | ${note} |`;
  });
}
