// 场景：播放列表滚动定位 — 将当前曲无动画滚入可视区（尽量居中并夹紧边界）。

const FALLBACK_ROW_HEIGHT = 56;

/** 将当前行滚入可视区（尽量居中）；无动画由调用方 scrollTo(animated:false)。 */
export function resolveQueueScrollOffset(input: {
  rowY: number;
  rowHeight: number;
  viewportHeight: number;
  contentHeight: number;
}): number {
  const rowHeight = input.rowHeight > 0 ? input.rowHeight : FALLBACK_ROW_HEIGHT;
  const viewportHeight = Math.max(0, input.viewportHeight);
  const contentHeight = Math.max(0, input.contentHeight);
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  if (maxScroll <= 0 || viewportHeight <= 0) {
    return 0;
  }
  const centered = input.rowY - (viewportHeight - rowHeight) / 2;
  if (centered <= 0) {
    return 0;
  }
  if (centered >= maxScroll) {
    return maxScroll;
  }
  return centered;
}
