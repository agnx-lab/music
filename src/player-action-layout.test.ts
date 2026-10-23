// 场景：曲目操作布局 — 默认三高频外露；详情已并入公共壳；搜/音量不在布局表。
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react-native", () => {
  const icon = () => null;
  return {
    FolderOutput: icon,
    HardDrive: icon,
    Info: icon,
    ListEnd: icon,
    ListPlus: icon,
    ListMinus: icon,
    Pin: icon,
    PinOff: icon,
    Play: icon,
    RefreshCw: icon,
    Share2: icon,
    Trash2: icon,
  };
});

import {
  getDefaultMusicPlayerActionLayout,
  mapContributionLayoutToMusicPlayerLayout,
  mapMusicPlayerLayoutToContributionLayout,
  normalizeMusicPlayerActionLayout,
  resolveMusicPlayerBarActionIds,
  resolveMusicPlayerChromeOverflowIds,
} from "./player-action-layout";

describe("music player action layout (track bar)", () => {
  const defaults = getDefaultMusicPlayerActionLayout();

  it("默认 bar 为三个高频曲目操作（置顶 / 下一首 / 加入列表）", () => {
    expect(defaults.bar).toEqual(["pin", "playNext", "addPlaylist"]);
    expect(resolveMusicPlayerBarActionIds(defaults)).toEqual(["pin", "playNext", "addPlaylist"]);
    expect(defaults.overflow).toEqual(["share", "exportZip", "refreshResources", "deleteTrack"]);
  });

  it("旧默认（详情外露）归一化为新默认", () => {
    expect(
      normalizeMusicPlayerActionLayout({
        bar: ["pin", "detail", "playNext"] as never,
        overflow: ["share", "addPlaylist", "exportZip", "refreshResources", "deleteTrack"],
        hidden: [],
        showBarLabels: true,
      }),
    ).toEqual({
      ...getDefaultMusicPlayerActionLayout(),
      showBarLabels: true,
    });
  });

  it("更旧默认（加入列表外露）归一化为新默认", () => {
    expect(
      normalizeMusicPlayerActionLayout({
        bar: ["pin", "addPlaylist", "playNext"],
        overflow: ["share", "detail", "exportZip", "refreshResources", "deleteTrack"] as never,
        hidden: [],
        showBarLabels: true,
      }),
    ).toEqual({
      ...getDefaultMusicPlayerActionLayout(),
      showBarLabels: true,
    });
  });

  it("旧 search/volume 布局被丢弃后回退默认", () => {
    expect(
      normalizeMusicPlayerActionLayout({
        bar: ["search", "volume"] as never,
        overflow: [],
        hidden: [],
      }),
    ).toEqual(getDefaultMusicPlayerActionLayout());
  });

  it("overflow 投影不含 bar 项；hidden 永不出现；detail 被丢弃", () => {
    const layout = normalizeMusicPlayerActionLayout({
      bar: ["pin"],
      overflow: ["share", "detail"] as never,
      hidden: ["deleteTrack"],
    });
    expect(resolveMusicPlayerChromeOverflowIds(layout, true)).toEqual(
      expect.arrayContaining(["share"]),
    );
    expect(resolveMusicPlayerChromeOverflowIds(layout, true)).not.toContain("detail");
    expect(resolveMusicPlayerChromeOverflowIds(layout, true)).not.toContain("pin");
    expect(resolveMusicPlayerChromeOverflowIds(layout, true)).not.toContain("deleteTrack");
  });

  it("透传并归一化 showBarLabels（公共显示完整）", () => {
    expect(defaults.showBarLabels).toBe(false);
    expect(
      normalizeMusicPlayerActionLayout({
        bar: ["pin"],
        overflow: ["share"],
        hidden: [],
        showBarLabels: true,
      }).showBarLabels,
    ).toBe(true);
  });

  it("短 id ↔ 侧栏 contribution id 双向映射", () => {
    const contribution = mapMusicPlayerLayoutToContributionLayout(defaults);
    expect(contribution.bar).toEqual(["music.pin", "music.play-next", "music.add-to-queue"]);
    expect(mapContributionLayoutToMusicPlayerLayout(contribution)).toEqual(defaults);
  });
});
