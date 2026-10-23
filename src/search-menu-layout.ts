// 场景：搜索菜单布局纯投影 — hideBar fold + hidden 过滤（无 React / host 依赖，便于单测）。
import type { WorkspaceAppActionBarLayout } from "@agnx-lab/app-sdk";
import { projectActionBarOverflowFold } from "@agnx-lab/app-sdk";

/** 搜索表面无 bar 外露：始终 fold bar → 菜单，避免培植丢失。 */
export function projectSearchMenuActionIds(layout: WorkspaceAppActionBarLayout): string[] {
  const fold = projectActionBarOverflowFold({
    barIds: layout.bar,
    overflowIds: layout.overflow,
    hideBar: true,
  });
  const hidden = new Set(layout.hidden ?? []);
  return [...fold.foldedBarIds, ...fold.menuOverflowIds].filter((id) => !hidden.has(id));
}
