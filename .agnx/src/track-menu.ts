// 场景：侧栏右键 / 播放器三点 / 搜索结果行菜单的唯一菜单项数据源。
import {
  FolderOutput,
  HardDrive,
  Info,
  ListEnd,
  ListMinus,
  ListPlus,
  Pin,
  PinOff,
  Play,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react-native";
import type { WorkspaceAppIcon, WorkspaceAppMenuItem } from "@getagnx/app-sdk";

/**
 * 侧栏右键（= 三点第二段）曲目操作，不含「播放」（点行即播）。
 * `detail` 仅保留作 ⌥⇧D soft-alias，不进菜单/底栏。
 */
export type MusicTrackMenuActionId =
  | "pin"
  | "addPlaylist"
  | "playNext"
  | "share"
  | "detail"
  | "exportZip"
  | "refreshResources"
  | "deleteTrack";

export const MUSIC_TRACK_MENU_ACTION_LABELS: Record<MusicTrackMenuActionId, string> = {
  pin: "置顶",
  addPlaylist: "加入播放列表",
  playNext: "下一首播放",
  share: "分享",
  detail: "Tab 详情",
  exportZip: "导出",
  refreshResources: "更新歌曲",
  deleteTrack: "删除歌曲",
};

export const MUSIC_TRACK_MENU_ICONS: Record<MusicTrackMenuActionId, WorkspaceAppIcon> = {
  pin: Pin as WorkspaceAppIcon,
  addPlaylist: ListPlus as WorkspaceAppIcon,
  playNext: ListEnd as WorkspaceAppIcon,
  share: Share2 as WorkspaceAppIcon,
  detail: Info as WorkspaceAppIcon,
  exportZip: FolderOutput as WorkspaceAppIcon,
  refreshResources: RefreshCw as WorkspaceAppIcon,
  deleteTrack: Trash2 as WorkspaceAppIcon,
};

/** 置顶 = Pin；已置顶（取消置顶）= PinOff，避免外露 chrome 图标歧义。 */
export function resolveMusicTrackMenuIcon(
  actionId: MusicTrackMenuActionId,
  pinned?: boolean,
): WorkspaceAppIcon {
  if (actionId === "pin") {
    return (pinned ? PinOff : Pin) as WorkspaceAppIcon;
  }
  return MUSIC_TRACK_MENU_ICONS[actionId];
}

export const MUSIC_TRACK_MENU_CONTRIBUTION_IDS: Record<MusicTrackMenuActionId, string> = {
  pin: "music.pin",
  addPlaylist: "music.add-to-queue",
  playNext: "music.play-next",
  share: "music.share",
  detail: "music.detail",
  exportZip: "music.export",
  refreshResources: "music.refresh-resources",
  deleteTrack: "music.delete",
};

const MUSIC_TRACK_MENU_ACTION_BY_CONTRIBUTION_ID: Record<string, MusicTrackMenuActionId> =
  Object.fromEntries(
    (Object.entries(MUSIC_TRACK_MENU_CONTRIBUTION_IDS) as [MusicTrackMenuActionId, string][]).map(
      ([actionId, contributionId]) => [contributionId, actionId],
    ),
  ) as Record<string, MusicTrackMenuActionId>;

export function isMusicTrackMenuActionId(id: string): id is MusicTrackMenuActionId {
  return Object.prototype.hasOwnProperty.call(MUSIC_TRACK_MENU_ACTION_LABELS, id);
}

/** 播放器 / 侧栏菜单 id：短 id 或 contribution id → 曲目动作。 */
export function resolveMusicTrackMenuActionId(id: string): MusicTrackMenuActionId | null {
  if (isMusicTrackMenuActionId(id)) {
    return id;
  }
  return MUSIC_TRACK_MENU_ACTION_BY_CONTRIBUTION_ID[id] ?? null;
}

export const MUSIC_TRACK_MENU_SHORTCUT_KEYS: Partial<
  Record<MusicTrackMenuActionId, readonly string[]>
> = {
  pin: ["alt", "p"],
  addPlaylist: ["alt", "a"],
  playNext: ["alt", "n"],
  share: ["alt", "s"],
  detail: ["alt", "d"],
  exportZip: ["alt", "e"],
  refreshResources: ["alt", "u"],
  deleteTrack: ["alt", "x"],
};

/** 与 registerMusicPlayerShortcuts 的 helpId 对齐；编辑布局 inline Rebind 用。 */
export const MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS: Partial<
  Record<MusicTrackMenuActionId, string>
> = {
  pin: "transient:music:action:pin",
  addPlaylist: "transient:music:action:addPlaylist",
  playNext: "music:action:playNext",
  share: "music:action:share",
  detail: "music:action:detail",
  exportZip: "music:action:exportZip",
  refreshResources: "music:action:refreshResources",
  deleteTrack: "music:action:deleteTrack",
};

/**
 * 侧栏右键唯一有序列表。
 * 播放器三点第二段必须按同一数组渲染，禁止另写一份。
 */
export const MUSIC_SIDEBAR_TRACK_MENU_IDS: readonly MusicTrackMenuActionId[] = [
  "pin",
  "addPlaylist",
  "playNext",
  "share",
  "exportZip",
  "refreshResources",
  "deleteTrack",
];

export function isMusicTrackMenuDestructive(id: MusicTrackMenuActionId): boolean {
  return id === "deleteTrack";
}

/** 菜单表面：队列内「加入播放列表」语义切换为「移出播放列表」。 */
export type MusicTrackMenuSurfaceKind = "default" | "queue";

export function resolveMusicTrackMenuLabel(
  id: MusicTrackMenuActionId,
  input?: { pinned?: boolean; surface?: MusicTrackMenuSurfaceKind },
): string {
  if (id === "pin") {
    return input?.pinned ? "取消置顶" : "置顶";
  }
  if (id === "addPlaylist" && input?.surface === "queue") {
    return "移出播放列表";
  }
  return MUSIC_TRACK_MENU_ACTION_LABELS[id];
}

export function resolveMusicTrackMenuPresentation(
  id: MusicTrackMenuActionId,
  input?: { pinned?: boolean; surface?: MusicTrackMenuSurfaceKind },
): {
  label: string;
  icon: WorkspaceAppIcon;
  destructive: boolean;
  active: boolean;
} {
  const surface = input?.surface ?? "default";
  if (id === "addPlaylist" && surface === "queue") {
    return {
      label: "移出播放列表",
      icon: ListMinus as WorkspaceAppIcon,
      destructive: true,
      active: false,
    };
  }
  return {
    label: resolveMusicTrackMenuLabel(id, input),
    icon: resolveMusicTrackMenuIcon(id, input?.pinned),
    destructive: isMusicTrackMenuDestructive(id),
    active: id === "pin" ? Boolean(input?.pinned) : false,
  };
}

/** 侧栏 / 播放器 / 队列三点共用：由同一 ids 生成菜单项（含 destructive）。 */
export function buildMusicTrackMenuItems(input: {
  actionIds: readonly MusicTrackMenuActionId[];
  pinned?: boolean;
  surface?: MusicTrackMenuSurfaceKind;
  shortcutKeys?: Partial<Record<MusicTrackMenuActionId, readonly string[]>>;
}): WorkspaceAppMenuItem[] {
  return input.actionIds.map((id) => {
    const presentation = resolveMusicTrackMenuPresentation(id, {
      pinned: input.pinned,
      surface: input.surface,
    });
    return {
      type: "item" as const,
      id,
      label: presentation.label,
      icon: presentation.icon,
      active: presentation.active,
      destructive: presentation.destructive,
      shortcutKeys: input.shortcutKeys?.[id] ?? MUSIC_TRACK_MENU_SHORTCUT_KEYS[id],
      shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[id],
    };
  });
}

/**
 * 播放器三点菜单曲目段：
 * 默认仅 actionLayout.overflow（bar 已外露、hidden 不出现）。
 * 移动端小封面可将 bar 项折叠进来：foldedBarActionIds + separator + overflow。
 */
export function buildMusicPlayerOverflowMenuItems(input: {
  pinned?: boolean;
  surface?: MusicTrackMenuSurfaceKind;
  /** actionLayout.overflow 投影，禁止含 bar/hidden */
  menuActionIds: readonly MusicTrackMenuActionId[];
  /** 收进菜单的原 bar 项（如移动端小封面只外露三点） */
  foldedBarActionIds?: readonly MusicTrackMenuActionId[];
  trackShortcutKeys?: Partial<Record<MusicTrackMenuActionId, readonly string[]>>;
}): WorkspaceAppMenuItem[] {
  const folded = [...(input.foldedBarActionIds ?? [])];
  const foldedSet = new Set(folded);
  const overflow = input.menuActionIds.filter((id) => !foldedSet.has(id));
  const items: WorkspaceAppMenuItem[] = buildMusicTrackMenuItems({
    actionIds: folded,
    pinned: input.pinned,
    surface: input.surface,
    shortcutKeys: input.trackShortcutKeys,
  });
  if (folded.length > 0 && overflow.length > 0) {
    items.push({ type: "separator" });
  }
  items.push(
    ...buildMusicTrackMenuItems({
      actionIds: overflow,
      pinned: input.pinned,
      surface: input.surface,
      shortcutKeys: input.trackShortcutKeys,
    }),
  );
  return items;
}

/** 搜索结果行菜单（未入库也可操作）；不含删除/导出等本地曲操作。 */
export type MusicSearchHitMenuActionId = "play" | "playNext" | "addPlaylist" | "saveSong";

export const MUSIC_SEARCH_HIT_MENU_ACTION_LABELS: Record<MusicSearchHitMenuActionId, string> = {
  play: "播放",
  playNext: "下一首播放",
  addPlaylist: "加入播放列表",
  saveSong: "保存歌曲",
};

export const MUSIC_SEARCH_HIT_MENU_ICONS: Record<MusicSearchHitMenuActionId, WorkspaceAppIcon> = {
  play: Play as WorkspaceAppIcon,
  playNext: ListEnd as WorkspaceAppIcon,
  addPlaylist: ListPlus as WorkspaceAppIcon,
  saveSong: HardDrive as WorkspaceAppIcon,
};

export const MUSIC_SEARCH_HIT_MENU_IDS: readonly MusicSearchHitMenuActionId[] = [
  "play",
  "playNext",
  "addPlaylist",
  "saveSong",
];

/** 搜索结果行三点 / 右键 / 长按共用菜单项。 */
export function buildMusicSearchHitMenuItems(): WorkspaceAppMenuItem[] {
  return MUSIC_SEARCH_HIT_MENU_IDS.map((id) => ({
    type: "item" as const,
    id,
    label: MUSIC_SEARCH_HIT_MENU_ACTION_LABELS[id],
    icon: MUSIC_SEARCH_HIT_MENU_ICONS[id],
  }));
}

/** 搜索结果：艺人/专辑/歌单卡片菜单。 */
export type MusicSearchCollectionMenuActionId = "open" | "playAll" | "addPlaylist";

export const MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS: Record<
  MusicSearchCollectionMenuActionId,
  string
> = {
  open: "打开",
  playAll: "播放全部",
  addPlaylist: "加入播放列表",
};

export const MUSIC_SEARCH_COLLECTION_MENU_ICONS: Record<
  MusicSearchCollectionMenuActionId,
  WorkspaceAppIcon
> = {
  open: Info as WorkspaceAppIcon,
  playAll: Play as WorkspaceAppIcon,
  addPlaylist: ListPlus as WorkspaceAppIcon,
};

export const MUSIC_SEARCH_COLLECTION_MENU_IDS: readonly MusicSearchCollectionMenuActionId[] = [
  "open",
  "playAll",
  "addPlaylist",
];

/** 合集卡片三点 / 右键 / 长按共用菜单项。 */
export function buildMusicSearchCollectionMenuItems(): WorkspaceAppMenuItem[] {
  return MUSIC_SEARCH_COLLECTION_MENU_IDS.map((id) => ({
    type: "item" as const,
    id,
    label: MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS[id],
    icon: MUSIC_SEARCH_COLLECTION_MENU_ICONS[id],
  }));
}
