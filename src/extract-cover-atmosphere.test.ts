// 场景：封面取色产出 light/dark 双套；按 Theme 选用对应套。
import { describe, expect, it } from "vitest";
import {
  classifyCoverLuminance,
  pickAtmosphereBandForTheme,
  tuneForAtmosphere,
} from "./extract-cover-atmosphere";

describe("classifyCoverLuminance", () => {
  it("marks bright pastel covers as light", () => {
    expect(classifyCoverLuminance({ r: 230, g: 220, b: 200 })).toBe("light");
  });

  it("marks dark covers as dark", () => {
    expect(classifyCoverLuminance({ r: 40, g: 30, b: 20 })).toBe("dark");
  });
});

describe("tuneForAtmosphere dual bands", () => {
  it("produces distinct light and dark bands from the same raw color", () => {
    const raw = { r: 180, g: 140, b: 100 };
    const dark = tuneForAtmosphere(raw, "dark");
    const light = tuneForAtmosphere(raw, "light");
    const lOf = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      return (max + min) / 2;
    };
    expect(lOf(dark)).toBeLessThan(0.45);
    expect(lOf(light)).toBeGreaterThanOrEqual(0.58);
  });
});

describe("pickAtmosphereBandForTheme", () => {
  it("picks light band for light theme and dark for dark theme", () => {
    const palette = {
      dark: { primary: "#402010" },
      light: { primary: "#F0E0D0" },
    };
    expect(pickAtmosphereBandForTheme(palette, "light").primary).toBe("#F0E0D0");
    expect(pickAtmosphereBandForTheme(palette, "light").luminance).toBe("light");
    expect(pickAtmosphereBandForTheme(palette, "dark").primary).toBe("#402010");
    expect(pickAtmosphereBandForTheme(palette, "dark").luminance).toBe("dark");
  });
});
