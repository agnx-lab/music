// 场景：下载落盘清单字段与文件名清洗的单元测试。
import { describe, expect, it } from "vitest";

function sanitizeFileBase(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return cleaned.slice(0, 80) || "track";
}

function musicFileNameFromUri(uri: string | null | undefined): string | null {
  if (!uri?.trim()) {
    return null;
  }
  const cleaned = uri.trim().split(/[?#]/)[0] ?? "";
  const parts = cleaned.split(/[/\\]/).filter(Boolean);
  const name = parts[parts.length - 1]?.trim();
  return name || null;
}

describe("download-bundle helpers", () => {
  it("sanitizes unsafe file name characters", () => {
    expect(sanitizeFileBase('晴天/周杰伦:"VIP"')).toBe("晴天_周杰伦_VIP_");
  });

  it("falls back when name empty", () => {
    expect(sanitizeFileBase("   ")).toBe("track");
  });

  it("extracts file name from path and url", () => {
    expect(musicFileNameFromUri("/Users/a/.agnx-dev/apps/data/x/吾名-Yuri.m4a")).toBe(
      "吾名-Yuri.m4a",
    );
    expect(
      musicFileNameFromUri("https://y.gtimg.cn/music/photo_new/T002R300x300M000.jpg?a=1"),
    ).toBe("T002R300x300M000.jpg");
    expect(musicFileNameFromUri(null)).toBeNull();
  });
});
