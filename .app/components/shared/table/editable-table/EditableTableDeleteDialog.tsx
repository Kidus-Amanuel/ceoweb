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

type EditableTableDeleteDialogProps = {
  deleteTarget: DeleteTarget;
  onClose: () => void;
  onDeleteRow?: (rowId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
};

export function EditableTableDeleteDialog({
  deleteTarget,
  onClose,
  onDeleteRow,
  onDeleteColumn,
}: EditableTableDeleteDialogProps) {
  return (
    <Dialog
      open={!!deleteTarget}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
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
                onDeleteColumn?.(deleteTarget.id);
              else onDeleteRow?.(deleteTarget.id);
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
