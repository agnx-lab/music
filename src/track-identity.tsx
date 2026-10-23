// 场景：封面 + 歌名/艺人共用视图（hero / 顶栏收起 / 搜索底栏），统一点击与长按换封面语义。
/* oxlint-disable eslint(no-nested-ternary), eslint-plugin-react-perf(jsx-no-new-array-as-prop, jsx-no-new-object-as-prop) -- identity size variants */
import { createElement, type ReactNode } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { coverUrlForHero, coverUrlForThumb } from "./cover-url-quality";
import { MarqueeText } from "./marquee-text";
import type { DemoTrack } from "./store";

export type TrackCoverSize = "hero" | "inline" | "transport";

function displayUriForCoverSize(size: TrackCoverSize, displayUri: string | null): string | null {
  if (!displayUri) {
    return null;
  }
  return size === "hero" ? coverUrlForHero(displayUri) : coverUrlForThumb(displayUri);
}

export function isVideoCoverUri(uri: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogv)(?:\?|#|$)/i.test(uri);
}

/** 可展示的艺人名；占位未知则返回 null。 */
export function resolveTrackArtistLabel(track: Pick<DemoTrack, "artist">): string | null {
  const artist = track.artist.trim();
  if (!artist || artist === "未知艺人" || artist.toLowerCase() === "unknown artist") {
    return null;
  }
  return artist;
}

function TrackCoverMedia(props: {
  size: TrackCoverSize;
  displayUri: string | null;
  sourceUriForVideoCheck?: string | null;
  isWeb: boolean;
  isCompact?: boolean;
}) {
  const { size, displayUri, sourceUriForVideoCheck, isWeb, isCompact } = props;
  const resolvedUri = displayUriForCoverSize(size, displayUri);
  const videoUri = sourceUriForVideoCheck ?? displayUri;
  const allowVideo =
    size === "hero" && Boolean(resolvedUri && videoUri && isVideoCoverUri(videoUri) && isWeb);

  if (!resolvedUri) {
    return (
      <Text
        style={
          size === "hero"
            ? styles.coverGlyph
            : size === "inline"
              ? [styles.inlineGlyph, !isCompact ? styles.inlineGlyphDesktop : null]
              : styles.transportGlyph
        }
      >
        ♪
      </Text>
    );
  }

  if (allowVideo) {
    return createElement("video", {
      src: resolvedUri,
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      },
      autoPlay: true,
      loop: true,
      muted: true,
      playsInline: true,
      "data-testid": "music-cover-video",
    });
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={
        size === "hero"
          ? styles.heroImage
          : size === "inline"
            ? styles.inlineImage
            : styles.transportImage
      }
      resizeMode="cover"
      testID={size === "hero" ? "music-cover-image" : undefined}
    />
  );
}

export function TrackCoverButton(props: {
  size: TrackCoverSize;
  displayUri: string | null;
  sourceUriForVideoCheck?: string | null;
  isWeb: boolean;
  isCompact?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  testID: string;
  style?: StyleProp<ViewStyle>;
}) {
  const frameStyle =
    props.size === "hero"
      ? [styles.heroFrame, props.isCompact ? styles.heroFrameCompact : styles.heroFrameDesktop]
      : props.size === "inline"
        ? [styles.inlineFrame, !props.isCompact ? styles.inlineFrameDesktop : null]
        : styles.transportFrame;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      style={[frameStyle, props.style]}
      testID={props.testID}
    >
      <View
        style={
          props.size === "hero"
            ? styles.heroArt
            : props.size === "inline"
              ? styles.inlineArt
              : styles.transportArt
        }
      >
        <TrackCoverMedia
          size={props.size}
          displayUri={props.displayUri}
          sourceUriForVideoCheck={props.sourceUriForVideoCheck}
          isWeb={props.isWeb}
          isCompact={props.isCompact}
        />
      </View>
    </Pressable>
  );
}

export function TrackTitleArtist(props: {
  mode: "stacked" | "singleLine";
  title: string;
  artistLabel: string | null;
  titleFontSize: number;
  artistFontSize: number;
  mutedColor: string;
  fitContent?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  artistStyle?: StyleProp<TextStyle>;
  titleTestID?: string;
  artistTestID?: string;
  trailing?: ReactNode;
  /** Music Tab 切走时暂停跑马灯 */
  animationPaused?: boolean;
}) {
  if (props.mode === "singleLine") {
    return (
      <View style={styles.singleLineWrap}>
        <MarqueeText
          text={props.title}
          secondaryText={props.artistLabel ?? undefined}
          secondaryColor={props.mutedColor}
          secondaryFontSize={props.artistFontSize}
          secondaryFontWeight="400"
          contentAlign="start"
          fitContent={props.fitContent}
          style={props.titleStyle}
          fontSize={props.titleFontSize}
          fontWeight="600"
          animationPaused={props.animationPaused}
          testID={props.titleTestID}
        />
        {props.trailing}
      </View>
    );
  }

  return (
    <View style={styles.stackedWrap}>
      <MarqueeText
        text={props.title}
        contentAlign="center"
        style={props.titleStyle}
        fontSize={props.titleFontSize}
        fontWeight="600"
        animationPaused={props.animationPaused}
        testID={props.titleTestID}
      />
      {props.artistLabel ? (
        <MarqueeText
          text={props.artistLabel}
          contentAlign="center"
          style={props.artistStyle}
          fontSize={props.artistFontSize}
          fontWeight="400"
          color={props.mutedColor}
          animationPaused={props.animationPaused}
          testID={props.artistTestID}
        />
      ) : null}
      {props.trailing}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  heroFrame: {
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
  },
  heroFrameCompact: {
    width: 120,
    height: 120,
    marginTop: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "center",
  },
  heroFrameDesktop: {
    // 随封面列宽伸缩（固定 320 或 1:2 变宽时封面图一起变）
    width: "100%",
    aspectRatio: 1,
    maxWidth: 480,
    alignSelf: "center",
  },
  heroArt: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: theme.borderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  coverGlyph: {
    fontSize: 48,
    color: theme.colors.foregroundMuted,
  },
  inlineFrame: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface2,
    overflow: "hidden",
    flexGrow: 0,
    flexShrink: 0,
  },
  inlineFrameDesktop: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  inlineArt: {
    flex: 1,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  inlineImage: {
    width: "100%",
    height: "100%",
  },
  inlineGlyph: {
    fontSize: 14,
    color: theme.colors.foregroundMuted,
  },
  inlineGlyphDesktop: {
    fontSize: 12,
  },
  transportFrame: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
    flexGrow: 0,
    flexShrink: 0,
  },
  transportArt: {
    flex: 1,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  transportImage: {
    width: "100%",
    height: "100%",
  },
  transportGlyph: {
    fontSize: 16,
    color: theme.colors.foregroundMuted,
  },
  singleLineWrap: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  stackedWrap: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
    gap: theme.spacing[1],
  },
}));
