// 场景：能力目录 — 直连源/浏览器延后/聚合选择规则，避免 service 硬编码漂移。
import { describe, expect, it } from "vitest";
import {
  getMusicProviderReferer,
  isDeferredBrowserProviderId,
  listWiredDirectSearchProviderIds,
  shouldIncludeProviderForSelection,
} from "./provider-catalog";

describe("provider-catalog", () => {
  it("lists only wired direct search providers", () => {
    const ids = listWiredDirectSearchProviderIds();
    expect(ids).toContain("aiguo");
    expect(ids).toContain("pixabay");
    expect(ids).toContain("soundstripe");
    expect(ids).toContain("audiocom");
    expect(ids).toContain("muzvox");
    expect(ids).not.toContain("myspace");
    expect(ids).not.toContain("txqq");
    expect(ids).not.toContain("local");
  });

  it("marks browser deferred sources and referers", () => {
    expect(isDeferredBrowserProviderId("pixabay")).toBe(true);
    expect(isDeferredBrowserProviderId("audiocom")).toBe(false);
    expect(getMusicProviderReferer("audiocom")).toBe("https://audio.com/");
    expect(getMusicProviderReferer("muzvox")).toBe("https://muzvox.org/");
    expect(isDeferredBrowserProviderId("muzvox")).toBe(false);
  });

  it("includes aggregators when platform filters selected", () => {
    expect(shouldIncludeProviderForSelection("txqq", ["netease", "qq"])).toBe(true);
    expect(shouldIncludeProviderForSelection("sidecar", ["local"])).toBe(false);
    expect(shouldIncludeProviderForSelection("audiocom", ["audiocom"])).toBe(true);
    expect(shouldIncludeProviderForSelection("audiocom", ["pixabay"])).toBe(false);
  });
});
