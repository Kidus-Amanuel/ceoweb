import { flexRender } from "@tanstack/react-table";
import type { HeaderGroup } from "@tanstack/react-table";
import { ChevronUp, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover/Popover";
import {
  TableHeader as UITableHeader,
  TableHead,
  TableRow,
} from "@/components/shared/ui/table";
import { CustomColumnEditorContent } from "../CustomColumnEditorContent";
import { getTypeIcon, getTypeIconTone } from "@/utils/table-utils";
import type { VirtualColumn } from "@/utils/table-utils";
import type {
  ColumnFieldChoice,
  ColumnFieldType,
} from "../CustomColumnEditorContent";

interface EditableTableHeaderProps<T extends { id: string }> {
  headerGroups: HeaderGroup<T>[];
  autoWidthByColumnId: Map<string, number>;
  virtualColumns: VirtualColumn[];

  // Column management state
  isColPopoverOpen: boolean;
  editingColumnId: string | null;
  colFormSeed: number;
  colFormError: string | null;
  newColType: VirtualColumn["type"];
  newColLabelValue: string;
  newColOptionsValue: string;
  typeFilter: string;
  filteredTypeChoices: ColumnFieldChoice[];
  editingColumn: VirtualColumn | null;
  editingColumnHasValues: boolean;

  // Callbacks
  onSelectAll: (checked: boolean) => void;
  onToggleSort: (columnId: string) => void;
  onOpenColumnForEdit: (column: VirtualColumn) => void;
  onRequestColumnDelete: (column: VirtualColumn) => void;
  onOpenColumnForCreate: () => void;
  onCloseColumnEditor: () => void;
  onTypeFilterChange: (value: string) => void;
  onColTypeChange: (type: VirtualColumn["type"]) => void;
  onColLabelChange: (value: string) => void;
  onColOptionsChange: (value: string) => void;
  onSaveColumn: () => void;

  // Utility functions
  getColumnSizeClasses: (
    columnId: string,
    isVirtual: boolean,
    type: unknown,
  ) => string;
  isEmailColumn: (columnId: string, type: unknown) => boolean;
  isPhoneColumn: (columnId: string, type: unknown) => boolean;

  // Feature flags
  isAllRowsSelected: boolean;
  isSomeRowsSelected: boolean;
  canAddColumns: boolean;
  canEditColumns: boolean;
  canDeleteColumns: boolean;
  showDeleteColumn: boolean;
}

/**
 * Renders table header with column labels, sorting, and column management
 *
 * Features:
 * - Select all checkbox
 * - Sortable column headers with type icons
 * - Edit button for virtual columns
 * - Add column button with popover editor
 */
export function EditableTableHeader<
  T extends { id: string; customValues?: Record<string, unknown> },
>({
  headerGroups,
  autoWidthByColumnId,
  virtualColumns,
  isColPopoverOpen,
  editingColumnId,
  colFormSeed,
  colFormError,
  newColType,
  newColLabelValue,
  newColOptionsValue,
  typeFilter,
  filteredTypeChoices,
  editingColumn,
  editingColumnHasValues,
  onSelectAll,
  onToggleSort,
  onOpenColumnForEdit,
  onRequestColumnDelete,
  onOpenColumnForCreate,
  onCloseColumnEditor,
  onTypeFilterChange,
  onColTypeChange,
  onColLabelChange,
  onColOptionsChange,
  onSaveColumn,
  getColumnSizeClasses,
  isEmailColumn,
  isPhoneColumn,
  isAllRowsSelected,
  isSomeRowsSelected,
  canAddColumns,
  canEditColumns,
  canDeleteColumns,
  showDeleteColumn,
}: EditableTableHeaderProps<T>) {
  return (
    <UITableHeader className="sticky top-0 z-30 bg-slate-50 [&_tr]:border-b [&_tr]:border-slate-300">
      {headerGroups.map((group) => (
        <TableRow key={group.id} className="hover:bg-transparent">
          {/* Select all checkbox */}
          <TableHead className="h-8 w-10 min-w-10 px-2 border-r border-slate-300 text-left bg-white">
            <div className="flex items-center justify-start">
              <Checkbox
                checked={
                  isAllRowsSelected || (isSomeRowsSelected && "indeterminate")
                }
                onCheckedChange={(value) => onSelectAll(value === true)}
                className="size-4"
              />
            </div>
          </TableHead>

          {/* Data columns */}
          {group.headers.map((header, i) => {
            const headerType = header.column.columnDef.meta?.type;
            const headerKey = String(
              header.column.columnDef.meta?.virtualKey ?? header.column.id,
            );
            const headerAutoWidth = autoWidthByColumnId.get(header.column.id);
            const emailOrPhoneHeader =
              headerKey.toLowerCase().includes("name") ||
              isEmailColumn(headerKey, headerType) ||
              isPhoneColumn(headerKey, headerType);
            const isVirtual = !!header.column.columnDef.meta?.isVirtual;
            // Find the virtual column data by matching the ID
            const virtualColumnData = isVirtual
              ? virtualColumns.find((vc) => `vcol:${vc.id}` === header.id)
              : null;

            return (
              <TableHead
                key={header.id}
                className={cn(
                  "h-8 text-left align-middle font-semibold text-[11px] uppercase tracking-wide text-slate-700 border-r border-slate-300 last:border-r-0 transition-colors hover:bg-slate-100",
                  getColumnSizeClasses(headerKey, isVirtual, headerType),
                  "px-3",
                )}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  ...(emailOrPhoneHeader && headerAutoWidth
                    ? { minWidth: `${headerAutoWidth}px` }
                    : {}),
                }}
              >
                <div
                  className="flex items-center justify-start gap-1.5 cursor-pointer group"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1.5">
                    {/* Type icon - smaller and cleaner */}
                    {(() => {
                      const type = headerType ?? "text";
                      const Icon = getTypeIcon(type);
                      return (
                        <span
                          className={cn(
                            "inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-slate-400 bg-white transition-colors group-hover:border-slate-500",
                            getTypeIconTone(type),
                          )}
                        >
                          <Icon
                            className="h-2 w-2 text-slate-600"
                            strokeWidth={2.5}
                          />
                        </span>
                      );
                    })()}

                    {/* Column label */}
                    <span className="flex items-center gap-1.5">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}

                      {/* Edit button for virtual columns */}
                      {canEditColumns && isVirtual && virtualColumnData && (
                        <Popover
                          open={
                            isColPopoverOpen &&
                            editingColumnId === virtualColumnData.id
                          }
                          onOpenChange={(open) => {
                            if (open) {
                              onOpenColumnForEdit(virtualColumnData);
                            } else {
                              onCloseColumnEditor();
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Edit column ${virtualColumnData.label}`}
                              className="text-blue-500 hover:text-blue-600 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenColumnForEdit(virtualColumnData);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            onOpenAutoFocus={(event) => event.preventDefault()}
                            className="w-[680px] p-4 space-y-3 shadow-3xl rounded-[20px] border-[#E6E6E3] z-[100]"
                          >
                            <CustomColumnEditorContent
                              seed={colFormSeed}
                              nameDefault={newColLabelValue}
                              optionsDefault={newColOptionsValue}
                              currentType={newColType}
                              fieldTypeFilter={typeFilter}
                              onFieldTypeFilterChange={onTypeFilterChange}
                              choices={filteredTypeChoices}
                              lockTypeChange={
                                editingColumnHasValues && !!editingColumn
                              }
                              onTypeChange={onColTypeChange}
                              onNameChange={onColLabelChange}
                              onOptionsChange={onColOptionsChange}
                              error={colFormError}
                              onSave={onSaveColumn}
                              saveLabel="Update Property"
                            />
                          </PopoverContent>
                        </Popover>
                      )}

                      {/* Delete button for virtual columns */}
                      {canDeleteColumns && isVirtual && virtualColumnData && (
                        <button
                          type="button"
                          aria-label={`Delete column ${virtualColumnData.label}`}
                          className="text-red-500 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestColumnDelete(virtualColumnData);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </span>
                  </div>

                  {/* Sort indicator - subtle and professional */}
                  {header.column.getIsSorted() === "asc" ? (
                    <ChevronUp
                      className="w-3 h-3 text-slate-600"
                      strokeWidth={2.5}
                    />
                  ) : header.column.getIsSorted() === "desc" ? (
                    <ChevronDown
                      className="w-3 h-3 text-slate-600"
                      strokeWidth={2.5}
                    />
                  ) : null}
                </div>
              </TableHead>
            );
          })}

          {/* Add column button - compact */}
          <TableHead className="w-10 border-r border-slate-300 last:border-r-0 px-1 bg-white">
            {canAddColumns && (
              <Popover
                open={isColPopoverOpen && !editingColumnId}
                onOpenChange={(open) => {
                  if (open) {
                    onOpenColumnForCreate();
                  } else {
                    onCloseColumnEditor();
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isColPopoverOpen || editingColumnId) {
                        onOpenColumnForCreate();
                      }
                    }}
                    aria-label="Add new column"
                    className="flex items-center justify-center w-6 h-6 rounded-sm bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-300 hover:border-slate-400 transition-all duration-150"
                  >
                    <Plus className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  className="w-[680px] p-4 space-y-3 shadow-3xl rounded-[20px] border-[#E6E6E3] z-[100]"
                >
                  <CustomColumnEditorContent
                    seed={colFormSeed}
                    nameDefault={newColLabelValue}
                    optionsDefault={newColOptionsValue}
                    currentType={newColType as ColumnFieldType}
                    fieldTypeFilter={typeFilter}
                    onFieldTypeFilterChange={onTypeFilterChange}
                    choices={filteredTypeChoices}
                    lockTypeChange={false}
                    onTypeChange={onColTypeChange}
                    onNameChange={onColLabelChange}
                    onOptionsChange={onColOptionsChange}
                    error={colFormError}
                    onSave={onSaveColumn}
                    saveLabel="Create Property"
                  />
                </PopoverContent>
              </Popover>
            )}
          </TableHead>

          {showDeleteColumn ? (
            <TableHead className="w-20 px-4 bg-slate-900/50 border-r border-slate-700" />
          ) : null}
        </TableRow>
      ))}
    </UITableHeader>
  );
}
