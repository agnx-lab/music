// 场景：开发态搜索调试 — 拼各源实际请求 URL / 官网对照页，供搜索结果红字卡片展示。
import type { SearchDebugRequest } from "./types";

/** 官网搜索页（人工对照，不一定是本应用实际请求） */
export function buildOfficialSearchCompareUrl(
  providerId: string,
  keyword: string,
): string | undefined {
  const q = keyword.trim();
  if (!q) {
    return undefined;
  }
  const encoded = encodeURIComponent(q);
  switch (providerId) {
    case "netease":
      return `https://music.163.com/#/search/m/?s=${encoded}`;
    case "qq":
      return `https://y.qq.com/n/ryqq/search?w=${encoded}`;
    case "kugou":
      return `https://www.kugou.com/yy/html/search.html#searchType=1&searchKeyWord=${encoded}`;
    case "kuwo":
      return `https://kuwo.cn/search/searchMusic?key=${encoded}`;
    case "pixabay":
      return buildPixabayMusicSearchUrl(q);
    case "muzvox":
      return buildMuzvoxMusicSearchUrl(keyword);
    case "audiocom":
      return buildAudiocomMusicSearchUrl(keyword);
    case "soundstripe":
      return buildSoundstripeLibrarySearchUrl(q);
    default:
      return undefined;
  }
}

export function buildMuzvoxMusicSearchUrl(keyword: string, page = 1): string {
  const q = keyword.trim() || "music";
  try {
    if (/^https?:\/\/(?:www\.)?muzvox\.org\//i.test(q)) {
      return q;
    }
  } catch {
    // fallthrough
  }
  void page; // 站点分页实测无效，保留参数兼容调用方
  return `https://muzvox.org/search/${encodeURIComponent(q)}`;
}

export function buildAudiocomMusicSearchUrl(keyword: string, page = 1): string {
  // 与 audiocom-provider 一致：API 必须用 query=，不能用 q=
  const q = keyword.trim() || "music";
  try {
    if (/^https?:\/\/(?:www\.)?audio\.com\//i.test(q)) {
      const url = new URL(q);
      const parts = url.pathname.split("/").filter(Boolean);
      const categoryIdx = parts.findIndex((part) => part === "category");
      if (categoryIdx >= 0 && parts[categoryIdx + 2]) {
        const term = decodeURIComponent(parts[categoryIdx + 2]!.replace(/[-_]+/g, " "));
        const pageNum = Math.max(1, Math.floor(page));
        const params = new URLSearchParams({ query: term, page: String(pageNum) });
        return `https://api.audio.com/search?${params.toString()}`;
      }
    }
  } catch {
    // fallthrough
  }
  const pageNum = Math.max(1, Math.floor(page));
  const params = new URLSearchParams({ query: q, page: String(pageNum) });
  return `https://api.audio.com/search?${params.toString()}`;
}

export function buildPixabayMusicSearchUrl(keyword: string, page = 1): string {
  const base = `https://pixabay.com/zh/music/search/${encodeURIComponent(keyword.trim() || "lofi")}/`;
  return page > 1 ? `${base}?pagi=${page}` : base;
}

export function buildSoundstripeLibrarySearchUrl(keyword: string, page = 1): string {
  const encoded = encodeURIComponent(keyword.trim() || "happy");
  const base = `https://www.soundstripe.com/library/royalty-free-music?filter%5Bq%5D=${encoded}`;
  return page > 1 ? `${base}&page=${page}` : base;
}

export function buildTxqqDebugRequest(input: {
  providerId: string;
  origin: string;
  keyword: string;
  page?: number;
}): SearchDebugRequest {
  const page = input.page ?? 1;
  const body = new URLSearchParams({
    input: input.keyword,
    filter: "name",
    type: input.providerId,
    page: String(page),
  }).toString();
  return {
    providerId: input.providerId,
    url: `POST ${input.origin}/ · ${body}`,
    note: `爬虫：聚合源 POST（${input.origin}）`,
  };
}

export function mergeSearchDebugRequests(
  ...groups: Array<SearchDebugRequest[] | undefined>
): SearchDebugRequest[] {
  const seen = new Set<string>();
  const merged: SearchDebugRequest[] = [];
  for (const group of groups) {
    for (const item of group ?? []) {
      const key = `${item.providerId}:${item.url}:${item.compareUrl ?? ""}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}
