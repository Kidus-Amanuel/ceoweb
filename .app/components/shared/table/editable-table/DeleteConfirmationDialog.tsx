"use client";

import { Button } from "@/components/shared/ui/button/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/ui/dialog";

export type DeleteTarget = {
  kind: "row" | "column";
  id: string;
  label: string;
} | null;

type DeleteConfirmationDialogProps = {
  deleteTarget: DeleteTarget;
  onClose: () => void;
  onConfirmRow?: (id: string) => void;
  onConfirmColumn?: (id: string) => void;
};

export default function DeleteConfirmationDialog({
  deleteTarget,
  onClose,
  onConfirmRow,
  onConfirmColumn,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {deleteTarget?.kind === "column" ? "Delete Column" : "Delete Row"}
          </DialogTitle>
          <DialogDescription>
            {deleteTarget?.kind === "column"
              ? `Delete custom column "${deleteTarget?.label}"?`
              : `Delete row "${deleteTarget?.label}"? This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              if (!deleteTarget) return;
              if (deleteTarget.kind === "column")
                onConfirmColumn?.(deleteTarget.id);
              else onConfirmRow?.(deleteTarget.id);
              onClose();
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
