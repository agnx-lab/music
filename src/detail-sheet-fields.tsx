// hmr-bust: music-detail-host-segmented-oncard
// 场景：音乐详情配置行内控件 — 滑条/缓存分钟数；开/关与歌词疏密改走宿主 segmented。
/* oxlint-disable eslint-plugin-react-perf(jsx-no-new-array-as-prop, jsx-no-new-function-as-prop, jsx-no-new-object-as-prop) -- detail row widgets */
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet as RNStyleSheet,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";
import { useMusicDemoStore } from "./store";

async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("clipboard unavailable");
}

function DetailRangeSlider(props: {
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
  testID: string;
  accessibilityLabel: string;
}): ReactElement {
  const { theme } = useUnistyles();
  const { value, min, max, step, formatValue, onChange, testID, accessibilityLabel } = props;
  const trackWidthRef = useRef(1);
  const span = max - min || 1;
  const fillRatio = Math.min(1, Math.max(0, (value - min) / span));

  const commitFromRatio = useCallback(
    (ratio: number) => {
      const clamped = Math.min(1, Math.max(0, ratio));
      const raw = min + clamped * span;
      const stepped = Math.round(raw / step) * step;
      onChange(Math.min(max, Math.max(min, stepped)));
    },
    [max, min, onChange, span, step],
  );

  const handleWebChange = useCallback(
    (event: { target: { value: string } }) => {
      onChange(Number(event.target.value));
    },
    [onChange],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    trackWidthRef.current = Math.max(1, event.nativeEvent.layout.width);
  }, []);

  const changeFromEvent = useCallback(
    (event: GestureResponderEvent) => {
      commitFromRatio(event.nativeEvent.locationX / trackWidthRef.current);
    },
    [commitFromRatio],
  );

  return (
    <View style={styles.rangeRow} testID={testID}>
      {Platform.OS === "web" ? (
        // web/Electron：原生 range
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleWebChange}
          aria-label={accessibilityLabel}
          style={{
            flex: 1,
            minWidth: 96,
            accentColor: theme.colors.primary,
          }}
        />
      ) : (
        // native：可拖轨道（无 HTML input）
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={{
            min,
            max,
            now: value,
            text: formatValue(value),
          }}
          onLayout={handleLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={changeFromEvent}
          onResponderMove={changeFromEvent}
          style={styles.rangeHit}
          testID={`${testID}-track`}
        >
          <View style={styles.rangeTrack}>
            <View
              style={[
                styles.rangeFill,
                {
                  width: `${fillRatio * 100}%`,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
          </View>
        </View>
      )}
      <Text style={[styles.rangeValue, { color: theme.colors.foreground }]}>
        {formatValue(value)}
      </Text>
    </View>
  );
}

/** 封面背景模糊（Cmd+I）：0–24，越大越糊。 */
export function MusicCoverBackdropBlurDetailField(): ReactElement {
  const blur = useMusicDemoStore((state) => state.coverBackdropBlur);
  const setBlur = useMusicDemoStore((state) => state.setCoverBackdropBlur);
  return (
    <DetailRangeSlider
      value={blur}
      min={0}
      max={24}
      step={1}
      formatValue={(value) => `${value}`}
      onChange={setBlur}
      testID="music-detail-cover-backdrop-blur"
      accessibilityLabel="封面背景模糊"
    />
  );
}

/** 封面背景透明度（Cmd+I）：越大封面越清晰可见。 */
export function MusicCoverBackdropOpacityDetailField(): ReactElement {
  const opacity = useMusicDemoStore((state) => state.coverBackdropOpacity);
  const setOpacity = useMusicDemoStore((state) => state.setCoverBackdropOpacity);
  return (
    <DetailRangeSlider
      value={Math.round(opacity * 100)}
      min={15}
      max={95}
      step={1}
      formatValue={(value) => `${value}%`}
      onChange={(percent) => setOpacity(percent / 100)}
      testID="music-detail-cover-backdrop-opacity"
      accessibilityLabel="封面背景透明度"
    />
  );
}

export function MusicSearchCacheTtlDetailField(): ReactElement {
  const { theme } = useUnistyles();
  const ttl = useMusicDemoStore((state) => state.searchCacheTtlMinutes);
  const setTtl = useMusicDemoStore((state) => state.setSearchCacheTtlMinutes);
  const [draft, setDraft] = useState(String(ttl));

  useEffect(() => {
    setDraft(String(ttl));
  }, [ttl]);

  const save = useCallback(() => {
    const next = Number(draft);
    setTtl(next);
    setDraft(
      String(Math.max(1, Math.floor(next) || useMusicDemoStore.getState().searchCacheTtlMinutes)),
    );
  }, [draft, setTtl]);

  return (
    <View style={styles.ttlRow} testID="music-detail-search-cache-ttl">
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={save}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[
          styles.ttlInput,
          {
            color: theme.colors.foreground,
            borderColor: theme.colors.border,
          },
        ]}
        testID="music-detail-search-cache-ttl-input"
      />
      <Text style={[styles.ttlUnit, { color: theme.colors.foregroundMuted }]}>分钟</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="保存搜索缓存时长"
        onPress={save}
        style={styles.ttlSave}
        testID="music-detail-search-cache-ttl-save"
      >
        <Text style={[styles.ttlSaveText, { color: theme.colors.foreground }]}>保存</Text>
      </Pressable>
    </View>
  );
}

/** ⌥D 曲目详情：主辅次三色 + 复制，单行（无添加到我的氛围）。 */
export function MusicAtmosphereDetailField(props: {
  hostApi: WorkspaceAppHostApi;
  primary: string;
  secondary?: string;
  tertiary?: string;
  luminance?: "dark" | "light" | "unknown";
  sourceLabel?: string;
}): ReactElement {
  void props.hostApi;
  const { theme } = useUnistyles();
  const [status, setStatus] = useState<string | null>(null);
  const slots = [
    { id: "primary", color: props.primary },
    { id: "secondary", color: props.secondary ?? "" },
    { id: "tertiary", color: props.tertiary ?? "" },
  ];

  const handleCopy = useCallback(async () => {
    const payload = JSON.stringify(
      {
        primary: props.primary,
        secondary: props.secondary,
        tertiary: props.tertiary,
        luminance: props.luminance ?? "unknown",
        sourceLabel: props.sourceLabel,
      },
      null,
      2,
    );
    try {
      await copyTextToClipboard(payload);
      setStatus("已复制");
    } catch {
      setStatus("复制失败");
    }
  }, [props.luminance, props.primary, props.secondary, props.sourceLabel, props.tertiary]);

  return (
    <View style={styles.atmosphereRow} testID="music-detail-atmosphere">
      {slots.map((slot) => (
        <View
          key={slot.id}
          style={[
            styles.atmosphereSwatch,
            slot.color ? { backgroundColor: slot.color } : styles.atmosphereSwatchEmpty,
          ]}
        />
      ))}
      <Text
        selectable
        numberOfLines={1}
        style={[styles.atmosphereHex, { color: theme.colors.foregroundMuted }]}
      >
        {props.primary}
        {props.secondary ? ` · ${props.secondary}` : ""}
        {props.tertiary ? ` · ${props.tertiary}` : ""}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="复制氛围 JSON"
        onPress={() => void handleCopy()}
        style={styles.atmosphereCopyHit}
        testID="music-detail-atmosphere-copy"
      >
        <Text style={{ color: theme.colors.foreground, fontSize: 13, fontWeight: "500" }}>
          {status === "已复制" ? "已复制" : "复制"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  ttlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    minWidth: 0,
    flexShrink: 1,
  },
  ttlInput: {
    width: 56,
    borderWidth: RNStyleSheet.hairlineWidth,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing[1],
    paddingVertical: theme.spacing[1],
    fontSize: theme.fontSize.sm,
    textAlign: "center",
  },
  ttlUnit: {
    // 与详情配置主文案 sm 对齐（原 xs 会显得缩一号）
    fontSize: theme.fontSize.sm,
  },
  ttlSave: {
    paddingHorizontal: theme.spacing[1],
    paddingVertical: theme.spacing[0.5],
  },
  ttlSaveText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 160,
    flexShrink: 0,
  },
  rangeHit: {
    flex: 1,
    minWidth: 96,
    height: 28,
    justifyContent: "center",
  },
  rangeTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  rangeFill: {
    height: 4,
    borderRadius: 2,
  },
  rangeValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    fontVariant: ["tabular-nums"],
    minWidth: 36,
    textAlign: "right",
  },
  atmosphereRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  atmosphereSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    flexShrink: 0,
  },
  atmosphereSwatchEmpty: {
    backgroundColor: "transparent",
    borderStyle: "dashed",
  },
  atmosphereHex: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
  },
  atmosphereCopyHit: {
    flexShrink: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
}));
