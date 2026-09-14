// 场景：音乐播放器快捷键 — activate 时稳定注册（Settings 可 Rebind）；播放器只挂 run / surface。
import type { WorkspaceAppHostApi } from "@getagnx/app-sdk";
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
