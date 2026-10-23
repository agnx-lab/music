// 场景：封面 CDN 清晰度改写 — 大封面去缩略 param，小封面保留/压到 thumb。
import { describe, expect, it } from "vitest";
import {
  coverUrlForHero,
  coverUrlForStorage,
  coverUrlForThumb,
  resolveCoverUrlQuality,
} from "./cover-url-quality";

describe("resolveCoverUrlQuality", () => {
  it("upgrades NetEase param for hero/storage and keeps thumb small", () => {
    const src = "http://p1.music.126.net/abc==/109951.jpg?param=300x300";
    expect(coverUrlForThumb(src)).toContain("param=300y300");
    expect(coverUrlForHero(src)).not.toContain("param=");
    expect(coverUrlForStorage(src)).not.toContain("param=");
  });

  it("rewrites QQ gtimg RNxN path by quality", () => {
    const src = "https://y.gtimg.cn/music/photo_new/T002R300x300M000abc.jpg";
    expect(coverUrlForThumb(src)).toContain("T002R300x300M000");
    expect(resolveCoverUrlQuality(src, "display")).toContain("T002R800x800M000");
    expect(coverUrlForHero(src)).toContain("T002R800x800M000");
  });

  it("leaves local and unknown URLs unchanged", () => {
    expect(coverUrlForHero("/tmp/cover.jpg")).toBe("/tmp/cover.jpg");
    expect(coverUrlForThumb("https://static.muzvox.org/jpg/abc.jpg")).toBe(
      "https://static.muzvox.org/jpg/abc.jpg",
    );
  });
});
