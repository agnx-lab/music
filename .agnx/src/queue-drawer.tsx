// 场景：播放列表抽屉 — 当前曲定位；行动作整机走 host.ui.ActionBar（三点/右键/长按 + bar + showBarLabels）。
/* oxlint-disable eslint-plugin-react-perf(jsx-no-new-array-as-prop, jsx-no-new-function-as-prop, jsx-no-new-object-as-prop, jsx-no-jsx-as-prop) -- queue row ActionBar surface */
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet as RNStyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { GripVertical, ListMusic } from "lucide-react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { WorkspaceAppActionBarProps, WorkspaceAppActionContribution } from "@getagnx/app-sdk";
import { getMusicHostApi } from "./music-host";
import type { DemoTrack } from "./store";
import { resolveQueueScrollOffset } from "./queue-scroll";
import { MUSIC_PLAYER_ACTION_IDS } from "./player-action-layout";
import {
  MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS,
  resolveMusicTrackMenuActionId,
  resolveMusicTrackMenuPresentation,
  type MusicTrackMenuActionId,
} from "./track-menu";
import { MUSIC_TRACK_MENU_SURFACE, useMusicTrackEntityMenuLayout } from "./track-menu-surfaces";

const DESKTOP_RAIL_WIDTH = 340;
const FALLBACK_ROW_HEIGHT = 56;

type ModeIconComponent = ComponentType<{ size?: number; color?: string }>;

function isWebPointerEnv(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function shiftForSortableIndex(input: {
  index: number;
  fromIndex: number;
  toIndex: number;
  rowHeight: number;
}): number {
  const { index, fromIndex, toIndex, rowHeight } = input;
  if (fromIndex === toIndex) {
    return 0;
  }
  if (fromIndex < toIndex) {
    if (index > fromIndex && index <= toIndex) {
      return -rowHeight;
    }
    return 0;
  }
  if (index >= toIndex && index < fromIndex) {
    return rowHeight;
  }
  return 0;
}

export function MusicQueueDrawer(props: {
  open: boolean;
  compact: boolean;
  tracks: DemoTrack[];
  activeId: string | null;
  playModeLabel: string;
  ModeIcon: ModeIconComponent;
  onClose: () => void;
  onCyclePlayMode: () => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  /** 曲目实体菜单执行（侧栏/播放器同源）；不传则三点/右键/长按不可用 */
  onTrackMenuAction?: (action: MusicTrackMenuActionId, trackId: string) => void;
}) {
  const { theme } = useUnistyles();
  const muted = theme.colors.foregroundMuted;
  const accent = theme.colors.accent;
  const [mounted, setMounted] = useState(props.open);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const slideX = useRef(new Animated.Value(DESKTOP_RAIL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragFromRef = useRef<number | null>(null);
  const pointerStartYRef = useRef(0);
  const rowRefs = useRef<Array<View | null>>([]);
  const rowTopsRef = useRef<number[]>([]);
  const rowHeightRef = useRef(FALLBACK_ROW_HEIGHT);
  const pointerListenersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
  } | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const rowLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const pendingScrollActiveRef = useRef(false);
  const hostUi = getMusicHostApi().ui;
  const ActionBar = hostUi.ActionBar as ComponentType<WorkspaceAppActionBarProps>;
  const { layout: trackMenuLayout, openEditLayout } = useMusicTrackEntityMenuLayout(
    MUSIC_TRACK_MENU_SURFACE.queue,
  );

  const resetDragState = () => {
    dragFromRef.current = null;
    setDraggingIndex(null);
    setDropIndex(null);
    setDragDeltaY(0);
  };

  const detachPointerListeners = () => {
    const listeners = pointerListenersRef.current;
    if (listeners && isWebPointerEnv()) {
      document.removeEventListener("pointermove", listeners.move, true);
      document.removeEventListener("pointerup", listeners.up, true);
      document.removeEventListener("pointercancel", listeners.up, true);
    }
    pointerListenersRef.current = null;
  };

  const scrollActiveIntoView = useCallback(() => {
    const activeId = props.activeId;
    if (!activeId || !props.open) {
      return;
    }
    const layout = rowLayoutsRef.current[activeId];
    if (!layout) {
      pendingScrollActiveRef.current = true;
      return;
    }
    const y = resolveQueueScrollOffset({
      rowY: layout.y,
      rowHeight: layout.height,
      viewportHeight: viewportHeightRef.current,
      contentHeight: contentHeightRef.current,
    });
    scrollRef.current?.scrollTo({ y, animated: false });
    pendingScrollActiveRef.current = false;
  }, [props.activeId, props.open]);

  useEffect(() => {
    if (props.open) {
      setMounted(true);
      pendingScrollActiveRef.current = true;
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          // 抽屉入场后再无动画对齐当前曲，避免布局未定滚动落空
          requestAnimationFrame(() => scrollActiveIntoView());
        }
      });
      return;
    }
    if (!mounted) {
      return;
    }
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: DESKTOP_RAIL_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        resetDragState();
        setHoveredRowId(null);
        pendingScrollActiveRef.current = false;
      }
    });
    // 仅跟随 open/mounted：切歌时不要重播入场动画
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slideX/backdrop 稳定；scroll 另 effect
  }, [mounted, props.open]);

  useEffect(() => {
    if (!props.open || !mounted) {
      return;
    }
    pendingScrollActiveRef.current = true;
    requestAnimationFrame(() => scrollActiveIntoView());
  }, [mounted, props.activeId, props.open, props.tracks, scrollActiveIntoView]);

  useEffect(() => {
    return () => {
      detachPointerListeners();
    };
  }, []);

  const measureRows = (done?: () => void) => {
    const total = props.tracks.length;
    let pending = total;
    if (total === 0) {
      done?.();
      return;
    }
    for (let i = 0; i < total; i += 1) {
      const node = rowRefs.current[i];
      if (!node || typeof node.measureInWindow !== "function") {
        pending -= 1;
        if (pending === 0) {
          done?.();
        }
        continue;
      }
      node.measureInWindow((_x, y, _w, height) => {
        rowTopsRef.current[i] = y;
        if (height > 0) {
          rowHeightRef.current = height;
        }
        pending -= 1;
        if (pending === 0) {
          done?.();
        }
      });
    }
  };

  const indexFromPageY = (pageY: number): number => {
    const fromIndex = dragFromRef.current ?? 0;
    const tops = rowTopsRef.current;
    const height = rowHeightRef.current || FALLBACK_ROW_HEIGHT;
    const count = props.tracks.length;
    if (count === 0) {
      return 0;
    }
    // 用按下时冻结的行顶 + 行高估算落点（与编辑布局 sortable 一致：列表本身不瞬移 DOM）。
    let best = fromIndex;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < count; i += 1) {
      const top = tops[i];
      if (top == null) {
        continue;
      }
      const center = top + height / 2;
      const dist = Math.abs(pageY - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  };

  const finishDrop = (toIndex: number) => {
    const fromIndex = dragFromRef.current;
    detachPointerListeners();
    resetDragState();
    if (fromIndex == null || fromIndex === toIndex) {
      return;
    }
    props.onMove(fromIndex, toIndex);
  };

  const applyDragToPageY = (pageY: number) => {
    const fromIndex = dragFromRef.current;
    if (fromIndex == null) {
      return;
    }
    setDragDeltaY(pageY - pointerStartYRef.current);
    setDropIndex(indexFromPageY(pageY));
  };

  const handleDragGrant = (index: number, pageY: number) => {
    dragFromRef.current = index;
    pointerStartYRef.current = pageY;
    setDraggingIndex(index);
    setDropIndex(index);
    setDragDeltaY(0);
    setHoveredRowId(null);
    requestAnimationFrame(() => measureRows());
  };

  const handleDragCancel = () => {
    detachPointerListeners();
    resetDragState();
  };

  const startWebPointerDrag = (
    sourceIndex: number,
    pointerId: number,
    target: EventTarget | null,
    pageY: number,
  ) => {
    if (!isWebPointerEnv()) {
      return;
    }
    detachPointerListeners();
    handleDragGrant(sourceIndex, pageY);
    const el = target as Element | null;
    if (el && typeof el.setPointerCapture === "function") {
      try {
        el.setPointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      applyDragToPageY(event.clientY);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      finishDrop(indexFromPageY(event.clientY));
    };
    pointerListenersRef.current = { move: onMove, up: onUp };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
  };

  const beginPointerDragFromEvent = (
    index: number,
    event: {
      pointerId?: number;
      button?: number;
      clientY?: number;
      preventDefault?: () => void;
      stopPropagation?: () => void;
      target?: EventTarget | null;
      nativeEvent?: {
        pointerId?: number;
        button?: number;
        pageY?: number;
        clientY?: number;
        target?: EventTarget;
      };
    },
  ) => {
    if ((event.button ?? event.nativeEvent?.button ?? 0) !== 0) {
      return;
    }
    event.preventDefault?.();
    event.stopPropagation?.();
    const pageY = event.clientY ?? event.nativeEvent?.clientY ?? event.nativeEvent?.pageY ?? 0;
    const pointerId = event.pointerId ?? event.nativeEvent?.pointerId;
    if (pointerId == null) {
      handleDragGrant(index, pageY);
      return;
    }
    startWebPointerDrag(index, pointerId, event.target ?? event.nativeEvent?.target ?? null, pageY);
  };

  const handleRowLayout = (trackId: string, event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    rowLayoutsRef.current[trackId] = { y, height: height > 0 ? height : FALLBACK_ROW_HEIGHT };
    if (height > 0) {
      rowHeightRef.current = height;
    }
    if (pendingScrollActiveRef.current && trackId === props.activeId) {
      requestAnimationFrame(() => scrollActiveIntoView());
    }
  };

  const handleListLayout = (event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
    if (pendingScrollActiveRef.current) {
      requestAnimationFrame(() => scrollActiveIntoView());
    }
  };

  const handleContentSizeChange = (_width: number, height: number) => {
    contentHeightRef.current = height;
    if (pendingScrollActiveRef.current) {
      requestAnimationFrame(() => scrollActiveIntoView());
    }
  };

  const handleTrackMenuSelect = (menuId: string, trackId: string) => {
    if (draggingIndex != null) {
      return;
    }
    const actionId = resolveMusicTrackMenuActionId(menuId);
    if (!actionId) {
      return;
    }
    // 队列表面：addPlaylist = 移出播放列表（承接原行内删除按钮语义）
    if (actionId === "addPlaylist") {
      props.onRemove(trackId);
      return;
    }
    if (!props.onTrackMenuAction) {
      return;
    }
    props.onTrackMenuAction(actionId, trackId);
  };

  const ModeIcon = props.ModeIcon;
  const fromIndex = draggingIndex;
  const toIndex = dropIndex ?? draggingIndex ?? 0;
  const rowHeight = rowHeightRef.current || FALLBACK_ROW_HEIGHT;
  const actionsEnabled = Boolean(props.onTrackMenuAction) || Boolean(props.onRemove);

  const list = (
    <View style={styles.panel} testID="workspace-mini-app-music-queue">
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ListMusic size={16} color={theme.colors.foreground} />
          <Text style={styles.title}>播放列表</Text>
          <Text style={styles.modeHint}>{props.playModeLabel}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={props.playModeLabel}
          onPress={props.onCyclePlayMode}
          style={styles.headerActionHit}
          testID="music-queue-play-mode"
        >
          <ModeIcon size={20} color={accent} />
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        scrollEnabled={draggingIndex == null}
        onLayout={handleListLayout}
        onContentSizeChange={handleContentSizeChange}
        {...({
          onWheel:
            draggingIndex != null
              ? (event: { preventDefault?: () => void }) => event.preventDefault?.()
              : undefined,
        } as object)}
      >
        {props.tracks.length === 0 ? (
          <Text style={styles.empty}>队列为空。可从侧栏曲目菜单加入播放列表。</Text>
        ) : (
          props.tracks.map((item, index) => {
            const active = item.id === props.activeId;
            const isDragging = fromIndex === index;
            let shiftY = 0;
            if (fromIndex != null) {
              if (isDragging) {
                shiftY = dragDeltaY;
              } else {
                shiftY = shiftForSortableIndex({
                  index,
                  fromIndex,
                  toIndex,
                  rowHeight,
                });
              }
            }
            // 整机 ActionBar：bar 外露 + 三点 + surface 右键/长按 + showBarLabels
            const moreLabel = `更多操作 ${item.title}`;
            const rowMain = (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={active ? `正在播放 ${item.title}` : `播放 ${item.title}`}
                onPress={() => props.onSelect(item.id)}
                style={styles.rowMain}
                disabled={draggingIndex != null}
              >
                <Text
                  style={[styles.rowTitle, active ? styles.rowTitleActive : null]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={styles.rowArtist} numberOfLines={1}>
                  {item.artist || "未知艺人"}
                </Text>
              </Pressable>
            );
            const rowActions: WorkspaceAppActionContribution[] = MUSIC_PLAYER_ACTION_IDS.map(
              (actionId) => {
                const presentation = resolveMusicTrackMenuPresentation(actionId, {
                  pinned: Boolean(item.pinned),
                  surface: "queue",
                });
                return {
                  id: actionId,
                  label: presentation.label,
                  tipLabel: presentation.label,
                  icon: presentation.icon,
                  destructive: presentation.destructive,
                  disabled: draggingIndex != null,
                  shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[actionId],
                  onPress: () => handleTrackMenuSelect(actionId, item.id),
                };
              },
            );
            return (
              <View
                key={item.id}
                ref={(node) => {
                  rowRefs.current[index] = node;
                }}
                onLayout={(event) => handleRowLayout(item.id, event)}
                style={[
                  styles.row,
                  active ? styles.rowActive : null,
                  !active && hoveredRowId === item.id ? styles.rowHovered : null,
                  isDragging ? styles.rowDragging : null,
                  {
                    transform: [{ translateY: shiftY }],
                    zIndex: isDragging ? 20 : 1,
                    // 让位行平滑过渡；跟手行无 transition 以免拖滞
                    transitionProperty: isDragging ? "none" : "transform",
                    transitionDuration: isDragging ? "0ms" : "180ms",
                  } as object,
                ]}
                testID={`music-queue-row-${item.id}`}
                {...(isWebPointerEnv()
                  ? ({
                      // mouseleave 进入子节点不触发，悬停标题也保持整行高亮
                      onMouseEnter: () => {
                        if (draggingIndex == null) {
                          setHoveredRowId(item.id);
                        }
                      },
                      onMouseLeave: () => {
                        setHoveredRowId((current) => (current === item.id ? null : current));
                      },
                    } as object)
                  : {})}
              >
                <View
                  accessibilityLabel="拖拽排序"
                  accessibilityRole="adjustable"
                  style={[
                    styles.dragHandle,
                    {
                      cursor: isDragging ? "grabbing" : "grab",
                      touchAction: "none",
                      userSelect: "none",
                    } as object,
                  ]}
                  testID={`music-queue-drag-${item.id}`}
                  {...({
                    onPointerDown: (event: {
                      pointerId?: number;
                      button?: number;
                      clientY?: number;
                      preventDefault?: () => void;
                      stopPropagation?: () => void;
                      target?: EventTarget | null;
                      nativeEvent?: {
                        pointerId?: number;
                        button?: number;
                        pageY?: number;
                        clientY?: number;
                        target?: EventTarget;
                      };
                    }) => beginPointerDragFromEvent(index, event),
                    onStartShouldSetResponder: () => !isWebPointerEnv(),
                    onMoveShouldSetResponder: () =>
                      !isWebPointerEnv() && dragFromRef.current != null,
                    onResponderTerminationRequest: () => false,
                    onResponderGrant: (event: { nativeEvent: { pageY: number } }) => {
                      if (!isWebPointerEnv()) {
                        handleDragGrant(index, event.nativeEvent.pageY);
                      }
                    },
                    onResponderMove: (event: { nativeEvent: { pageY: number } }) => {
                      if (!isWebPointerEnv()) {
                        applyDragToPageY(event.nativeEvent.pageY);
                      }
                    },
                    onResponderRelease: (event: { nativeEvent: { pageY: number } }) => {
                      if (!isWebPointerEnv()) {
                        finishDrop(indexFromPageY(event.nativeEvent.pageY));
                      }
                    },
                    onResponderTerminate: () => {
                      if (!isWebPointerEnv()) {
                        handleDragCancel();
                      }
                    },
                  } as object)}
                >
                  <GripVertical size={16} color={muted} />
                </View>
                <View
                  style={styles.rowBody}
                  pointerEvents={draggingIndex != null ? "none" : "auto"}
                >
                  {actionsEnabled ? (
                    <ActionBar
                      layout={trackMenuLayout}
                      actions={rowActions}
                      surface={rowMain}
                      surfaceLayout="row"
                      distribute="end"
                      iconSize={16}
                      mutedColor={active ? accent : muted}
                      accentColor={accent}
                      testID={`music-queue-row-actions-${item.id}`}
                      overflowMenu={{
                        side: "bottom",
                        align: "end",
                        moreLabel,
                        triggerSize: 16,
                        triggerColor: active ? accent : muted,
                        showEditLayout: true,
                        editLayoutLabel: "编辑布局",
                        onEditLayout: openEditLayout,
                        testID: `music-queue-more-${item.id}`,
                      }}
                    />
                  ) : (
                    rowMain
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  if (!mounted && !props.open) {
    return null;
  }

  if (props.compact) {
    return (
      <Modal
        visible={props.open}
        transparent
        animationType="slide"
        onRequestClose={props.onClose}
        testID="music-queue-modal"
        onShow={() => {
          pendingScrollActiveRef.current = true;
          requestAnimationFrame(() => scrollActiveIntoView());
        }}
      >
        <View style={styles.mobileRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭播放列表遮罩"
            style={styles.backdrop}
            onPress={props.onClose}
            disabled={draggingIndex != null}
          />
          <View style={styles.mobileSheet}>{list}</View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.desktopRoot} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={draggingIndex != null ? "none" : "auto"}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭播放列表遮罩"
          style={RNStyleSheet.absoluteFill}
          onPress={props.onClose}
        />
      </Animated.View>
      <Animated.View
        style={[styles.desktopRail, { transform: [{ translateX: slideX }] }]}
        testID="music-queue-desktop-rail"
      >
        {list}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  desktopRoot: {
    ...RNStyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "flex-end",
    // 高于 player topTrailingChrome(30)，打开时自然挡住「恢复滚动」
    zIndex: 40,
  },
  backdrop: {
    ...RNStyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  desktopRail: {
    width: DESKTOP_RAIL_WIDTH,
    maxWidth: "100%",
    height: "100%",
    backgroundColor: theme.colors.surface1,
    borderLeftWidth: RNStyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
    zIndex: 41,
  },
  mobileRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  mobileSheet: {
    maxHeight: "72%",
    minHeight: "48%",
    backgroundColor: theme.colors.surface1,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: "hidden",
    zIndex: 21,
  },
  panel: {
    flex: 1,
    minHeight: 0,
    padding: theme.spacing[3],
    gap: theme.spacing[2],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2],
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  modeHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
  headerActionHit: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingBottom: theme.spacing[4],
  },
  empty: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
    paddingVertical: theme.spacing[4],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    marginBottom: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
    borderWidth: RNStyleSheet.hairlineWidth,
    borderColor: "transparent",
    backgroundColor: theme.colors.surface1,
  },
  rowActive: {
    backgroundColor: theme.colors.surface2,
    borderColor: theme.colors.accent,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  rowHovered: {
    backgroundColor: theme.colors.surface2,
  },
  rowDragging: {
    opacity: 0.92,
    backgroundColor: theme.colors.surface2,
    borderColor: theme.colors.accent,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  dragHandle: {
    width: 28,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  rowMenuSurface: {
    flex: 1,
    minWidth: 0,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 2,
  },
  rowTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  rowTitleActive: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold,
  },
  rowArtist: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
  rowActionHit: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
}));
