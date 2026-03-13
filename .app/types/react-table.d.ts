import type { ColumnFieldType } from "@/components/shared/table/CustomColumnEditorContent";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends object, TValue> {
    type?: ColumnFieldType;
  }
}
