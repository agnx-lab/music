// 场景：爱听系镜像轮换 — 6uq / 78497 路径不同；验证后搜索；play.php 取直链。
import { afterEach, describe, expect, it } from "vitest";
import { setMusicSidecarFetchJson } from "./sidecar-fetch";
import { aiguoMusicProvider, listAiguoMirrors, resetAiguoSessionCache } from "./aiguo-provider";

afterEach(() => {
  setMusicSidecarFetchJson(null);
  resetAiguoSessionCache();
});

describe("aiguoMusicProvider", () => {
  it("lists both mirrors and can fail over from 6uq to 78497", async () => {
    const mirrors = listAiguoMirrors();
    expect(mirrors.some((item) => item.origin.includes("6uq.cn"))).toBe(true);
    expect(mirrors.some((item) => item.origin.includes("78497.com"))).toBe(true);

    setMusicSidecarFetchJson(async (url, init) => {
      const href = String(url);
      if (href.includes("6uq.cn") && href.includes("/so/")) {
        throw new Error("6uq down");
      }
      if (href.includes("78497.com") && href.includes("/so/")) {
        return {
          raw: `<a href="/mp3/ce7c81c15be0391393316d294c70519b.html" class="url" target="_mp3">陈佳 - 月下煮茶【主题曲】</a>`,
        };
      }
      if (href.includes("play.php")) {
        expect(init?.method).toBe("POST");
        return {
          msg: 1,
          url: "/m/xwuqu.mp3",
          pic: "https://img.example.com/a.jpg",
        };
      }
      // captcha / home for 6uq
      if (href.includes("6uq.cn") && init?.method === "POST") {
        return { raw: "<html><title>ok</title></html>" };
      }
      if (href.includes("6uq.cn")) {
        return {
          raw: `<html><title>安全验证</title><input type="hidden" name="csrf_token" value="x"><div>安全人机验证</div></html>`,
        };
      }
      return { raw: "<html></html>" };
    });

    resetAiguoSessionCache();
    const page = await aiguoMusicProvider.search({
      text: "阿嫲的情书",
      scope: "track",
      providerIds: ["aiguo"],
    });
    expect(page.tracks.length).toBeGreaterThanOrEqual(1);
    expect(page.tracks[0]?.ref.remoteId.startsWith("78497:")).toBe(true);
    expect(page.tracks[0]).toMatchObject({
      title: "月下煮茶",
      artist: "陈佳",
    });

    const playable = await aiguoMusicProvider.resolvePlayable?.(page.tracks[0]!.ref);
    expect(playable?.url).toBe("https://www.78497.com/m/xwuqu.mp3");
  });

  it("parses 6uq play links when that mirror succeeds", async () => {
    setMusicSidecarFetchJson(async (url, init) => {
      const href = String(url);
      if (href.includes("/js/play.php")) {
        return {
          msg: 1,
          url: "https://kw-lv.example.com/demo.mp3",
        };
      }
      if (href.includes("6uq.cn") && href.includes("/so/")) {
        return {
          raw: `<a href="https://www.6uq.cn/play/eXdudmt5eW52Zg.html">王雪玲《阿嬷的情书》[MP3_LRC]</a>`,
        };
      }
      if (href.includes("6uq.cn") && init?.method === "POST") {
        return { raw: "<html><title>ok</title></html>" };
      }
      if (href.includes("6uq.cn")) {
        return {
          raw: `<html><title>安全验证</title><input type="hidden" name="csrf_token" value="abc"><div>安全人机验证</div></html>`,
        };
      }
      return { raw: "<html></html>" };
    });

    resetAiguoSessionCache();
    const page = await aiguoMusicProvider.search({
      text: "阿嬷的情书",
      scope: "track",
      providerIds: ["aiguo"],
    });
    expect(page.tracks[0]).toMatchObject({
      title: "阿嬷的情书",
      artist: "王雪玲",
      ref: { providerId: "aiguo", remoteId: "6uq:eXdudmt5eW52Zg" },
    });
  });
});
