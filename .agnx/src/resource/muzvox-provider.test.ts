// 场景：MuzVox 源 — 搜索 HTML 映射、remoteId 精确 resolve、失败路径。
import { afterEach, describe, expect, it } from "vitest";
import {
  buildMuzvoxSearchUrl,
  extractMuzvoxDownloadToken,
  mapMuzvoxSearchHtml,
  muzvoxMusicProvider,
  normalizeMuzvoxQueryText,
  parseMuzvoxRemoteId,
} from "./muzvox-provider";
import { setMusicSidecarFetchJson } from "./sidecar-fetch";

const SAMPLE_HTML = `
<div class="data __adv_list_track">
<div class="img"><div class="cover"><span><img src="https://static.muzvox.org/jpg/cover-a.jpg" alt="Artist A"></span></div></div>
<div class="track">
<div class="name">
<div class="name-text"><span class="artist __adv_artist"><a href="/search/Artist%20A">Artist A</a></span> - <span class="title __adv_name">Song A</span></div>
<div class="name-time">03:48</div>
</div>
<div class="play-download">
<div class="pd-cell"><div class="play __adv_stream">слушать</div></div>
<div class="pd-cell"><a class="link" href="//storage.muzvox.org/mp3-download/tokenaaa111/hashshared/Artist%20A%20-%20Song%20A.mp3" target="_blank"><div class="download __adv_download">скачать</div></a></div>
</div>
</div>
</div>
<div class="rewind"></div>
<div class="data __adv_list_track">
<div class="img"><div class="cover"><span><img src="//static.muzvox.org/jpg/cover-b.jpg" alt="Artist B"></span></div></div>
<div class="track">
<div class="name">
<div class="name-text"><span class="artist __adv_artist">Artist B</span> - <span class="title __adv_name">Song B</span></div>
<div class="name-time">02:33</div>
</div>
<div class="play-download">
<div class="pd-cell"><a class="link" href="//storage.muzvox.org/mp3-download/tokenbbb222/hashshared/Artist%20B%20-%20Song%20B.mp3" target="_blank"><div class="download">скачать</div></a></div>
</div>
</div>
</div>
`;

afterEach(() => {
  setMusicSidecarFetchJson(null);
});

describe("muzvox helpers", () => {
  it("normalizes search url and parses remote ids", () => {
    expect(normalizeMuzvoxQueryText("https://muzvox.org/search/Justin%20Bieber")).toBe(
      "Justin Bieber",
    );
    expect(buildMuzvoxSearchUrl("Justin Bieber")).toBe("https://muzvox.org/search/Justin%20Bieber");
    expect(parseMuzvoxRemoteId("tokenaaa111")).toEqual({ token: "tokenaaa111" });
    expect(parseMuzvoxRemoteId("tokenaaa111/hashshared/file.mp3")).toEqual({
      token: "tokenaaa111",
    });
    expect(parseMuzvoxRemoteId("bad/id")).toBeNull();
    expect(
      extractMuzvoxDownloadToken(
        "https://storage.muzvox.org/mp3-download/tokenaaa111/hashshared/a.mp3",
      ),
    ).toBe("tokenaaa111");
  });

  it("maps only tracks with downloadable mp3 urls", () => {
    const tracks = mapMuzvoxSearchHtml(SAMPLE_HTML, 10, "https://muzvox.org/search/test");
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({
      title: "Song A",
      artist: "Artist A",
      durationMs: 228_000,
      playableUrl:
        "https://storage.muzvox.org/mp3-download/tokenaaa111/hashshared/Artist%20A%20-%20Song%20A.mp3",
      ref: {
        providerId: "muzvox",
        remoteId: "tokenaaa111",
        pageUrl: "https://muzvox.org/search/test",
      },
    });
    expect(tracks[1]?.ref.remoteId).toBe("tokenbbb222");
    expect(tracks[1]?.coverUrl).toContain("static.muzvox.org");
  });
});

describe("muzvoxMusicProvider", () => {
  it("search returns inline playable tracks and debug url", async () => {
    setMusicSidecarFetchJson(async (url) => {
      expect(String(url)).toContain("muzvox.org/search/");
      return { raw: SAMPLE_HTML };
    });
    const page = await muzvoxMusicProvider.search({
      text: "https://muzvox.org/search/Justin%20Bieber",
      scope: "track",
      providerIds: ["muzvox"],
    });
    expect(page.tracks).toHaveLength(2);
    expect(page.tracks[0]?.playableUrl).toContain("storage.muzvox.org/mp3-download/");
    expect(page.hasMore).toBe(false);
    expect(page.debugSearchRequests?.[0]?.providerId).toBe("muzvox");
  });

  it("search writes providerErrors on failure", async () => {
    setMusicSidecarFetchJson(async () => {
      throw new Error("boom");
    });
    const page = await muzvoxMusicProvider.search({ text: "lofi", scope: "track" });
    expect(page.tracks).toEqual([]);
    expect(page.providerErrors?.[0]).toMatchObject({
      providerId: "muzvox",
      message: "boom",
    });
  });

  it("resolvePlayable exact-matches remoteId and rejects mismatch", async () => {
    setMusicSidecarFetchJson(async () => ({ raw: SAMPLE_HTML }));

    const ok = await muzvoxMusicProvider.resolvePlayable?.({
      providerId: "muzvox",
      remoteId: "tokenbbb222",
      pageUrl: "https://muzvox.org/search/test",
    });
    expect(ok).toMatchObject({
      providerId: "muzvox",
      remoteId: "tokenbbb222",
      url: "https://storage.muzvox.org/mp3-download/tokenbbb222/hashshared/Artist%20B%20-%20Song%20B.mp3",
      ext: "mp3",
    });
    expect(ok?.title).toBeUndefined();
    expect(ok?.artist).toBeUndefined();

    const mismatch = await muzvoxMusicProvider.resolvePlayable?.({
      providerId: "muzvox",
      remoteId: "missingtoken999",
      pageUrl: "https://muzvox.org/search/test",
    });
    expect(mismatch).toBeNull();

    expect(
      await muzvoxMusicProvider.resolvePlayable?.({
        providerId: "pixabay",
        remoteId: "tokenaaa111",
      }),
    ).toBeNull();
  });
});
