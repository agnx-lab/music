// 场景：云端点播可靠性 — 直链失败时按歌名跨源换链，并对齐用户可读错误文案。
import { searchPlayableMusic } from "./service";
import type { ResolvedPlayable } from "./types";
import { isMusicPlayInterruptedError } from "../playback-engine";

const PROVIDER_PRIORITY = [
  "qq",
  "netease",
  "kuwo",
  "kugou",
  "aiguo",
  "audiocom",
  "muzvox",
  "pixabay",
  "soundstripe",
  "migu",
  "bilibili",
] as const;

export function formatMusicPlaybackError(error: unknown, options?: { cloud?: boolean }): string {
  if (isMusicPlayInterruptedError(error)) {
    return "";
  }
  let raw = "";
  if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === "string") {
    raw = error;
  }
  const lower = raw.toLowerCase();
  if (
    lower.includes("no supported source") ||
    lower.includes("no supported sources") ||
    lower.includes("notsupportederror") ||
    lower.includes("format is not supported") ||
    lower.includes("demuxer") ||
    lower.includes("media_err_src_not_supported")
  ) {
    return options?.cloud
      ? "云端音源暂时无法播放，正在尝试其他来源…"
      : "无法播放该音频（格式或地址不受支持）";
  }
  if (lower.includes("network") || lower.includes("failed to fetch") || lower.includes("load")) {
    return options?.cloud
      ? "云端音源加载失败，正在尝试其他来源…"
      : "音频加载失败，请检查网络或文件";
  }
  if (options?.cloud) {
    return "云端音源暂时无法播放，可尝试更新资源或其他版本";
  }
  return raw.trim() || "无法播放该文件";
}

export function cloudPlaybackGaveUpMessage(): string {
  return "云端音源暂时无法播放，可尝试「更新资源」或其他搜索结果";
}

function providerRank(providerId: string): number {
  const index = (PROVIDER_PRIORITY as readonly string[]).indexOf(providerId);
  return index >= 0 ? index : PROVIDER_PRIORITY.length + 1;
}

/** 按歌名/艺人向聚合源再搜一轮，收集可换直链（排除已失败 URL）。 */
export async function findCloudPlayableAlternates(input: {
  title: string;
  artist?: string | null;
  excludeUrls?: Iterable<string>;
  preferProviderId?: string | null;
  limit?: number;
}): Promise<ResolvedPlayable[]> {
  const title = input.title.trim();
  if (!title) {
    return [];
  }
  const artist = (input.artist ?? "").trim();
  const exclude = new Set(
    [...(input.excludeUrls ?? [])].map((item) => item.trim()).filter(Boolean),
  );
  const queryText = artist ? `${title} ${artist}` : title;
  const page = await searchPlayableMusic({
    text: queryText,
    scope: "track",
    limit: 24,
  });
  const titleLower = title.toLowerCase();
  const artistLower = artist.toLowerCase();
  const scored = page.tracks
    .filter((hit) => {
      const url = hit.playableUrl?.trim();
      if (!url || exclude.has(url)) {
        return false;
      }
      if (
        hit.title.trim().toLowerCase() !== titleLower &&
        !hit.title.toLowerCase().includes(titleLower)
      ) {
        // 允许包含关系，但完全无关的丢掉
        if (!titleLower.includes(hit.title.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    })
    .map((hit) => {
      let score = 0;
      if (hit.title.trim().toLowerCase() === titleLower) {
        score += 8;
      } else if (hit.title.toLowerCase().includes(titleLower)) {
        score += 4;
      }
      if (artistLower && hit.artist.toLowerCase().includes(artistLower)) {
        score += 4;
      }
      if (input.preferProviderId && hit.ref.providerId === input.preferProviderId) {
        score -= 2; // 刚失败的同平台略降权，优先换源
      }
      score -= providerRank(hit.ref.providerId) * 0.1;
      return { hit, score };
    })
    .sort((left, right) => right.score - left.score);

  const limit = Math.max(1, Math.min(input.limit ?? 6, 12));
  const seen = new Set<string>();
  const result: ResolvedPlayable[] = [];
  for (const item of scored) {
    const url = item.hit.playableUrl?.trim();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    result.push({
      url,
      providerId: item.hit.ref.providerId,
      remoteId: item.hit.ref.remoteId,
    });
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}
