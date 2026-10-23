// 场景：Music 封面 → 宿主 content backdrop URI 解析（优先可持久化 http）。
import { describe, expect, it, vi } from "vitest";
import { resolveMusicCoverBackdropImageUri } from "./resolve-cover-backdrop-uri";

describe("resolveMusicCoverBackdropImageUri", () => {
  it("http cover 升到 hero 清晰度", async () => {
    const uri = await resolveMusicCoverBackdropImageUri({
      hostApi: { files: { resolveObjectUrl: vi.fn() } } as never,
      coverUri: "http://p1.music.126.net/abc==/109951.jpg?param=300x300",
    });
    expect(uri).toContain("http://");
    expect(uri).not.toContain("param=");
  });

  it("本地路径走 resolveObjectUrl", async () => {
    const resolveObjectUrl = vi.fn(async () => "blob:resolved");
    const uri = await resolveMusicCoverBackdropImageUri({
      hostApi: { files: { resolveObjectUrl } } as never,
      coverUri: "/tmp/cover.jpg",
    });
    expect(resolveObjectUrl).toHaveBeenCalledWith("/tmp/cover.jpg");
    expect(uri).toBe("blob:resolved");
  });

  it("本地失败时可回退 displayUri", async () => {
    const uri = await resolveMusicCoverBackdropImageUri({
      hostApi: {
        files: {
          resolveObjectUrl: vi.fn(async () => {
            throw new Error("fail");
          }),
        },
      } as never,
      coverUri: "/tmp/cover.jpg",
      displayUri: "https://cdn.example/fallback.jpg",
    });
    expect(uri).toBe("https://cdn.example/fallback.jpg");
  });
});
