// 场景：Music 搜索结果行/合集卡片菜单 — 同源动作表 + 宿主 entity-menu 布局；UI 整机走 host.ui.ActionBar。
import { useCallback, useSyncExternalStore } from "react";
import type { WorkspaceAppActionBarLayout, WorkspaceAppHostApi } from "@getagnx/app-sdk";
import { MUSIC_APP_ID } from "./music-ids";
import { getMusicHostApi } from "./music-host";
import {
  MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS,
  MUSIC_SEARCH_COLLECTION_MENU_ICONS,
  MUSIC_SEARCH_COLLECTION_MENU_IDS,
  MUSIC_SEARCH_HIT_MENU_ACTION_LABELS,
  MUSIC_SEARCH_HIT_MENU_ICONS,
  MUSIC_SEARCH_HIT_MENU_IDS,
  type MusicSearchCollectionMenuActionId,
  type MusicSearchHitMenuActionId,
} from "./track-menu";

/** 搜索歌曲行实体菜单。 */
export const MUSIC_SEARCH_HIT_MENU_ID = "search-hit";
/** 搜索艺人/专辑/歌单卡片实体菜单。 */
export const MUSIC_SEARCH_COLLECTION_MENU_ID = "search-collection";

export const MUSIC_SEARCH_MENU_SURFACE = {
  results: "results",
} as const;

export type MusicSearchMenuSurfaceId =
  (typeof MUSIC_SEARCH_MENU_SURFACE)[keyof typeof MUSIC_SEARCH_MENU_SURFACE];

type SearchMenuKind = "hit" | "collection";

function defaultAllOverflowLayout(knownIds: readonly string[]): WorkspaceAppActionBarLayout {
  return {
    bar: [],
    overflow: [...knownIds],
    hidden: [],
    showBarLabels: false,
  };
}

function menuConfig(kind: SearchMenuKind): {
  menuId: string;
  knownIds: readonly string[];
  items: Array<{ id: string; label: string; icon: unknown; canHide: boolean }>;
  title: string;
} {
  if (kind === "hit") {
    return {
      menuId: MUSIC_SEARCH_HIT_MENU_ID,
      knownIds: MUSIC_SEARCH_HIT_MENU_IDS,
      title: "编辑搜索歌曲菜单",
      items: MUSIC_SEARCH_HIT_MENU_IDS.map((id) => ({
        id,
        label: MUSIC_SEARCH_HIT_MENU_ACTION_LABELS[id],
        icon: MUSIC_SEARCH_HIT_MENU_ICONS[id],
        canHide: true,
      })),
    };
  }
  return {
    menuId: MUSIC_SEARCH_COLLECTION_MENU_ID,
    knownIds: MUSIC_SEARCH_COLLECTION_MENU_IDS,
    title: "编辑搜索合集菜单",
    items: MUSIC_SEARCH_COLLECTION_MENU_IDS.map((id) => ({
      id,
      label: MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS[id],
      icon: MUSIC_SEARCH_COLLECTION_MENU_ICONS[id],
      canHide: true,
    })),
  };
}

function readLayout(
  hostApi: WorkspaceAppHostApi,
  kind: SearchMenuKind,
  surfaceId: MusicSearchMenuSurfaceId = MUSIC_SEARCH_MENU_SURFACE.results,
): WorkspaceAppActionBarLayout {
  const config = menuConfig(kind);
  return hostApi.ui.getEntityMenuLayout({
    appId: MUSIC_APP_ID,
    menuId: config.menuId,
    surfaceId,
    knownIds: config.knownIds,
  });
}

const layoutCache = new Map<string, WorkspaceAppActionBarLayout>();

function layoutsEqual(a: WorkspaceAppActionBarLayout, b: WorkspaceAppActionBarLayout): boolean {
  if (a === b) {
    return true;
  }
  if ((a.showBarLabels ?? false) !== (b.showBarLabels ?? false)) {
    return false;
  }
  const same = (left: readonly string[], right: readonly string[]) =>
    left.length === right.length && left.every((id, index) => id === right[index]);
  return same(a.bar, b.bar) && same(a.overflow, b.overflow) && same(a.hidden ?? [], b.hidden ?? []);
}

function cachedLayout(
  cacheKey: string,
  layout: WorkspaceAppActionBarLayout,
): WorkspaceAppActionBarLayout {
  const prev = layoutCache.get(cacheKey);
  if (prev && layoutsEqual(prev, layout)) {
    return prev;
  }
  layoutCache.set(cacheKey, layout);
  return layout;
}

export function seedMusicSearchMenuLayouts(hostApi: WorkspaceAppHostApi): void {
  for (const kind of ["hit", "collection"] as const) {
    const config = menuConfig(kind);
    hostApi.ui.seedEntityMenuLayoutIfAbsent({
      appId: MUSIC_APP_ID,
      menuId: config.menuId,
      surfaceId: MUSIC_SEARCH_MENU_SURFACE.results,
      knownIds: config.knownIds,
      layout: defaultAllOverflowLayout(config.knownIds),
    });
  }
}

export function openMusicSearchMenuLayoutEditor(
  hostApi: WorkspaceAppHostApi,
  kind: SearchMenuKind,
): void {
  const config = menuConfig(kind);
  hostApi.ui.customizeEntityMenuLayout({
    appId: MUSIC_APP_ID,
    menuId: config.menuId,
    surfaceId: MUSIC_SEARCH_MENU_SURFACE.results,
    title: config.title,
    items: config.items as never,
    defaultLayout: defaultAllOverflowLayout(config.knownIds),
  });
}

function useMusicSearchMenuLayout(kind: SearchMenuKind): {
  layout: WorkspaceAppActionBarLayout;
  openEditLayout: () => void;
} {
  const surfaceId = MUSIC_SEARCH_MENU_SURFACE.results;
  const config = menuConfig(kind);
  const cacheKey = `${MUSIC_APP_ID}:${config.menuId}:${surfaceId}`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      try {
        return getMusicHostApi().ui.subscribeEntityMenuLayout(
          {
            appId: MUSIC_APP_ID,
            menuId: config.menuId,
            surfaceId,
          },
          onStoreChange,
        );
      } catch {
        return () => {};
      }
    },
    [config.menuId, surfaceId],
  );

  const getSnapshot = useCallback(() => {
    try {
      return cachedLayout(cacheKey, readLayout(getMusicHostApi(), kind, surfaceId));
    } catch {
      return cachedLayout(cacheKey, defaultAllOverflowLayout(config.knownIds));
    }
  }, [cacheKey, config.knownIds, kind, surfaceId]);

  const layout = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const openEditLayout = useCallback(() => {
    try {
      openMusicSearchMenuLayoutEditor(getMusicHostApi(), kind);
    } catch {
      // host 未就绪
    }
  }, [kind]);

  return { layout, openEditLayout };
}

export function useMusicSearchHitMenuLayout(): {
  layout: WorkspaceAppActionBarLayout;
  openEditLayout: () => void;
} {
  return useMusicSearchMenuLayout("hit");
}

export function useMusicSearchCollectionMenuLayout(): {
  layout: WorkspaceAppActionBarLayout;
  openEditLayout: () => void;
} {
  return useMusicSearchMenuLayout("collection");
}

export type { MusicSearchHitMenuActionId, MusicSearchCollectionMenuActionId };
