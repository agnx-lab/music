// 场景：真实打 txqq 四平台，断言搜歌/可播直链/下载字节；失败则能力表不得标 ✅。
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatCapabilityTableRows,
  probeAllTxqqPlatforms,
  probeTxqqPlatformCapability,
} from "./platform-capability-probe";

const LIVE = process.env.AGNX_MUSIC_LIVE !== "0";

(LIVE ? describe : describe.skip)("txqq platform capability live", () => {
  it("probes netease/qq/kugou/kuwo with real search + download", async () => {
    const probes = await probeAllTxqqPlatforms({ keyword: "晴天", download: true });
    expect(probes).toHaveLength(4);

    const netease = probes.find((item) => item.providerId === "netease");
    const qq = probes.find((item) => item.providerId === "qq");
    expect(netease?.searchOk).toBe(true);
    expect(qq?.searchOk).toBe(true);

    const anyPlayable = probes.some((item) => item.playableCount > 0);
    expect(anyPlayable).toBe(true);

    const anyDownload = probes.some((item) => item.downloadOk && item.downloadBytes >= 1000);
    expect(anyDownload).toBe(true);

    // 打印矩阵，便于对照更新文档（测试日志即证据）
    // eslint-disable-next-line no-console -- live probe evidence
    console.log(
      "\n[capability-matrix]\n" +
        probes
          .map(
            (p) =>
              `${p.providerId}: search=${p.searchOk} hits=${p.hitCount} playable=${p.playableCount} ` +
              `download=${p.downloadOk} bytes=${p.downloadBytes} lyrics=${p.hasLyricsText} cover=${p.hasCover}` +
              (p.error ? ` err=${p.error}` : ""),
          )
          .join("\n") +
        "\n" +
        formatCapabilityTableRows(probes).join("\n"),
    );
  }, 120_000);

  it("downloads first playable netease audio into a real temp file", async () => {
    const probe = await probeTxqqPlatformCapability({
      source: "netease",
      keyword: "晴天",
      download: true,
    });
    expect(probe.downloadOk).toBe(true);
    expect(probe.downloadBytes).toBeGreaterThanOrEqual(1000);

    const dir = path.join("/tmp", "agnx-music-live-download");
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `netease-${Date.now()}.bin`);
    // 再拉一次写入磁盘，证明「能拿到手里」
    const body = new URLSearchParams({
      input: "晴天",
      filter: "name",
      type: "netease",
      page: "1",
    }).toString();
    const searchRes = await fetch("https://music.txqq.pro/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        Origin: "https://music.txqq.pro",
        Referer: "https://music.txqq.pro/",
      },
      body,
    });
    const json = (await searchRes.json()) as {
      data?: Array<{ url?: string; title?: string }>;
    };
    const url = json.data?.find((item) => typeof item.url === "string" && item.url.trim())?.url;
    expect(url).toBeTruthy();
    const audioRes = await fetch(url!, { headers: { Referer: "https://music.txqq.pro/" } });
    const bytes = Buffer.from(await audioRes.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThanOrEqual(1000);
    await writeFile(filePath, bytes);
    const info = await stat(filePath);
    expect(info.size).toBe(bytes.byteLength);
    // eslint-disable-next-line no-console -- live evidence path
    console.log(`[live-download] wrote ${info.size} bytes -> ${filePath}`);
  }, 120_000);
});
