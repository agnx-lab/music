// 场景：搜索历史合并 — 去重、限量、最新在前。
import { describe, expect, it } from "vitest";
import { mergeMusicSearchHistoryForTest } from "./store";

describe("mergeMusicSearchHistoryForTest", () => {
  it("prepends new query and dedupes", () => {
    expect(mergeMusicSearchHistoryForTest(["稻香", "晴天"], "周杰伦")).toEqual([
      "周杰伦",
      "稻香",
      "晴天",
    ]);
  });

  it("moves repeated query to front", () => {
    expect(mergeMusicSearchHistoryForTest(["周杰伦", "稻香"], "稻香")).toEqual(["稻香", "周杰伦"]);
  });

  it("ignores blank query", () => {
    expect(mergeMusicSearchHistoryForTest(["周杰伦"], "   ")).toEqual(["周杰伦"]);
  });
});
