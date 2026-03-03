"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";

type EditableTableFooterBarProps = {
  canAdd: boolean;
  setIsAdding: (value: boolean) => void;
  setNewRowData: (value: Record<string, unknown>) => void;
  pagination: boolean;
  onPageChange?: (page: number) => void;
  currentPage: number;
  totalPages: number;
  totalRows: number;
  dataLength: number;
  pageSize: number;
};

export function EditableTableFooterBar({
  canAdd,
  setIsAdding,
  setNewRowData,
  pagination,
  onPageChange,
  currentPage,
  totalPages,
  totalRows,
  dataLength,
  pageSize,
}: EditableTableFooterBarProps) {
  const totalCount = totalRows || dataLength;

  return (
    <div className="border-t border-border bg-white">
      <div className="flex flex-wrap items-center justify-between px-6 py-4 gap-3">
        <div className="flex flex-col items-start gap-2">
          {canAdd ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAdding(true);
                setNewRowData({});
              }}
              aria-label="New Record"
              className="h-11 rounded-xl border-[#E6EAFA] bg-[#F5F7FF] px-5 text-[15px] font-semibold text-[#4166C9] hover:bg-[#EEF3FF]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New row
            </Button>
          ) : null}
        </div>

        {pagination ? (
          <div className="ml-auto flex items-center gap-2">
            <p className="text-sm text-[#787774] whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </p>
            <div className="hidden sm:block h-8 w-px bg-border/80 mx-1" />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => onPageChange?.(currentPage - 1)}
                className="!border-[#BEC9DD] hover:!border-[#AAB9D3]"
              >
                <ChevronLeft className="w-4 h-4 mr-1 text-blue-500" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange?.(currentPage + 1)}
                className="!border-[#BEC9DD] hover:!border-[#AAB9D3]"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1 text-blue-500" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="border-t border-border px-6 py-3">
        <div className="flex items-center justify-between gap-2 text-sm text-[#787774]">
          <p className="whitespace-nowrap">{totalCount} rows</p>
          <p className="whitespace-nowrap">
            Showing {dataLength} • {pageSize}/page
          </p>
        </div>
      </div>
    </div>
  );
}
