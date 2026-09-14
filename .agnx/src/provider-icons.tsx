// 场景：搜索来源站点品牌标 — 官方 favicon 本地打包；「本地」用硬盘标表示本机曲库。
/* oxlint-disable eslint-plugin-react-perf(jsx-no-new-object-as-prop, jsx-no-new-array-as-prop) -- 静态图标布局 */
import { Image, StyleSheet, View } from "react-native";
import { HardDrive } from "lucide-react-native";
import { useUnistyles } from "react-native-unistyles";
import { LOCAL_PROVIDER_ICON_SOURCES } from "./provider-icon-assets";

type IconSize = "md" | "sm";

function LocalIcon(props: { size: IconSize }) {
  const { theme } = useUnistyles();
  const sm = props.size === "sm";
  return (
    <View style={sm ? styles.tileSm : styles.tile}>
      <HardDrive size={sm ? 12 : 18} color={theme.colors.accent} />
    </View>
  );
}

function OfficialIcon(props: { providerId: string; size: IconSize }) {
  const source = LOCAL_PROVIDER_ICON_SOURCES[props.providerId];
  if (!source) {
    return <LocalIcon size={props.size} />;
  }
  const sm = props.size === "sm";
  return (
    <View style={sm ? styles.tileSm : styles.tile}>
      <Image
        source={source}
        style={sm ? styles.iconSm : styles.icon}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

export function MusicProviderBrandIcon(props: { providerId: string; size?: IconSize }) {
  const size = props.size ?? "md";
  if (props.providerId === "local") {
    return <LocalIcon size={size} />;
  }
  return <OfficialIcon providerId={props.providerId} size={size} />;
}

const tileBase = {
  alignItems: "center" as const,
  justifyContent: "center" as const,
  // 中性底，不盖品牌色；官方标本身自带颜色
  backgroundColor: "rgba(255,255,255,0.06)",
  overflow: "hidden" as const,
};

const styles = StyleSheet.create({
  tile: {
    ...tileBase,
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  tileSm: {
    ...tileBase,
    width: 18,
    height: 18,
    borderRadius: 5,
  },
  icon: {
    width: 28,
    height: 28,
  },
  iconSm: {
    width: 14,
    height: 14,
  },
});
