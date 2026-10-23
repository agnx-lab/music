// 场景：搜索菜单 hideBar fold — bar 培植项仍出现在菜单投影中。
import { describe, expect, it } from "vitest";
import { projectSearchMenuActionIds } from "./search-menu-layout";

describe("projectSearchMenuActionIds", () => {
  it("folds bar ids in front of overflow and drops hidden", () => {
    expect(
      projectSearchMenuActionIds({
        bar: ["saveSong"],
        overflow: ["play", "playNext", "addPlaylist"],
        hidden: ["playNext"],
        showBarLabels: false,
      }),
    ).toEqual(["saveSong", "play", "addPlaylist"]);
  });

  it("keeps overflow-only default order", () => {
    expect(
      projectSearchMenuActionIds({
        bar: [],
        overflow: ["play", "playNext", "addPlaylist", "saveSong"],
        hidden: [],
        showBarLabels: false,
      }),
    ).toEqual(["play", "playNext", "addPlaylist", "saveSong"]);
  });
});
