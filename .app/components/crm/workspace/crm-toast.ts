"use client";

import { toast } from "@/hooks/use-toast";
import { toFriendlyCrmError } from "@/components/crm/workspace/crm-workspace.shared";

type CrmToastOp =
  | "rowCreate"
  | "rowUpdate"
  | "rowDelete"
  | "columnCreate"
  | "columnUpdate"
  | "columnDelete";

type CrmToastArgs = {
  op: CrmToastOp;
  tableLabel: string;
  mode: "success" | "error";
  message?: string;
};

const recentToastAt = new Map<string, number>();
const TOAST_DEDUPE_WINDOW_MS = 1800;

const labels = {
  rowCreate: "Create row",
  rowUpdate: "Update row",
  rowDelete: "Delete row",
  columnCreate: "Add field",
  columnUpdate: "Update field",
  columnDelete: "Delete field",
} as const;

const shouldEmit = (key: string) => {
  const now = Date.now();
  const previous = recentToastAt.get(key) ?? 0;
  if (now - previous < TOAST_DEDUPE_WINDOW_MS) return false;
  recentToastAt.set(key, now);
  return true;
};

export const showCrmToast = ({
  op,
  tableLabel,
  mode,
  message,
}: CrmToastArgs) => {
  const title = `${labels[op]} - ${tableLabel}`;
  const normalizedMessage = toFriendlyCrmError(
    message ||
      (mode === "success"
        ? "Action completed successfully."
        : "Action failed."),
  );
  if (mode === "error") {
    const dedupeKey = `${mode}:${op}:${normalizedMessage}`;
    if (!shouldEmit(dedupeKey)) return;
  }
  if (mode === "success") toast.success(normalizedMessage, title);
  else toast.error(normalizedMessage, title);
};
