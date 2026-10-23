// 场景：Music 曲目实体菜单多表面 — 同源 track-menu，player/queue 布局走宿主 entity-menu 键。
import { useCallback, useSyncExternalStore } from "react";
import type { WorkspaceAppActionBarLayout, WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import { MUSIC_APP_ID } from "./music-ids";
import {
  getDefaultMusicPlayerActionLayout,
  MUSIC_PLAYER_ACTION_IDS,
  normalizeMusicPlayerActionLayout,
  type MusicPlayerActionId,
  type MusicPlayerActionLayout,
} from "./player-action-layout";
import {
  MUSIC_TRACK_MENU_ICONS,
  MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS,
  resolveMusicTrackMenuPresentation,
  type MusicTrackMenuActionId,
} from "./track-menu";
import { getMusicHostApi } from "./music-host";
import { useMusicDemoStore } from "./store";

/** 曲目实体菜单家族 id（非 segmentId）。 */
export const MUSIC_TRACK_ENTITY_MENU_ID = "track";

/** 多表面 surfaceId；侧栏宿主 chrome 仍走 item-menu:app:segment。 */
export const MUSIC_TRACK_MENU_SURFACE = {
  player: "player",
  queue: "queue",
} as const;

export type MusicTrackMenuSurfaceId =
  (typeof MUSIC_TRACK_MENU_SURFACE)[keyof typeof MUSIC_TRACK_MENU_SURFACE];

const KNOWN_IDS: readonly string[] = MUSIC_PLAYER_ACTION_IDS;

const STABLE_DEFAULT_PLAYER_LAYOUT = getDefaultMusicPlayerActionLayout();

export function getDefaultMusicQueueTrackMenuLayout(): MusicPlayerActionLayout {
  // 默认把「移出播放列表」(addPlaylist 在 queue 表面的语义) 外露到 bar
  return {
    bar: ["addPlaylist"],
    overflow: MUSIC_PLAYER_ACTION_IDS.filter((id) => id !== "addPlaylist"),
    hidden: [],
    showBarLabels: false,
  };
}

const STABLE_DEFAULT_QUEUE_LAYOUT = getDefaultMusicQueueTrackMenuLayout();

/** 旧默认：全部进 overflow、bar 为空（硬编码删除键时代）。 */
function isLegacyQueueAllOverflowLayout(layout: MusicPlayerActionLayout): boolean {
  if (layout.bar.length !== 0 || layout.hidden.length !== 0) {
    return false;
  }
  if (layout.overflow.length !== MUSIC_PLAYER_ACTION_IDS.length) {
    return false;
  }
  return MUSIC_PLAYER_ACTION_IDS.every((id, index) => layout.overflow[index] === id);
}

let playerMirrorUnsub: (() => void) | null = null;

function toPlayerLayout(layout: WorkspaceAppActionBarLayout): MusicPlayerActionLayout {
  return normalizeMusicPlayerActionLayout({
    bar: layout.bar as MusicPlayerActionId[],
    overflow: layout.overflow as MusicPlayerActionId[],
    hidden: (layout.hidden ?? []) as MusicPlayerActionId[],
    showBarLabels: layout.showBarLabels,
  });
}

function toHostLayout(layout: MusicPlayerActionLayout): WorkspaceAppActionBarLayout {
  const normalized = normalizeMusicPlayerActionLayout(layout);
  return {
    bar: [...normalized.bar],
    overflow: [...normalized.overflow],
    hidden: [...normalized.hidden],
    showBarLabels: normalized.showBarLabels ?? false,
  };
}

/** useSyncExternalStore 要求内容未变时返回同一引用 */
const playerLayoutSnapshotCache = new Map<string, MusicPlayerActionLayout>();

function playerLayoutsEqual(a: MusicPlayerActionLayout, b: MusicPlayerActionLayout): boolean {
  if (a === b) {
    return true;
  }
  if ((a.showBarLabels ?? false) !== (b.showBarLabels ?? false)) {
    return false;
  }
  const same = (left: readonly string[], right: readonly string[]) =>
    left.length === right.length && left.every((id, index) => id === right[index]);
  return same(a.bar, b.bar) && same(a.overflow, b.overflow) && same(a.hidden, b.hidden);
}

function cachedPlayerLayout(
  cacheKey: string,
  layout: WorkspaceAppActionBarLayout,
): MusicPlayerActionLayout {
  const next = toPlayerLayout(layout);
  const prev = playerLayoutSnapshotCache.get(cacheKey);
  if (prev && playerLayoutsEqual(prev, next)) {
    return prev;
  }
  playerLayoutSnapshotCache.set(cacheKey, next);
  return next;
}

export function buildMusicTrackEntityMenuItems(surfaceId?: MusicTrackMenuSurfaceId): Array<{
  id: string;
  label: string;
  icon: (typeof MUSIC_TRACK_MENU_ICONS)[MusicTrackMenuActionId];
  canHide: boolean;
  shortcutSourceKey?: string;
}> {
  const surfaceKind = surfaceId === MUSIC_TRACK_MENU_SURFACE.queue ? "queue" : "default";
  return MUSIC_PLAYER_ACTION_IDS.map((id) => {
    const presentation = resolveMusicTrackMenuPresentation(id, { surface: surfaceKind });
    return {
      id,
      label: presentation.label,
      icon: presentation.icon as (typeof MUSIC_TRACK_MENU_ICONS)[MusicTrackMenuActionId],
      canHide: true,
      shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[id],
    };
  });
}

/** 注册时：把 Music 本地 actionLayout 迁入宿主 player 键；queue 写入默认。 */
export function seedMusicTrackEntityMenuLayouts(hostApi: WorkspaceAppHostApi): void {
  const playerSeed = toHostLayout(useMusicDemoStore.getState().actionLayout);
  const playerItems = buildMusicTrackEntityMenuItems(MUSIC_TRACK_MENU_SURFACE.player);
  const queueItems = buildMusicTrackEntityMenuItems(MUSIC_TRACK_MENU_SURFACE.queue);
  hostApi.ui.registerEntityMenuLayoutCatalog({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId: MUSIC_TRACK_MENU_SURFACE.player,
    items: playerItems,
    defaultLayout: playerSeed,
    order: 0,
  });
  hostApi.ui.registerEntityMenuLayoutCatalog({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId: MUSIC_TRACK_MENU_SURFACE.queue,
    items: queueItems,
    defaultLayout: toHostLayout(STABLE_DEFAULT_QUEUE_LAYOUT),
    order: 1,
  });
  hostApi.ui.seedEntityMenuLayoutIfAbsent({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId: MUSIC_TRACK_MENU_SURFACE.player,
    knownIds: KNOWN_IDS,
    layout: playerSeed,
  });
  hostApi.ui.seedEntityMenuLayoutIfAbsent({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId: MUSIC_TRACK_MENU_SURFACE.queue,
    knownIds: KNOWN_IDS,
    layout: toHostLayout(STABLE_DEFAULT_QUEUE_LAYOUT),
  });
  // 把「全 overflow」旧默认迁到「移出播放列表」外露 bar
  const queueLayout = readMusicTrackEntityMenuLayout(hostApi, MUSIC_TRACK_MENU_SURFACE.queue);
  if (isLegacyQueueAllOverflowLayout(queueLayout)) {
    hostApi.ui.setEntityMenuLayout({
      appId: MUSIC_APP_ID,
      menuId: MUSIC_TRACK_ENTITY_MENU_ID,
      surfaceId: MUSIC_TRACK_MENU_SURFACE.queue,
      knownIds: KNOWN_IDS,
      layout: toHostLayout(STABLE_DEFAULT_QUEUE_LAYOUT),
    });
  }

  playerMirrorUnsub?.();
  playerMirrorUnsub = hostApi.ui.subscribeEntityMenuLayout(
    {
      appId: MUSIC_APP_ID,
      menuId: MUSIC_TRACK_ENTITY_MENU_ID,
      surfaceId: MUSIC_TRACK_MENU_SURFACE.player,
    },
    () => {
      const next = readMusicTrackEntityMenuLayout(hostApi, MUSIC_TRACK_MENU_SURFACE.player);
      const current = useMusicDemoStore.getState().actionLayout;
      if (!playerLayoutsEqual(current, next)) {
        useMusicDemoStore.getState().setActionLayout(next);
      }
    },
  );
}

export function readMusicTrackEntityMenuLayout(
  hostApi: WorkspaceAppHostApi,
  surfaceId: MusicTrackMenuSurfaceId,
): MusicPlayerActionLayout {
  const layout = hostApi.ui.getEntityMenuLayout({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId,
    knownIds: KNOWN_IDS,
  });
  return cachedPlayerLayout(`${MUSIC_APP_ID}:${surfaceId}`, layout);
}

export function openMusicTrackEntityMenuLayoutEditor(
  hostApi: WorkspaceAppHostApi,
  surfaceId: MusicTrackMenuSurfaceId,
  title = "编辑布局",
): void {
  const defaultLayout =
    surfaceId === MUSIC_TRACK_MENU_SURFACE.player
      ? toHostLayout(STABLE_DEFAULT_PLAYER_LAYOUT)
      : toHostLayout(STABLE_DEFAULT_QUEUE_LAYOUT);

  hostApi.ui.customizeEntityMenuLayout({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId,
    title,
    items: buildMusicTrackEntityMenuItems(surfaceId),
    defaultLayout,
  });
}

/**
 * React：订阅宿主 entity-menu 布局。
 * player 写入会镜像到 Music store.actionLayout（seed 时订阅）。
 */
export function useMusicTrackEntityMenuLayout(surfaceId: MusicTrackMenuSurfaceId): {
  layout: MusicPlayerActionLayout;
  openEditLayout: () => void;
} {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      try {
        return getMusicHostApi().ui.subscribeEntityMenuLayout(
          {
            appId: MUSIC_APP_ID,
            menuId: MUSIC_TRACK_ENTITY_MENU_ID,
            surfaceId,
          },
          onStoreChange,
        );
      } catch {
        return () => {};
      }
    },
    [surfaceId],
  );

  const getSnapshot = useCallback(() => {
    try {
      return readMusicTrackEntityMenuLayout(getMusicHostApi(), surfaceId);
    } catch {
      return surfaceId === MUSIC_TRACK_MENU_SURFACE.player
        ? STABLE_DEFAULT_PLAYER_LAYOUT
        : STABLE_DEFAULT_QUEUE_LAYOUT;
    }
  }, [surfaceId]);

  const layout = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const openEditLayout = useCallback(() => {
    try {
      openMusicTrackEntityMenuLayoutEditor(getMusicHostApi(), surfaceId);
    } catch {
      // host 未就绪
    }
  }, [surfaceId]);

  return { layout, openEditLayout };
}
