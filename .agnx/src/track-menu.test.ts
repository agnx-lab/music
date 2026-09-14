// 场景：Music 菜单数据源 — 侧栏/搜索行/合集卡片菜单项 id 与标签映射，避免串菜单。
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react-native", () => {
  const pin = () => null;
  const pinOff = () => null;
  const icon = () => null;
  return {
    FolderOutput: icon,
    HardDrive: icon,
    Info: icon,
    ListEnd: icon,
    ListPlus: icon,
    ListMinus: icon,
    Pin: pin,
    PinOff: pinOff,
    Play: icon,
    RefreshCw: icon,
    Share2: icon,
    Trash2: icon,
  };
});

import { Pin, PinOff } from "lucide-react-native";
import {
  buildMusicPlayerOverflowMenuItems,
  buildMusicSearchCollectionMenuItems,
  buildMusicSearchHitMenuItems,
  buildMusicTrackMenuItems,
  MUSIC_SEARCH_COLLECTION_MENU_IDS,
  MUSIC_SEARCH_HIT_MENU_IDS,
  MUSIC_SIDEBAR_TRACK_MENU_IDS,
  resolveMusicTrackMenuIcon,
} from "./track-menu";

describe("track-menu", () => {
  it("侧栏菜单含删除且有序", () => {
    const items = buildMusicTrackMenuItems({
      actionIds: MUSIC_SIDEBAR_TRACK_MENU_IDS,
      pinned: false,
    });
    expect(items.map((item) => (item.type === "item" ? item.id : item.type))).toEqual([
      ...MUSIC_SIDEBAR_TRACK_MENU_IDS,
    ]);
    const del = items.find((item) => item.type === "item" && item.id === "deleteTrack");
    expect(del && del.type === "item" ? del.destructive : false).toBe(true);
  });

  it("queue 表面：加入播放列表切换为移出播放列表", () => {
    const items = buildMusicTrackMenuItems({
      actionIds: ["addPlaylist", "deleteTrack"],
      surface: "queue",
    });
    const remove = items.find((item) => item.type === "item" && item.id === "addPlaylist");
    const del = items.find((item) => item.type === "item" && item.id === "deleteTrack");
    expect(remove && remove.type === "item" ? remove.label : null).toBe("移出播放列表");
    expect(remove && remove.type === "item" ? remove.destructive : false).toBe(true);
    expect(del && del.type === "item" ? del.label : null).toBe("删除歌曲");
  });

  it("搜索行菜单含保存且不含删除", () => {
    const items = buildMusicSearchHitMenuItems();
    expect(items.every((item) => item.type === "item")).toBe(true);
    expect(items.map((item) => (item.type === "item" ? item.id : ""))).toEqual([
      ...MUSIC_SEARCH_HIT_MENU_IDS,
    ]);
    expect(items.some((item) => item.type === "item" && item.id === "deleteTrack")).toBe(false);
    expect(items.find((item) => item.type === "item" && item.id === "play")?.label).toBe("播放");
    expect(items.find((item) => item.type === "item" && item.id === "saveSong")?.label).toBe(
      "保存歌曲",
    );
  });

  it("侧栏文案：更新歌曲 / 删除歌曲", () => {
    const items = buildMusicTrackMenuItems({
      actionIds: MUSIC_SIDEBAR_TRACK_MENU_IDS,
      pinned: false,
    });
    expect(
      items.find((item) => item.type === "item" && item.id === "refreshResources")?.label,
    ).toBe("更新歌曲");
    expect(items.find((item) => item.type === "item" && item.id === "deleteTrack")?.label).toBe(
      "删除歌曲",
    );
  });

  it("置顶态切换文案与图标", () => {
    const unpinned = buildMusicTrackMenuItems({
      actionIds: MUSIC_SIDEBAR_TRACK_MENU_IDS,
      pinned: false,
    }).find((item) => item.type === "item" && item.id === "pin");
    const pinned = buildMusicTrackMenuItems({
      actionIds: MUSIC_SIDEBAR_TRACK_MENU_IDS,
      pinned: true,
    }).find((item) => item.type === "item" && item.id === "pin");
    expect(unpinned && unpinned.type === "item" ? unpinned.label : "").toBe("置顶");
    expect(pinned && pinned.type === "item" ? pinned.label : "").toBe("取消置顶");
    expect(pinned && pinned.type === "item" ? pinned.active : false).toBe(true);
    expect(resolveMusicTrackMenuIcon("pin", false)).toBe(Pin);
    expect(resolveMusicTrackMenuIcon("pin", true)).toBe(PinOff);
    expect(unpinned && unpinned.type === "item" ? unpinned.icon : null).toBe(Pin);
    expect(pinned && pinned.type === "item" ? pinned.icon : null).toBe(PinOff);
  });

  it("合集卡片菜单含打开/播放全部/加入列表", () => {
    const items = buildMusicSearchCollectionMenuItems();
    expect(items.map((item) => (item.type === "item" ? item.id : ""))).toEqual([
      ...MUSIC_SEARCH_COLLECTION_MENU_IDS,
    ]);
  });

  it("播放器三点：折叠 bar 项时用 separator 与 overflow 分段", () => {
    const items = buildMusicPlayerOverflowMenuItems({
      pinned: false,
      foldedBarActionIds: ["pin", "addPlaylist", "playNext"],
      menuActionIds: ["share", "exportZip", "deleteTrack"],
    });
    expect(items.map((item) => (item.type === "item" ? item.id : item.type))).toEqual([
      "pin",
      "addPlaylist",
      "playNext",
      "separator",
      "share",
      "exportZip",
      "deleteTrack",
    ]);
  });

  it("侧栏菜单不含详情（已并入 Tab 公共详情）", () => {
    expect(MUSIC_SIDEBAR_TRACK_MENU_IDS).not.toContain("detail");
  });
});
