// "use client";

// import { useState, useMemo, useEffect } from 'react';
// import {
//     useReactTable,
//     getCoreRowModel,
//     getSortedRowModel,
//     getFilteredRowModel,
//     getPaginationRowModel,
//     flexRender,
// } from '@tanstack/react-table';
// import type { ColumnDef, SortingState, ColumnResizeMode } from '@tanstack/react-table';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//     ChevronDown,
//     ChevronUp,
//     Search,
//     Filter,
//     Download,
//     Plus,
//     ChevronLeft,
//     ChevronRight,
//     Settings2,
//     Eye,
//     EyeOff,
//     GripVertical,
//     MoreHorizontal,
//     X,
// } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { Button } from '@/components/shared/ui/button';
// import { Input } from '@/components/shared/ui/input';
// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuTrigger,
//     DropdownMenuSeparator,
//     DropdownMenuCheckboxItem,
//     DropdownMenuLabel,
// } from '@/components/shared/ui/dropdown-menu';

// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
// } from '@/components/shared/ui/dialog';

// interface ColumnConfig {
//     id: string;
//     header: string;
//     visible: boolean;
// }

// interface EditableTableProps<T extends { id: string }> {
//     data: T[];
//     columns: ColumnDef<T, any>[];
//     title: string;
//     description?: string;
//     metrics?: { label: string; value: string | number; trend?: number }[];
//     onAdd?: (data: Omit<T, 'id'>) => void;
//     onUpdate?: (id: string, data: Partial<T>) => void;
//     onDelete?: (id: string) => void;
//     onColumnsChange?: (columns: ColumnDef<T, any>[]) => void;
//     searchable?: boolean;
//     filterable?: boolean;
//     exportable?: boolean;
//     pagination?: boolean;
//     columnManagement?: boolean;
// }

// export function EditableTable<T extends { id: string }>({
//     data,
//     columns: initialColumns,
//     title,
//     description,
//     metrics,
//     onAdd,
//     onUpdate,
//     onColumnsChange,
//     searchable = true,
//     filterable = true,
//     exportable = true,
//     pagination = true,
//     columnManagement = true,
// }: EditableTableProps<T>) {
//     const [localColumns, setLocalColumns] = useState<ColumnDef<T, any>[]>(initialColumns);

//     // Update local columns when initialColumns change
//     useEffect(() => {
//         setLocalColumns(initialColumns);
//     }, [initialColumns]);

//     const [sorting, setSorting] = useState<SortingState>([]);
//     const [globalFilter, setGlobalFilter] = useState('');
//     const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
//     const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
//     const [editValue, setEditValue] = useState('');
//     const [newRow, setNewRow] = useState<Record<string, any> | null>(null);
//     const [newColumn, setNewColumn] = useState<{ id: string; header: string } | null>(null);
//     const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
//     // State for column renaming
//     const [renamingColumn, setRenamingColumn] = useState<string | null>(null);
//     const [newColumnName, setNewColumnName] = useState('');
//     const [showColumnManager, setShowColumnManager] = useState(false);

//     // Initialize column visibility
//     const visibleColumns = useMemo(() => {
//         return localColumns.filter((col: any) => {
//             const colId = col.id || col.accessorKey;
//             return columnVisibility[colId] !== false;
//         });
//     }, [localColumns, columnVisibility]);

//     const table = useReactTable({
//         data,
//         columns: visibleColumns,
//         state: {
//             sorting,
//             globalFilter,
//         },
//         onSortingChange: setSorting,
//         onGlobalFilterChange: setGlobalFilter,
//         getCoreRowModel: getCoreRowModel(),
//         getSortedRowModel: getSortedRowModel(),
//         getFilteredRowModel: getFilteredRowModel(),
//         getPaginationRowModel: getPaginationRowModel(),
//         columnResizeMode,
//         enableColumnResizing: true,
//     });

//     const handleCellClick = (rowId: string, columnId: string, value: any) => {
//         if (onUpdate && columnId !== 'actions') {
//             setEditingCell({ rowId, columnId });
//             setEditValue(String(value ?? ''));
//         }
//     };

//     const handleCellSave = () => {
//         if (editingCell && onUpdate) {
//             onUpdate(editingCell.rowId, { [editingCell.columnId]: editValue } as Partial<T>);
//             setEditingCell(null);
//         }
//     };

//     const handleExport = () => {
//         const headers = visibleColumns.map((col: any) => {
//             if (typeof col.header === 'string') return col.header;
//             return '';
//         }).join(',');
//         const rows = data.map((row) =>
//             visibleColumns
//                 .map((col: any) => {
//                     const accessor = col.accessorKey as string;
//                     return accessor ? String((row as any)[accessor] ?? '') : '';
//                 })
//                 .join(',')
//         );
//         const csv = [headers, ...rows].join('\n');
//         const blob = new Blob([csv], { type: 'text/csv' });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`;
//         a.click();
//         URL.revokeObjectURL(url);
//     };

//     const toggleColumn = (columnId: string) => {
//         setColumnVisibility((prev) => ({
//             ...prev,
//             [columnId]: prev[columnId] === false ? true : false,
//         }));
//     };

//     const handleAddRow = () => {
//         const emptyRow: Record<string, any> = {};
//         visibleColumns.forEach((col: any) => {
//             if (col.id && col.id !== 'actions') {
//                 emptyRow[col.id] = '';
//             }
//         });
//         setNewRow(emptyRow);
//     };

//     const handleSaveNewRow = () => {
//         if (newRow && onAdd) {
//             // Convert the newRow object to match the expected format
//             const newRowData: Omit<T, 'id'> = {} as Omit<T, 'id'>;
//             Object.keys(newRow).forEach(key => {
//                 (newRowData as any)[key] = newRow[key];
//             });
//             onAdd(newRowData);
//             setNewRow(null);
//         }
//     };

//     const handleCancelNewRow = () => {
//         setNewRow(null);
//     };

//     const handleNewRowChange = (field: string, value: any) => {
//         if (newRow) {
//             setNewRow({
//                 ...newRow,
//                 [field]: value,
//             });
//         }
//     };

//     const handleNewRowKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             handleSaveNewRow();
//         } else if (e.key === 'Escape') {
//             handleCancelNewRow();
//         }
//     };

//     const handleAddColumn = () => {
//         setNewColumn({ id: '', header: '' });
//     };

//     const handleNewColumnChange = (field: 'id' | 'header', value: string) => {
//         if (newColumn) {
//             setNewColumn({
//                 ...newColumn,
//                 [field]: value
//             });
//         }
//     };

//     const handleSaveNewColumn = () => {
//         if (newColumn && newColumn.id && newColumn.header) {
//             const newColumnDef: ColumnDef<T, any> = {
//                 id: newColumn.id,
//                 header: newColumn.header,
//                 accessorKey: newColumn.id,
//                 cell: ({ getValue }: any) => getValue() || '',
//                 size: 150,
//             };

//             const updatedColumns = [...localColumns, newColumnDef];
//             setLocalColumns(updatedColumns);

//             if (onColumnsChange) {
//                 onColumnsChange(updatedColumns);
//             }

//             setNewColumn(null);
//         }
//     };

//     const handleCancelNewColumn = () => {
//         setNewColumn(null);
//     };

//     const handleNewColumnKeyDown = (e: React.KeyboardEvent) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             handleSaveNewColumn();
//         } else if (e.key === 'Escape') {
//             handleCancelNewColumn();
//         }
//     };

//     const startColumnRename = (columnId: string, currentHeader: string) => {
//         setRenamingColumn(columnId);
//         setNewColumnName(currentHeader);
//     };

//     const saveColumnRename = () => {
//         if (renamingColumn && newColumnName.trim()) {
//             setRenamingColumn(null);
//         }
//     };

//     const cancelColumnRename = () => {
//         setRenamingColumn(null);
//     };

//     const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             saveColumnRename();
//         } else if (e.key === 'Escape') {
//             cancelColumnRename();
//         }
//     };

//     const columnConfigs: ColumnConfig[] = useMemo(() => {
//         return initialColumns.map((col: any) => ({
//             id: col.id || col.accessorKey,
//             header: typeof col.header === 'string' ? col.header : col.id || col.accessorKey,
//             visible: columnVisibility[col.id || col.accessorKey] !== false,
//         })).filter((col) => col.id !== 'actions');
//     }, [initialColumns, columnVisibility]);

//     return (
//         <div className="flex flex-col h-full bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
//             {/* Header */}
//             <div className="px-6 py-5 border-b border-border/50">
//                 <div className="flex items-center justify-between">
//                     <div>
//                         <h1 className="text-xl font-bold tracking-tight">{title}</h1>
//                         {description && <p className="text-sm text-muted-foreground mt-1 font-medium">{description}</p>}
//                     </div>
//                     <div className="flex items-center gap-2">
//                         {columnManagement && (
//                             <Button variant="outline" size="sm" onClick={() => setShowColumnManager(true)} className="rounded-xl font-semibold">
//                                 <Settings2 className="w-4 h-4 mr-2" />
//                                 Columns
//                             </Button>
//                         )}
//                         {exportable && (
//                             <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl font-semibold">
//                                 <Download className="w-4 h-4 mr-2" />
//                                 Export
//                             </Button>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* Metrics */}
//             {metrics && metrics.length > 0 && (
//                 <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-border/50 bg-[#F7F7F7]/50">
//                     {metrics.map((metric, index) => (
//                         <motion.div
//                             key={metric.label}
//                             initial={{ opacity: 0, y: 20 }}
//                             animate={{ opacity: 1, y: 0 }}
//                             transition={{ delay: index * 0.1 }}
//                             className="p-4 rounded-xl bg-white border border-border/40 shadow-sm"
//                         >
//                             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{metric.label}</p>
//                             <div className="flex items-end gap-2 mt-1.5">
//                                 <span className="text-2xl font-bold tracking-tight">{metric.value}</span>
//                                 {metric.trend !== undefined && (
//                                     <span
//                                         className={cn(
//                                             'text-xs font-bold mb-1 px-1.5 py-0.5 rounded-md',
//                                             metric.trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
//                                         )}
//                                     >
//                                         {metric.trend >= 0 ? '+' : ''}{metric.trend}%
//                                     </span>
//                                 )}
//                             </div>
//                         </motion.div>
//                     ))}
//                 </div>
//             )}

//             {/* Toolbar */}
//             <div className="px-6 py-4 flex items-center justify-between gap-4 border-b border-border/50">
//                 <div className="flex items-center gap-3 flex-1">
//                     {searchable && (
//                         <div className="relative max-w-sm group">
//                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
//                             <Input
//                                 placeholder="Search database..."
//                                 value={globalFilter}
//                                 onChange={(e) => setGlobalFilter(e.target.value)}
//                                 className="pl-9 h-10 rounded-xl"
//                             />
//                         </div>
//                     )}
//                     {filterable && (
//                         <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                                 <Button variant="outline" size="sm" className="h-10 rounded-xl font-semibold">
//                                     <Filter className="w-4 h-4 mr-2" />
//                                     Filter
//                                 </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="start" className="w-48">
//                                 <DropdownMenuItem>All Status</DropdownMenuItem>
//                                 <DropdownMenuItem>Active Only</DropdownMenuItem>
//                                 <DropdownMenuItem>Inactive Only</DropdownMenuItem>
//                                 <DropdownMenuSeparator />
//                                 <DropdownMenuItem>Sort by Name</DropdownMenuItem>
//                                 <DropdownMenuItem>Sort by Date</DropdownMenuItem>
//                             </DropdownMenuContent>
//                         </DropdownMenu>
//                     )}
//                 </div>
//                 <div className="flex items-center gap-3">
//                     <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-secondary/50 px-2 py-1 rounded-md">
//                         {table.getFilteredRowModel().rows.length} records
//                     </span>
//                     {columnManagement && (
//                         <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                                 <Button variant="ghost" size="sm" className="h-10 rounded-xl font-semibold">
//                                     <Eye className="w-4 h-4 mr-2" />
//                                     View
//                                 </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end" className="w-56">
//                                 <DropdownMenuLabel>Column Visibility</DropdownMenuLabel>
//                                 <DropdownMenuSeparator />
//                                 {columnConfigs.map((col) => (
//                                     <DropdownMenuCheckboxItem
//                                         key={col.id}
//                                         checked={col.visible}
//                                         onCheckedChange={() => toggleColumn(col.id)}
//                                     >
//                                         {col.header}
//                                     </DropdownMenuCheckboxItem>
//                                 ))}
//                             </DropdownMenuContent>
//                         </DropdownMenu>
//                     )}
//                 </div>
//             </div>

//             {/* Table Content */}
//             <div className="flex-1 overflow-auto custom-scrollbar">
//                 <table className="w-full text-sm">
//                     <thead className="sticky top-0 bg-white z-10 border-b border-border/50">
//                         {table.getHeaderGroups().map((headerGroup) => (
//                             <tr key={headerGroup.id}>
//                                 {headerGroup.headers.map((header) => (
//                                     <th
//                                         key={header.id}
//                                         className="h-12 px-6 text-left align-middle font-bold text-[11px] uppercase tracking-widest text-muted-foreground bg-[#F7F7F7]/50 relative group"
//                                         style={{ width: header.getSize() }}
//                                     >
//                                         <div
//                                             className={cn(
//                                                 'flex items-center gap-1 cursor-pointer select-none transition-colors hover:text-foreground',
//                                                 header.column.getCanSort() && 'cursor-pointer'
//                                             )}
//                                             onClick={renamingColumn === header.id ? undefined : header.column.getToggleSortingHandler()}
//                                         >
//                                             {renamingColumn === header.id ? (
//                                                 <input
//                                                     type="text"
//                                                     value={newColumnName}
//                                                     onChange={(e) => setNewColumnName(e.target.value)}
//                                                     onBlur={saveColumnRename}
//                                                     onKeyDown={handleRenameKeyDown}
//                                                     autoFocus
//                                                     className="px-2 py-1 text-xs bg-white border border-black rounded-lg outline-none w-full"
//                                                 />
//                                             ) : (
//                                                 <div className="flex items-center gap-1.5">
//                                                     <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
//                                                     {header.column.getCanSort() && (
//                                                         <span className="opacity-0 group-hover:opacity-100 transition-opacity">
//                                                             {header.column.getIsSorted() === 'asc' && <ChevronUp className="w-3 h-3" />}
//                                                             {header.column.getIsSorted() === 'desc' && <ChevronDown className="w-3 h-3" />}
//                                                             {!header.column.getIsSorted() && <ChevronDown className="w-3 h-3 opacity-30" />}
//                                                         </span>
//                                                     )}
//                                                 </div>
//                                             )}
//                                         </div>
//                                         {header.column.getCanResize() && (
//                                             <div
//                                                 onMouseDown={header.getResizeHandler()}
//                                                 onTouchStart={header.getResizeHandler()}
//                                                 className={cn(
//                                                     'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity z-20',
//                                                     header.column.getIsResizing() && 'opacity-100 bg-black'
//                                                 )}
//                                             />
//                                         )}
//                                     </th>
//                                 ))}
//                                 <th className="w-12 bg-[#F7F7F7]/50 border-l border-border/20">
//                                     <button onClick={handleAddColumn} className="w-full flex justify-center text-muted-foreground hover:text-foreground transition-colors">
//                                         <Plus className="w-4 h-4" />
//                                     </button>
//                                 </th>
//                             </tr>
//                         ))}
//                     </thead>
//                     <tbody className="divide-y divide-border/30">
//                         {table.getRowModel().rows.map((row) => (
//                             <tr key={row.id} className="group hover:bg-[#F7F7F7]/30 transition-colors">
//                                 {row.getVisibleCells().map((cell) => {
//                                     const isEditing =
//                                         editingCell?.rowId === row.original.id &&
//                                         editingCell?.columnId === cell.column.id;

//                                     return (
//                                         <td
//                                             key={cell.id}
//                                             className="px-6 py-4 whitespace-nowrap align-middle"
//                                             style={{ width: cell.column.getSize() }}
//                                         >
//                                             {isEditing ? (
//                                                 <input
//                                                     type="text"
//                                                     value={editValue}
//                                                     onChange={(e) => setEditValue(e.target.value)}
//                                                     onBlur={handleCellSave}
//                                                     onKeyDown={(e) => {
//                                                         if (e.key === 'Enter') handleCellSave();
//                                                         if (e.key === 'Escape') setEditingCell(null);
//                                                     }}
//                                                     autoFocus
//                                                     className="w-full px-2 py-1.5 text-sm bg-white border border-black rounded-lg outline-none shadow-xl relative z-30"
//                                                 />
//                                             ) : (
//                                                 <div
//                                                     className="font-medium text-foreground/80 cursor-text"
//                                                     onClick={() => handleCellClick(row.original.id, cell.column.id, cell.getValue())}
//                                                 >
//                                                     {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                                                 </div>
//                                             )}
//                                         </td>
//                                     );
//                                 })}
//                                 <td className="w-12 border-l border-border/10"></td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>

//                 {table.getRowModel().rows.length === 0 && (
//                     <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-[#F7F7F7]/30">
//                         <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 border border-border/40">
//                             <Search className="w-5 h-5 opacity-20" />
//                         </div>
//                         <p className="text-sm font-bold uppercase tracking-widest opacity-40">No analytics found</p>
//                     </div>
//                 )}
//             </div>

//             {/* Pagination */}
//             {pagination && (
//                 <div className="px-6 py-4 border-t border-border/50 bg-[#F7F7F7]/50 flex items-center justify-between">
//                     <div className="flex items-center gap-4">
//                         <div className="flex items-center gap-2">
//                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Page</span>
//                             <span className="text-sm font-bold">{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
//                         </div>
//                         <div className="h-4 w-px bg-border/40" />
//                         <select
//                             value={table.getState().pagination.pageSize}
//                             onChange={(e) => table.setPageSize(Number(e.target.value))}
//                             className="text-xs font-bold bg-transparent outline-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
//                             title="Items per page"
//                         >
//                             {[10, 20, 50, 100].map((size) => (
//                                 <option key={size} value={size}>
//                                     {size} per page
//                                 </option>
//                             ))}
//                         </select>
//                     </div>
//                     <div className="flex items-center gap-1.5">
//                         <Button
//                             variant="outline"
//                             size="sm"
//                             onClick={() => table.previousPage()}
//                             disabled={!table.getCanPreviousPage()}
//                             className="h-9 w-9 p-0 rounded-xl"
//                         >
//                             <ChevronLeft className="w-4 h-4" />
//                         </Button>
//                         <Button
//                             variant="outline"
//                             size="sm"
//                             onClick={() => table.nextPage()}
//                             disabled={!table.getCanNextPage()}
//                             className="h-9 w-9 p-0 rounded-xl"
//                         >
//                             <ChevronRight className="w-4 h-4" />
//                         </Button>
//                     </div>
//                 </div>
//             )}

//             {/* Column Manager Dialog */}
//             <Dialog open={showColumnManager} onOpenChange={setShowColumnManager}>
//                 <DialogContent className="max-w-md rounded-2xl">
//                     <DialogHeader>
//                         <DialogTitle>Customize Data View</DialogTitle>
//                     </DialogHeader>
//                     <div className="space-y-4 pt-4">
//                         <div className="space-y-2 max-h-96 overflow-y-auto px-1 custom-scrollbar">
//                             {columnConfigs.map((col) => (
//                                 <div
//                                     key={col.id}
//                                     className="flex items-center justify-between p-3.5 border border-border/40 rounded-xl bg-[#F7F7F7]/30 hover:bg-black/5 transition-all group"
//                                 >
//                                     <div className="flex items-center gap-3">
//                                         <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
//                                         <span className="text-sm font-bold text-foreground/80">{col.header}</span>
//                                     </div>
//                                     <button
//                                         onClick={() => toggleColumn(col.id)}
//                                         className={cn(
//                                             'p-2 rounded-lg transition-all',
//                                             col.visible
//                                                 ? 'bg-black text-white hover:bg-black/80 shadow-lg shadow-black/10'
//                                                 : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
//                                         )}
//                                     >
//                                         {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
//                                     </button>
//                                 </div>
//                             ))}
//                         </div>
//                         <div className="flex justify-end pt-2">
//                             <Button onClick={() => setShowColumnManager(false)} className="rounded-xl w-full h-11 font-bold">
//                                 Done
//                             </Button>
//                         </div>
//                     </div>
//                 </DialogContent>
//             </Dialog>
//         </div>
//     );
// }
