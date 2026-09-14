// 场景：自研 sidecar contract — 校验第三方搜索 payload 归一化。
import { describe, expect, it } from "vitest";
import { normalizeThirdPartySearchPayload } from "./sidecar-contract";

describe("sidecar-contract", () => {
  it("normalizes nested data.songs payloads", () => {
    const envelope = normalizeThirdPartySearchPayload({
      code: 200,
      data: {
        songs: [{ id: "1", name: "晴天" }],
        albums: null,
      },
    });
    expect(envelope.items).toHaveLength(1);
    expect((envelope.items[0] as { name?: string }).name).toBe("晴天");
  });

  it("normalizes nested data.albums payloads", () => {
    const envelope = normalizeThirdPartySearchPayload({
      code: 200,
      data: {
        albums: [{ id: "a1", name: "叶惠美" }],
      },
    });
    expect(envelope.items).toHaveLength(1);
    expect((envelope.items[0] as { name?: string }).name).toBe("叶惠美");
  });
});
