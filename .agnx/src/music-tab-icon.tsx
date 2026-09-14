// 场景：音乐播放器 Tab / 侧栏顶部按钮图标 — 优先当前曲（播放中或暂停）封面，否则回落音符。
import { useEffect, useMemo, useState } from "react";
import { Image, View } from "react-native";
import { Music2 } from "lucide-react-native";
import { tryGetMusicHostApi } from "./music-host";
import { coverUrlForThumb } from "./cover-url-quality";
import { useMusicDemoStore } from "./store";

function isDirectDisplayCoverUri(uri: string): boolean {
  return /^https?:\/\//.test(uri) || uri.startsWith("data:") || uri.startsWith("blob:");
}

/** 符合 WorkspaceAppIcon 函数签名；订阅 nowPlaying 封面（含暂停态）。 */
export function MusicTabIcon(props: {
  size?: number | string;
  color?: string;
  absoluteStrokeWidth?: boolean;
}) {
  const size = typeof props.size === "number" ? props.size : Number(props.size) || 18;
  const color = props.color ?? "#9ca3af";
  const nowPlayingId = useMusicDemoStore((state) => state.nowPlayingId);
  const coverUri = useMusicDemoStore((state) => {
    const id = state.nowPlayingId;
    if (!id) {
      return null;
    }
    const track = state.tracks.find((entry) => entry.id === id);
    return track?.coverUri?.trim() || null;
  });
  const [displayUri, setDisplayUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const trackId = nowPlayingId;
    const raw = coverUri;
    if (!raw) {
      setDisplayUri(null);
      return;
    }
    if (isDirectDisplayCoverUri(raw)) {
      setDisplayUri(coverUrlForThumb(raw));
      return;
    }
    const host = tryGetMusicHostApi();
    if (!host?.files?.resolveObjectUrl) {
      setDisplayUri(null);
      return;
    }
    // 本地落盘封面：与播放器一致，经 host.files.resolveObjectUrl 才能在 web/Electron 显示。
    void (async () => {
      try {
        const uri = await host.files.resolveObjectUrl(raw);
        const latest = useMusicDemoStore.getState();
        if (
          !cancelled &&
          latest.nowPlayingId === trackId &&
          latest.tracks.find((entry) => entry.id === trackId)?.coverUri?.trim() === raw
        ) {
          setDisplayUri(uri);
        }
      } catch {
        if (!cancelled && useMusicDemoStore.getState().nowPlayingId === trackId) {
          setDisplayUri(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coverUri, nowPlayingId]);

  const frameStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: Math.max(2, size * 0.18),
      overflow: "hidden" as const,
    }),
    [size],
  );
  const imageStyle = useMemo(() => ({ width: size, height: size }), [size]);
  const imageSource = useMemo(() => (displayUri ? { uri: displayUri } : null), [displayUri]);

  if (imageSource) {
    return (
      <View style={frameStyle}>
        <Image
          source={imageSource}
          style={imageStyle}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return <Music2 size={size} color={color} strokeWidth={2} />;
}
