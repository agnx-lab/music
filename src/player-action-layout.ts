// 场景：播放器底栏曲目操作布局 — 与 track-menu 菜单项同源；布局与侧栏 item-menu 独立持久化。
// 搜索/音量为固定铬层，不进本表。曲目「详情」已并入 Tab 公共详情，不进 bar/overflow。
import type { WorkspaceAppActionBarLayout } from "@agnx-lab/app-sdk";
import {
  MUSIC_SIDEBAR_TRACK_MENU_IDS,
  MUSIC_TRACK_MENU_ACTION_LABELS,
  MUSIC_TRACK_MENU_CONTRIBUTION_IDS,
  resolveMusicTrackMenuActionId,
  type MusicTrackMenuActionId,
} from "./track-menu";

export type MusicPlayerActionId = Exclude<MusicTrackMenuActionId, "detail">;

export interface MusicPlayerActionLayout {
  bar: MusicPlayerActionId[];
  overflow: MusicPlayerActionId[];
  hidden: MusicPlayerActionId[];
  /**
   * 公共 ActionBarLayout.showBarLabels 透传。
   * 由宿主 ActionBar 消化渲染；业务勿再 if 分支。
   */
  showBarLabels?: boolean;
}

export const MUSIC_PLAYER_ACTION_IDS: MusicPlayerActionId[] = [
  ...(MUSIC_SIDEBAR_TRACK_MENU_IDS as readonly MusicPlayerActionId[]),
];

export const MUSIC_PLAYER_ACTION_LABELS: Record<MusicPlayerActionId, string> = {
  pin: MUSIC_TRACK_MENU_ACTION_LABELS.pin,
  addPlaylist: MUSIC_TRACK_MENU_ACTION_LABELS.addPlaylist,
  playNext: MUSIC_TRACK_MENU_ACTION_LABELS.playNext,
  share: MUSIC_TRACK_MENU_ACTION_LABELS.share,
  exportZip: MUSIC_TRACK_MENU_ACTION_LABELS.exportZip,
  refreshResources: MUSIC_TRACK_MENU_ACTION_LABELS.refreshResources,
  deleteTrack: MUSIC_TRACK_MENU_ACTION_LABELS.deleteTrack,
};

/** 已迁出为固定铬层、并入公共详情或历史废弃 id，写入曲目 actionLayout 时丢弃 */
const LEGACY_DROPPED_IDS = new Set([
  "dislike",
  "like",
  "bookmark",
  "saveLocal",
  "search",
  "volume",
  "detail",
]);

/** 默认外露 3 个高频：置顶 / 下一首 / 加入列表；其余进更多 */
export function getDefaultMusicPlayerActionLayout(): MusicPlayerActionLayout {
  return {
    bar: ["pin", "playNext", "addPlaylist"],
    overflow: ["share", "exportZip", "refreshResources", "deleteTrack"],
    hidden: [],
    showBarLabels: false,
  };
}

function asStringArray(list: unknown): string[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((item): item is string => typeof item === "string");
}

/** 含「详情」的旧默认 bar，或更旧的「加入列表外露」默认 → 迁到新默认 */
function shouldMigrateToDefaultLayout(
  rawBar: readonly string[],
  rawOverflow: readonly string[],
  rawHidden: readonly string[],
): boolean {
  if (rawHidden.length > 0) {
    return false;
  }
  // 置顶 / 详情 / 下一首
  if (
    rawBar.length === 3 &&
    rawBar[0] === "pin" &&
    rawBar[1] === "detail" &&
    rawBar[2] === "playNext"
  ) {
    return true;
  }
  // 置顶 / 加入列表 / 下一首（更旧默认）
  if (
    rawBar.length === 3 &&
    rawBar[0] === "pin" &&
    rawBar[1] === "addPlaylist" &&
    rawBar[2] === "playNext" &&
    rawOverflow[0] === "share" &&
    rawOverflow.includes("detail")
  ) {
    return true;
  }
  return false;
}

export function normalizeMusicPlayerActionLayout(
  raw: Partial<MusicPlayerActionLayout> | null | undefined,
): MusicPlayerActionLayout {
  const defaults = getDefaultMusicPlayerActionLayout();
  const rawBar = asStringArray(raw?.bar);
  const rawOverflow = asStringArray(raw?.overflow);
  const rawHidden = asStringArray(raw?.hidden);
  const known = new Set<string>(MUSIC_PLAYER_ACTION_IDS);

  const take = (list: readonly string[]): MusicPlayerActionId[] => {
    const out: MusicPlayerActionId[] = [];
    for (const item of list) {
      if (LEGACY_DROPPED_IDS.has(item) || !known.has(item)) {
        continue;
      }
      if (!out.includes(item as MusicPlayerActionId)) {
        out.push(item as MusicPlayerActionId);
      }
    }
    return out;
  };

  if (rawBar.length === 0 && rawOverflow.length === 0 && rawHidden.length === 0) {
    return defaults;
  }
  if (shouldMigrateToDefaultLayout(rawBar, rawOverflow, rawHidden)) {
    return {
      ...defaults,
      showBarLabels: raw?.showBarLabels ?? defaults.showBarLabels ?? false,
    };
  }

  const bar = take(rawBar);
  const overflow = take(rawOverflow);
  const hidden = take(rawHidden);

  if (bar.length === 0 && overflow.length === 0 && hidden.length === 0) {
    return defaults;
  }

  const seen = new Set<string>([...bar, ...overflow, ...hidden]);
  for (const id of MUSIC_PLAYER_ACTION_IDS) {
    if (!seen.has(id)) {
      overflow.push(id);
    }
  }

  return {
    bar,
    overflow,
    hidden,
    showBarLabels: raw?.showBarLabels ?? defaults.showBarLabels ?? false,
  };
}

export function moveMusicPlayerAction(
  layout: MusicPlayerActionLayout,
  id: MusicPlayerActionId,
  target: "bar" | "overflow" | "hidden",
): MusicPlayerActionLayout {
  const cleaned: MusicPlayerActionLayout = {
    bar: layout.bar.filter((item) => item !== id),
    overflow: layout.overflow.filter((item) => item !== id),
    hidden: layout.hidden.filter((item) => item !== id),
    showBarLabels: layout.showBarLabels,
  };
  if (target === "bar") {
    cleaned.bar.push(id);
  } else if (target === "overflow") {
    cleaned.overflow.push(id);
  } else {
    cleaned.hidden.push(id);
  }
  return normalizeMusicPlayerActionLayout(cleaned);
}

/**
 * 三点菜单曲目段：仅 overflow（bar 已外露、hidden 不出现）。
 */
export function resolveMusicPlayerChromeOverflowIds(
  layout: MusicPlayerActionLayout,
  _actionRailVisible: boolean,
): MusicPlayerActionId[] {
  return [...normalizeMusicPlayerActionLayout(layout).overflow];
}

export function resolveMusicPlayerBarActionIds(
  layout: MusicPlayerActionLayout,
): MusicPlayerActionId[] {
  return [...normalizeMusicPlayerActionLayout(layout).bar];
}

function mapIdsToContribution(ids: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of ids) {
    const actionId = resolveMusicTrackMenuActionId(raw);
    if (!actionId || actionId === "detail") {
      continue;
    }
    const contributionId = MUSIC_TRACK_MENU_CONTRIBUTION_IDS[actionId];
    if (!out.includes(contributionId)) {
      out.push(contributionId);
    }
  }
  return out;
}

/** 短 id 布局 → 宿主侧栏贡献布局（music.* ids）。 */
export function mapMusicPlayerLayoutToContributionLayout(
  layout: MusicPlayerActionLayout,
): WorkspaceAppActionBarLayout {
  const normalized = normalizeMusicPlayerActionLayout(layout);
  return {
    bar: mapIdsToContribution(normalized.bar),
    overflow: mapIdsToContribution(normalized.overflow),
    hidden: mapIdsToContribution(normalized.hidden),
    showBarLabels: normalized.showBarLabels ?? false,
  };
}

/** 宿主贡献布局内容相等（引用可不同）。 */
export function musicContributionLayoutsEqual(
  a: WorkspaceAppActionBarLayout,
  b: WorkspaceAppActionBarLayout,
): boolean {
  if (a === b) {
    return true;
  }
  if ((a.showBarLabels ?? false) !== (b.showBarLabels ?? false)) {
    return false;
  }
  const sameIds = (left: readonly string[], right: readonly string[]) =>
    left.length === right.length && left.every((id, index) => id === right[index]);
  return (
    sameIds(a.bar, b.bar) &&
    sameIds(a.overflow, b.overflow) &&
    sameIds(a.hidden ?? [], b.hidden ?? [])
  );
}

/** 宿主贡献布局 → 短 id（快捷键 tip / 旧逻辑）。 */
export function mapContributionLayoutToMusicPlayerLayout(
  layout: WorkspaceAppActionBarLayout,
): MusicPlayerActionLayout {
  const take = (ids: readonly string[] | undefined): MusicPlayerActionId[] => {
    const out: MusicPlayerActionId[] = [];
    for (const raw of ids ?? []) {
      const actionId = resolveMusicTrackMenuActionId(raw);
      if (actionId && actionId !== "detail" && !out.includes(actionId)) {
        out.push(actionId);
      }
    }
    return out;
  };
  return normalizeMusicPlayerActionLayout({
    bar: take(layout.bar),
    overflow: take(layout.overflow),
    hidden: take(layout.hidden),
    showBarLabels: layout.showBarLabels,
  });
}
