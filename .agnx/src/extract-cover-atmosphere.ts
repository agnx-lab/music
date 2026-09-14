// 场景：自研封面主色提取 — 一次取色产出 light/dark 双套，供沉浸按 Theme 选用。
export interface AtmosphereColorBand {
  primary: string;
  secondary?: string;
  tertiary?: string;
}

/** 双套氛围：开沉浸时存齐，切 Theme 只换渲染套，不反推 Theme。 */
export interface ExtractedAtmospherePalette {
  dark: AtmosphereColorBand;
  light: AtmosphereColorBand;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** 取色算法版本：双套 light/dark 为 3；旧单套缓存一律重算。 */
export const ATMOSPHERE_EXTRACT_VERSION = 3;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((channel) => clampByte(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
  }
  h /= 6;
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) {
    const v = clampByte(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, tRaw: number) => {
    let t = tRaw;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: clampByte(hue2rgb(p, q, h + 1 / 3) * 255),
    g: clampByte(hue2rgb(p, q, h) * 255),
    b: clampByte(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/** 用压色前的封面主色判定封面偏亮/偏暗（仅作参考；双套仍两套都生成）。 */
export function classifyCoverLuminance(rgb: Rgb): "dark" | "light" {
  return rgbToHsl(rgb).l < 0.45 ? "dark" : "light";
}

/**
 * 把主色拉到适合整窗染色的明度带。
 * dark → 深壳；light → 浅壳。
 */
export function tuneForAtmosphere(rgb: Rgb, luminance: "dark" | "light"): Rgb {
  const hsl = rgbToHsl(rgb);
  const s = Math.max(0.28, Math.min(0.72, hsl.s * 1.05));
  const l =
    luminance === "light"
      ? Math.max(0.58, Math.min(0.84, hsl.l < 0.58 ? 0.64 : hsl.l))
      : Math.max(0.16, Math.min(0.42, hsl.l));
  return hslToRgb(hsl.h, s, l);
}

function bandFromRaw(
  primary: Rgb,
  secondary: Rgb | undefined,
  tertiary: Rgb | undefined,
  luminance: "dark" | "light",
): AtmosphereColorBand {
  const primaryRgb = tuneForAtmosphere(primary, luminance);
  const secondaryRgb = secondary ? tuneForAtmosphere(secondary, luminance) : undefined;
  const tertiaryRgb = tertiary ? tuneForAtmosphere(tertiary, luminance) : undefined;
  return {
    primary: rgbToHex(primaryRgb),
    secondary: secondaryRgb ? rgbToHex(secondaryRgb) : undefined,
    tertiary: tertiaryRgb ? rgbToHex(tertiaryRgb) : undefined,
  };
}

/** 按当前 Theme 亮度选出要推给宿主的那一套。 */
export function pickAtmosphereBandForTheme(
  palette: ExtractedAtmospherePalette,
  themeBrightness: "light" | "dark",
): AtmosphereColorBand & { luminance: "light" | "dark" } {
  const band = themeBrightness === "light" ? palette.light : palette.dark;
  return { ...band, luminance: themeBrightness };
}

function scorePixel(rgb: Rgb): number {
  const { s, l } = rgbToHsl(rgb);
  if (l < 0.04 || l > 0.96) {
    return 0;
  }
  if (s < 0.06) {
    const grayBias = Math.max(1 - Math.abs(l - 0.4), 1 - Math.abs(l - 0.72));
    return 0.08 * Math.max(0.2, grayBias);
  }
  const darkBias = 1 - Math.abs(l - 0.35) * 1.6;
  const lightBias = 1 - Math.abs(l - 0.72) * 1.6;
  const midL = Math.max(darkBias, lightBias);
  return s * 1.4 * Math.max(0.15, midL);
}

function bucketKey(rgb: Rgb): string {
  const q = (channel: number) => Math.floor(channel / 24);
  return `${q(rgb.r)}-${q(rgb.g)}-${q(rgb.b)}`;
}

function averageRgb(data: Uint8ClampedArray, pixelCount: number): Rgb | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const step = Math.max(1, Math.floor(pixelCount / 2000));
  for (let i = 0; i < pixelCount; i += step) {
    const offset = i * 4;
    const alpha = data[offset + 3] ?? 255;
    if (alpha < 160) {
      continue;
    }
    r += data[offset] ?? 0;
    g += data[offset + 1] ?? 0;
    b += data[offset + 2] ?? 0;
    n += 1;
  }
  if (n === 0) {
    return null;
  }
  return { r: r / n, g: g / n, b: b / n };
}

function extractFromImageData(
  data: Uint8ClampedArray,
  pixelCount: number,
): ExtractedAtmospherePalette | null {
  const buckets = new Map<string, { sum: Rgb; weight: number; count: number }>();
  const step = Math.max(1, Math.floor(pixelCount / 4000));
  for (let i = 0; i < pixelCount; i += step) {
    const offset = i * 4;
    const alpha = data[offset + 3] ?? 255;
    if (alpha < 200) {
      continue;
    }
    const rgb = {
      r: data[offset] ?? 0,
      g: data[offset + 1] ?? 0,
      b: data[offset + 2] ?? 0,
    };
    const weight = scorePixel(rgb);
    if (weight <= 0) {
      continue;
    }
    const key = bucketKey(rgb);
    const existing = buckets.get(key);
    if (existing) {
      existing.sum.r += rgb.r * weight;
      existing.sum.g += rgb.g * weight;
      existing.sum.b += rgb.b * weight;
      existing.weight += weight;
      existing.count += 1;
    } else {
      buckets.set(key, {
        sum: { r: rgb.r * weight, g: rgb.g * weight, b: rgb.b * weight },
        weight,
        count: 1,
      });
    }
  }

  const ranked = [...buckets.values()]
    .map((bucket) => {
      const rgb = {
        r: bucket.sum.r / bucket.weight,
        g: bucket.sum.g / bucket.weight,
        b: bucket.sum.b / bucket.weight,
      };
      return {
        rgb,
        score: bucket.weight,
      };
    })
    .sort((a, b) => b.score - a.score);

  const fallback = ranked.length === 0 ? averageRgb(data, pixelCount) : null;
  if (ranked.length === 0 && !fallback) {
    return null;
  }

  const rawPrimary = ranked[0]?.rgb ?? fallback!;
  const rawSecondary = ranked[1]?.rgb;
  const rawTertiary = ranked[2]?.rgb;

  return {
    dark: bandFromRaw(rawPrimary, rawSecondary, rawTertiary, "dark"),
    light: bandFromRaw(rawPrimary, rawSecondary, rawTertiary, "light"),
  };
}

function loadHtmlImage(uri: string, crossOrigin: string | null): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    const onLoad = () => {
      cleanup();
      resolve(img);
    };
    const onError = () => {
      cleanup();
      reject(new Error("image load failed"));
    };
    const cleanup = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    img.src = uri;
  });
}

function isSameOriginFriendlyUri(uri: string): boolean {
  if (uri.startsWith("data:") || uri.startsWith("blob:")) {
    return true;
  }
  if (typeof window === "undefined" || !window.location?.origin) {
    return false;
  }
  try {
    return new URL(uri, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function paletteFromHtmlImage(image: HTMLImageElement): ExtractedAtmospherePalette | null {
  const maxSide = 64;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
  const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }
  ctx.drawImage(image, 0, 0, width, height);
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return null;
  }
  return extractFromImageData(imageData.data, width * height);
}

async function extractAtmospherePaletteFromCoverUri(
  coverUri: string,
): Promise<ExtractedAtmospherePalette | null> {
  const uri = coverUri.trim();
  if (!uri || typeof document === "undefined") {
    return null;
  }
  try {
    if (isSameOriginFriendlyUri(uri)) {
      const image = await loadHtmlImage(uri, null);
      return paletteFromHtmlImage(image);
    }
    const image = await loadHtmlImage(uri, "anonymous");
    return paletteFromHtmlImage(image);
  } catch {
    try {
      const image = await loadHtmlImage(uri, null);
      return paletteFromHtmlImage(image);
    } catch {
      return null;
    }
  }
}

/** 稳定封面 key：禁止用 blob 临时 URL 当缓存键。 */
export function atmosphereCoverKey(coverUri: string | null | undefined): string | null {
  const uri = coverUri?.trim() || "";
  if (!uri || uri.startsWith("blob:")) {
    return null;
  }
  return uri;
}

function isDualBandPalette(
  cached: unknown,
): cached is ExtractedAtmospherePalette & { coverKey?: string; extractVersion?: number } {
  if (!cached || typeof cached !== "object") {
    return false;
  }
  const record = cached as Record<string, unknown>;
  const dark = record.dark as Record<string, unknown> | undefined;
  const light = record.light as Record<string, unknown> | undefined;
  return (
    typeof dark?.primary === "string" &&
    typeof light?.primary === "string" &&
    record.extractVersion === ATMOSPHERE_EXTRACT_VERSION
  );
}

/**
 * 同封面只取色一次：命中双套 v3 缓存直接返回；否则算完写入 track.atmospherePalette。
 */
export async function ensureTrackAtmospherePalette(input: {
  trackId: string;
  /** 与曲目 coverUri 对齐的稳定键（落盘路径 / https，勿传 blob） */
  coverKeyUri: string | null | undefined;
  /** 实际读像素用的 URI（可为 resolve 后的 blob） */
  extractUri: string;
}): Promise<ExtractedAtmospherePalette | null> {
  const { useMusicDemoStore } = await import("./store");
  const key = atmosphereCoverKey(input.coverKeyUri);
  const track = useMusicDemoStore.getState().getTrack(input.trackId);
  const cached = track?.atmospherePalette;
  if (isDualBandPalette(cached) && key && cached.coverKey === key) {
    return { dark: cached.dark, light: cached.light };
  }
  const palette = await extractAtmospherePaletteFromCoverUri(input.extractUri);
  if (!palette) {
    return null;
  }
  if (key) {
    const still = useMusicDemoStore.getState().getTrack(input.trackId);
    if (atmosphereCoverKey(still?.coverUri) === key) {
      useMusicDemoStore.getState().updateTrack(input.trackId, {
        atmospherePalette: {
          dark: palette.dark,
          light: palette.light,
          coverKey: key,
          extractVersion: ATMOSPHERE_EXTRACT_VERSION,
        },
      });
    }
  }
  return palette;
}
