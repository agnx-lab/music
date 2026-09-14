// 场景：Music Sub App 复用宿主 progress / notification，避免自造全局反馈层。
import type { WorkspaceAppHostApi, WorkspaceAppNotificationKind } from "@getagnx/app-sdk";
import { MUSIC_APP_ID } from "./music-ids";
import { tryGetMusicHostApi } from "./music-host";

function formatSuccessMessage(input?: { title: string; message?: string }): string | undefined {
  if (!input) {
    return undefined;
  }
  const title = input.title.trim();
  const message = input.message?.trim();
  if (message) {
    return `${title}：${message}`;
  }
  return title;
}

export async function runWithMusicHostTask<T>(
  host: WorkspaceAppHostApi,
  input: {
    title: string;
    message?: string;
    total?: number;
    notifyOnSuccess?: { title: string; message?: string };
    notifyOnError?: boolean;
  },
  task: (
    report: (patch: { message?: string; value?: number; total?: number }) => void,
  ) => Promise<T>,
): Promise<T> {
  const handle = host.ui.progress.create({
    title: input.title,
    message: input.message,
    appId: MUSIC_APP_ID,
    total: input.total,
  });
  try {
    const result = await task((patch) => handle.report(patch));
    handle.end({
      kind: "success",
      message: formatSuccessMessage(input.notifyOnSuccess),
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    handle.end({ kind: "error", message });
    throw error instanceof Error ? error : new Error(message);
  }
}

/** 播放器错误 → 宿主顶部反馈条（禁止内嵌封面下）。 */
export function notifyMusicPlayerError(message: string): void {
  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }
  const host = tryGetMusicHostApi();
  host?.ui.notification.show({
    title: trimmed,
    kind: "error",
  });
}

function inferMusicPlayerToastKind(message: string): WorkspaceAppNotificationKind {
  if (/失败|无法|错误/.test(message)) {
    return "error";
  }
  if (message.startsWith("已") && !message.includes("正在")) {
    return "success";
  }
  return "info";
}

/** 播放器过程/结果提示 → 宿主顶部反馈条（禁止内嵌封面下）。 */
export function notifyMusicPlayerToast(message: string): void {
  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }
  const host = tryGetMusicHostApi();
  host?.ui.notification.show({
    title: trimmed,
    kind: inferMusicPlayerToastKind(trimmed),
  });
}
