// 场景：音乐播放器快捷键 — activate 时稳定注册；product 键进 Tab 详情 Rebind，Settings 不再堆列表。
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import { MUSIC_APP_ID } from "./music-ids";

export type MusicPlayerShortcutId =
  | "action:pin"
  | "action:search"
  | "action:addPlaylist"
  | "action:playNext"
  | "action:volume"
  | "action:share"
  | "action:detail"
  | "action:exportZip"
  | "action:refreshResources"
  | "action:deleteTrack"
  | "transport:prev"
  | "transport:play"
  | "transport:next"
  | "transport:mode"
  | "transport:queue"
  | "lyrics:resumeFollow";

/** 播放器操作 + 传输：统一走字母 / Space / ⌥←→，不再占 ⌥1–9（避免与跳 Tab 冲突）。 */
export const MUSIC_PLAYER_SHORTCUT_SLOTS: readonly {
  id: MusicPlayerShortcutId;
  label: string;
  macCombo: string;
  nonMacCombo: string;
  helpKeys: readonly string[];
}[] = [
  {
    id: "action:pin",
    label: "置顶",
    macCombo: "Alt+P",
    nonMacCombo: "Alt+P",
    helpKeys: ["alt", "p"],
  },
  {
    id: "action:search",
    label: "搜索",
    macCombo: "Alt+F",
    nonMacCombo: "Alt+F",
    helpKeys: ["alt", "f"],
  },
  {
    id: "action:addPlaylist",
    label: "添加到歌单",
    macCombo: "Alt+A",
    nonMacCombo: "Alt+A",
    helpKeys: ["alt", "a"],
  },
  {
    id: "action:volume",
    label: "静音",
    macCombo: "Alt+M",
    nonMacCombo: "Alt+M",
    helpKeys: ["alt", "m"],
  },
  {
    id: "transport:prev",
    label: "上一首",
    macCombo: "Alt+ArrowLeft",
    nonMacCombo: "Alt+ArrowLeft",
    helpKeys: ["alt", "Left"],
  },
  {
    id: "transport:play",
    label: "播放",
    macCombo: "Space",
    nonMacCombo: "Space",
    helpKeys: ["Space"],
  },
  {
    id: "transport:next",
    label: "下一首",
    macCombo: "Alt+ArrowRight",
    nonMacCombo: "Alt+ArrowRight",
    helpKeys: ["alt", "Right"],
  },
  {
    id: "transport:mode",
    label: "播放模式",
    macCombo: "Alt+R",
    nonMacCombo: "Alt+R",
    helpKeys: ["alt", "r"],
  },
  {
    id: "transport:queue",
    label: "播放队列",
    macCombo: "Alt+Q",
    nonMacCombo: "Alt+Q",
    helpKeys: ["alt", "q"],
  },
  {
    id: "lyrics:resumeFollow",
    label: "恢复滚动",
    macCombo: "Alt+L",
    nonMacCombo: "Alt+L",
    helpKeys: ["alt", "l"],
  },
];

/** 溢出菜单：⌥ + 字母。 */
export const MUSIC_PLAYER_EXTRA_SHORTCUTS: readonly {
  id: Extract<
    MusicPlayerShortcutId,
    | "action:playNext"
    | "action:share"
    | "action:detail"
    | "action:exportZip"
    | "action:refreshResources"
    | "action:deleteTrack"
  >;
  label: string;
  macCombo: string;
  nonMacCombo: string;
  helpKeys: readonly string[];
}[] = [
  {
    id: "action:playNext",
    label: "下一首播放",
    macCombo: "Alt+N",
    nonMacCombo: "Alt+N",
    helpKeys: ["alt", "n"],
  },
  {
    id: "action:detail",
    label: "Tab 详情（同 ⌘I）",
    macCombo: "Alt+Shift+D",
    nonMacCombo: "Alt+Shift+D",
    helpKeys: ["alt", "shift", "d"],
  },
  {
    id: "action:share",
    label: "分享",
    macCombo: "Alt+S",
    nonMacCombo: "Alt+S",
    helpKeys: ["alt", "s"],
  },
  {
    id: "action:exportZip",
    label: "导出",
    macCombo: "Alt+E",
    nonMacCombo: "Alt+E",
    helpKeys: ["alt", "e"],
  },
  {
    id: "action:refreshResources",
    label: "更新歌曲",
    macCombo: "Alt+U",
    nonMacCombo: "Alt+U",
    helpKeys: ["alt", "u"],
  },
  {
    id: "action:deleteTrack",
    label: "删除歌曲",
    macCombo: "Alt+X",
    nonMacCombo: "Alt+X",
    helpKeys: ["alt", "x"],
  },
];

/** 导航入口：全局可触达，一并迁入 Tab 详情「快捷键」，避免 Settings 残留「音乐」大分区。 */
export const MUSIC_NAVIGATION_SHORTCUTS: readonly {
  helpId: string;
  label: string;
}[] = [
  { helpId: "sidebar-wechat-view-music", label: "侧边栏切换到音乐" },
  { helpId: "music-open-player", label: "打开音乐标签" },
];

/**
 * Tab 详情「快捷键」展示的 product 键（不含曲目菜单已走编辑布局的项）。
 * pin / addPlaylist / extras 与曲目菜单同源，仍由 layoutManaged + 编辑布局 Rebind。
 */
export const MUSIC_DETAIL_SHEET_PRODUCT_SHORTCUTS: readonly {
  helpId: string;
  label: string;
}[] = [
  ...MUSIC_PLAYER_SHORTCUT_SLOTS.filter(
    (slot) => slot.id !== "action:pin" && slot.id !== "action:addPlaylist",
  ).map((slot) => ({
    helpId: `transient:music:${slot.id}`,
    label: slot.label,
  })),
  ...MUSIC_NAVIGATION_SHORTCUTS,
];

/** Settings 剔除用：全部 music product + 导航 helpId（曲目菜单键亦列入，幂等）。 */
export function listMusicDetailManagedShortcutSourceKeys(): readonly string[] {
  const keys: string[] = [];
  for (const slot of MUSIC_PLAYER_SHORTCUT_SLOTS) {
    keys.push(`transient:music:${slot.id}`);
  }
  for (const slot of MUSIC_PLAYER_EXTRA_SHORTCUTS) {
    keys.push(`music:${slot.id}`);
  }
  for (const nav of MUSIC_NAVIGATION_SHORTCUTS) {
    keys.push(nav.helpId);
  }
  return keys;
}

const MUSIC_DETAIL_SHORTCUT_GROUP = {
  groupId: "music-shortcuts",
  groupTitle: "快捷键",
} as const;

/** 供 registerDetailSheetExtras(surface=config) 追加「快捷键」分组行。 */
export function buildMusicPlayerDetailShortcutExtraRows(): ReadonlyArray<{
  label: string;
  value: string;
  groupId: string;
  groupTitle: string;
  shortcutHelpId: string;
}> {
  return MUSIC_DETAIL_SHEET_PRODUCT_SHORTCUTS.map((entry) => ({
    label: entry.label,
    value: "",
    groupId: MUSIC_DETAIL_SHORTCUT_GROUP.groupId,
    groupTitle: MUSIC_DETAIL_SHORTCUT_GROUP.groupTitle,
    shortcutHelpId: entry.helpId,
  }));
}

const handlers = new Map<MusicPlayerShortcutId, () => void>();
let surfaceActive = false;

export function setMusicPlayerShortcutHandler(
  id: MusicPlayerShortcutId,
  run: (() => void) | null,
): void {
  if (!run) {
    handlers.delete(id);
    return;
  }
  handlers.set(id, run);
}

export function setMusicPlayerShortcutHandlers(
  next: Partial<Record<MusicPlayerShortcutId, () => void>>,
): void {
  for (const [id, run] of Object.entries(next) as [
    MusicPlayerShortcutId,
    (() => void) | undefined,
  ][]) {
    if (run) {
      handlers.set(id, run);
    }
  }
}

export function setMusicPlayerShortcutSurfaceActive(active: boolean): void {
  surfaceActive = active;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("agnx-workspace-transient-surface", {
        detail: { appId: MUSIC_APP_ID, active },
      }),
    );
  }
}

export function isMusicPlayerShortcutSurfaceActive(): boolean {
  return surfaceActive;
}

function sanitizeContributionId(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

/** activate(host) 时调用：写入可 Rebind 贡献，不依赖播放器是否已挂载。 */
export function registerMusicPlayerShortcuts(host: WorkspaceAppHostApi): void {
  host.registerShortcutGroup({
    id: "music-product",
    appId: MUSIC_APP_ID,
    groupKey: "music",
    title: "音乐",
    kind: "product",
    detailManagedShortcutSourceKeys: listMusicDetailManagedShortcutSourceKeys(),
  });
  for (const slot of MUSIC_PLAYER_SHORTCUT_SLOTS) {
    const contributionId = `transient-music-${sanitizeContributionId(slot.id)}`;
    const helpId = `transient:music:${slot.id}`;
    host.registerShortcut({
      id: contributionId,
      appId: MUSIC_APP_ID,
      actionId: `workspace.app.transient.music.${sanitizeContributionId(slot.id)}`,
      helpId,
      label: slot.label,
      sectionId: "music",
      sectionTitle: "音乐",
      macCombo: slot.macCombo,
      nonMacCombo: slot.nonMacCombo,
      helpKeys: [...slot.helpKeys],
      requireTransientSurfaceActive: true,
      run: () => {
        if (!surfaceActive) {
          return;
        }
        handlers.get(slot.id)?.();
      },
    });
  }
  for (const slot of MUSIC_PLAYER_EXTRA_SHORTCUTS) {
    const contributionId = `music-extra-${sanitizeContributionId(slot.id)}`;
    host.registerShortcut({
      id: contributionId,
      appId: MUSIC_APP_ID,
      actionId: `workspace.app.music.${sanitizeContributionId(slot.id)}`,
      helpId: `music:${slot.id}`,
      label: slot.label,
      sectionId: "music",
      sectionTitle: "音乐",
      macCombo: slot.macCombo,
      nonMacCombo: slot.nonMacCombo,
      helpKeys: [...slot.helpKeys],
      requireTransientSurfaceActive: true,
      run: () => {
        if (!surfaceActive) {
          return;
        }
        handlers.get(slot.id)?.();
      },
    });
  }
}
