// 场景：Music 底栏 mode/queue 按钮复用（playback 簇留在 player.tsx，避免 RN Web flex 抽离回归）。
import type { ComponentType, ReactNode } from "react";
import { ListMusic } from "lucide-react-native";
import type { MusicPlayMode } from "./store";

export interface TransportIconHitProps {
  label: string;
  tipLabel?: string;
  shortcutKeys?: readonly string[];
  variant?: "default" | "play";
  onPress?: () => void;
  children: ReactNode;
  testID?: string;
}

interface TransportControlContext {
  IconHit: ComponentType<TransportIconHitProps>;
  controlTitles: Record<string, string | undefined>;
  stripShortcutSuffix: (title: string) => string;
  resolveControlShortcutKeys: (id: string) => readonly string[] | undefined;
}

export function TransportModeControl(
  props: TransportControlContext & {
    playMode: MusicPlayMode;
    playModeLabel: (mode: MusicPlayMode) => string;
    ModeIcon: ComponentType<{ size: number; color: string }>;
    accentColor: string;
    iconSize: number;
    onCycleMode: () => void;
  },
) {
  const {
    IconHit,
    controlTitles,
    stripShortcutSuffix,
    resolveControlShortcutKeys,
    playMode,
    playModeLabel,
    ModeIcon,
    accentColor,
    iconSize,
    onCycleMode,
  } = props;
  const label = playModeLabel(playMode);

  return (
    <IconHit
      label={label}
      tipLabel={stripShortcutSuffix(controlTitles["transport:mode"] ?? label)}
      shortcutKeys={resolveControlShortcutKeys("transport:mode")}
      onPress={onCycleMode}
      testID="music-play-mode"
    >
      <ModeIcon size={iconSize} color={accentColor} />
    </IconHit>
  );
}

export function TransportQueueControl(
  props: TransportControlContext & {
    queueOpen: boolean;
    accentColor: string;
    mutedIconColor: string;
    iconSize: number;
    onToggleQueue: () => void;
  },
) {
  const {
    IconHit,
    controlTitles,
    stripShortcutSuffix,
    resolveControlShortcutKeys,
    queueOpen,
    accentColor,
    mutedIconColor,
    iconSize,
    onToggleQueue,
  } = props;

  return (
    <IconHit
      label="播放队列"
      tipLabel={stripShortcutSuffix(controlTitles["transport:queue"] ?? "播放队列")}
      shortcutKeys={resolveControlShortcutKeys("transport:queue")}
      onPress={onToggleQueue}
      testID="music-queue-toggle"
    >
      <ListMusic size={iconSize} color={queueOpen ? accentColor : mutedIconColor} />
    </IconHit>
  );
}
