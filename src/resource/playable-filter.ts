// 场景：搜索候选 → 可播验证 — 仅保留 resolver 能拿到直链的条目。
import type { RemoteRef, SearchHitTrack } from "./types";

export const PLAYABLE_VERIFY_CONCURRENCY = 4;
export const PLAYABLE_CANDIDATES_PER_PLATFORM = 6;
export const MAX_PLAYABLE_SEARCH_RESULTS = 24;

/** 按平台交错取样，避免先把配额花在某一侧 VIP 曲上。 */
export function pickPlayableVerifyCandidates(tracks: SearchHitTrack[]): SearchHitTrack[] {
  const byPlatform = new Map<string, SearchHitTrack[]>();
  for (const track of tracks) {
    if (track.localTrackId) {
      continue;
    }
    const platformId = track.ref.providerId;
    const bucket = byPlatform.get(platformId) ?? [];
    if (bucket.length >= PLAYABLE_CANDIDATES_PER_PLATFORM) {
      continue;
    }
    bucket.push(track);
    byPlatform.set(platformId, bucket);
  }
  const buckets = [...byPlatform.values()];
  const interleaved: SearchHitTrack[] = [];
  let index = 0;
  let added = true;
  while (added && interleaved.length < MAX_PLAYABLE_SEARCH_RESULTS * 2) {
    added = false;
    for (const bucket of buckets) {
      const item = bucket[index];
      if (item) {
        interleaved.push(item);
        added = true;
      }
    }
    index += 1;
  }
  return interleaved;
}

export async function verifyPlayableTracks(
  tracks: SearchHitTrack[],
  resolvePlayable: (ref: RemoteRef) => Promise<{ url: string } | null>,
): Promise<{ verified: SearchHitTrack[]; candidateCount: number }> {
  const localHits = tracks.filter((track) => track.localTrackId);
  const candidates = pickPlayableVerifyCandidates(tracks);
  const verified: SearchHitTrack[] = [...localHits];
  for (let index = 0; index < candidates.length; index += PLAYABLE_VERIFY_CONCURRENCY) {
    const batch = candidates.slice(index, index + PLAYABLE_VERIFY_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (track) => {
        try {
          const resolved = await resolvePlayable(track.ref);
          if (!resolved?.url) {
            return null;
          }
          return Object.assign({}, track, { playableUrl: resolved.url });
        } catch {
          return null;
        }
      }),
    );
    for (const item of settled) {
      if (item) {
        verified.push(item);
      }
    }
    if (verified.length >= MAX_PLAYABLE_SEARCH_RESULTS) {
      break;
    }
  }
  return {
    verified: verified.slice(0, MAX_PLAYABLE_SEARCH_RESULTS),
    candidateCount: candidates.length + localHits.length,
  };
}
