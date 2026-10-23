// 场景：CDN 封面按展示场景选清晰度 — 大封面/落盘用原图，列表/小图标才用缩略图。

export type CoverUrlQuality = "thumb" | "display" | "original";

const NETEASE_HOST_RE = /(?:^|\.)music\.126\.net$/i;
const QQ_SIZE_RE = /(T\d+R)\d+x\d+(M\d+)/i;
const PIXABAY_SIZE_RE = /_(\d+)x(\d+)(\.[a-z0-9]+)(?:\?|#|$)/i;

function neteaseParamFor(quality: CoverUrlQuality): string | null {
  if (quality === "thumb") {
    return "300y300";
  }
  if (quality === "display") {
    return "800y800";
  }
  // original：去掉 param，拿 CDN 原图
  return null;
}

function qqEdgeFor(quality: CoverUrlQuality): number {
  if (quality === "thumb") {
    return 300;
  }
  if (quality === "display") {
    return 800;
  }
  return 800;
}

function pixabayEdgeFor(quality: CoverUrlQuality): number | null {
  if (quality === "thumb") {
    return 200;
  }
  if (quality === "display") {
    return 1280;
  }
  return null;
}

function rewriteNetease(url: URL, quality: CoverUrlQuality): string {
  const param = neteaseParamFor(quality);
  if (param == null) {
    url.searchParams.delete("param");
  } else {
    url.searchParams.set("param", param);
  }
  return url.toString();
}

function rewriteQqPath(pathname: string, quality: CoverUrlQuality): string {
  const edge = qqEdgeFor(quality);
  return pathname.replace(QQ_SIZE_RE, `$1${edge}x${edge}$2`);
}

function rewritePixabay(url: string, quality: CoverUrlQuality): string {
  const edge = pixabayEdgeFor(quality);
  if (edge == null) {
    // 原图：去掉尺寸后缀（若 CDN 支持无尺寸路径则更好；否则保持 display）
    return url.replace(PIXABAY_SIZE_RE, `_1280x720$3`);
  }
  return url.replace(PIXABAY_SIZE_RE, `_${edge}x${edge}$3`);
}

/**
 * 按展示场景改写已知 CDN 封面 URL。
 * 非 http(s)、本地路径、blob/data、未知 CDN → 原样返回。
 */
export function resolveCoverUrlQuality(
  uri: string | null | undefined,
  quality: CoverUrlQuality,
): string {
  const raw = uri?.trim() || "";
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return raw;
  }
  try {
    const url = new URL(raw);
    if (NETEASE_HOST_RE.test(url.hostname)) {
      return rewriteNetease(url, quality);
    }
    if (QQ_SIZE_RE.test(url.pathname)) {
      url.pathname = rewriteQqPath(url.pathname, quality);
      return url.toString();
    }
    if (/pixabay\.com$/i.test(url.hostname) && PIXABAY_SIZE_RE.test(url.pathname + url.search)) {
      return rewritePixabay(url.toString(), quality);
    }
  } catch {
    return raw;
  }
  return raw;
}

/** 入库 / 大封面 / 落盘：尽量拿可解析的最高清 URL。 */
export function coverUrlForStorage(uri: string | null | undefined): string {
  return resolveCoverUrlQuality(uri, "original");
}

/** 播放器主封面（hero）。 */
export function coverUrlForHero(uri: string | null | undefined): string {
  return resolveCoverUrlQuality(uri, "original");
}

/** 列表 / Tab / 底栏小图。 */
export function coverUrlForThumb(uri: string | null | undefined): string {
  return resolveCoverUrlQuality(uri, "thumb");
}
