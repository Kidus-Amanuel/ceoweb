"use client";

import { toast } from "@/hooks/use-toast";

export type WorkspaceToastOp =
  | "rowCreate"
  | "rowUpdate"
  | "rowDelete"
  | "columnCreate"
  | "columnUpdate"
  | "columnDelete";

export type WorkspaceToastArgs = {
  op: WorkspaceToastOp;
  featureName: string;
  tableLabel: string;
  subjectLabel?: string;
  mode: "success" | "error";
  message?: string;
  normalizeError?: (message: string) => string;
};

const labels: Record<WorkspaceToastOp, string> = {
  rowCreate: "Create row",
  rowUpdate: "Update row",
  rowDelete: "Delete row",
  columnCreate: "Add field",
  columnUpdate: "Update field",
  columnDelete: "Delete field",
};

const recentToastAt = new Map<string, number>();
const TOAST_DEDUPE_WINDOW_MS = 1800;

const shouldEmit = (key: string) => {
  const now = Date.now();
  const previous = recentToastAt.get(key) ?? 0;
  if (now - previous < TOAST_DEDUPE_WINDOW_MS) return false;
  recentToastAt.set(key, now);
  return true;
};

export const showWorkspaceToast = ({
  op,
  featureName,
  tableLabel,
  subjectLabel,
  mode,
  message,
  normalizeError,
}: WorkspaceToastArgs) => {
  const title = `${labels[op]} - ${subjectLabel || tableLabel}`;
  const normalizedMessage = normalizeError
    ? normalizeError(
        message ||
          (mode === "success"
            ? `${featureName} action completed successfully.`
            : `${featureName} action failed.`),
      )
    : message ||
      (mode === "success"
        ? `${featureName} action completed successfully.`
        : `${featureName} action failed.`);
  if (mode === "error") {
    const dedupeKey = `${mode}:${op}:${normalizedMessage}`;
    if (!shouldEmit(dedupeKey)) return;
  }
  if (mode === "success") toast.success(normalizedMessage, title);
  else toast.error(normalizedMessage, title);
};
