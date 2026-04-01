"use client";

import { useMemo, useState, useCallback } from "react";
import { type VirtualColumn } from "@/components/shared/table/EditableTable";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  ShieldCheck,
  Plus,
  Users,
  Search,
  RefreshCw,
  Layers,
  Settings2,
  X,
  ChevronRight,
  UserPlus,
  ClipboardList,
  ShieldAlert,
  Save,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { useCompanies } from "@/hooks/use-companies";
import {
  useRoles,
  useDepartments,
  useAddRole,
  useUpdateRole,
  useDeleteRole,
  useHrColumnDefs,
  useAddHrColumn,
  useUpdateHrColumn,
  useDeleteHrColumn,
  useRolePermissions,
  useUpdateRolePermissions,
} from "@/hooks/use-hr";
import { useUser } from "@/app/context/UserContext";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/shared/ui/input/Input";
import { motion, AnimatePresence } from "framer-motion";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";
import { type ColumnFieldType } from "@/components/shared/table/CustomColumnEditorContent";
import { Badge } from "@/components/shared/ui/badge/Badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/shared/ui/sheet/Sheet";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import { ScrollArea } from "@/components/shared/ui/scroll-area/ScrollArea";
import { PrivilegeMatrix } from "@/components/hr/positions/PrivilegeMatrix";

const MODULES = [
  { id: "hr", name: "Human Resources" },
  { id: "crm", name: "Customer Relationship Management" },
  { id: "inventory", name: "Inventory Management" },
  { id: "fleet", name: "Fleet Management" },
  { id: "finance", name: "Finance" },
  { id: "projects", name: "Project Management" },
  { id: "trade", name: "International Trade" },
];
const ACTIONS = ["view", "create", "edit", "delete", "approve", "export"];

const MODULE_DISPLAY_TO_ID: Record<string, string> = {
  "Human Resources": "hr",
  "Customer Relationship Management": "crm",
  "Inventory Management": "inventory",
  "Fleet Management": "fleet",
  Finance: "finance",
  "Project Management": "projects",
  "International Trade": "trade",
};

export default function RolesPage() {
  const { selectedCompany } = useCompanies();
  const { roleInfo } = useUser();
  const companyId = selectedCompany?.id;

  // 0. Filter modules by plan
  const allowedModules = useMemo(() => {
    if (!roleInfo?.plan_modules) return MODULES;
    // Super admins see everything by default, but let's stick to plan modules for consistency if needed
    // The user said "check companies plan", so we filter.
    return MODULES.filter((m) => roleInfo.plan_modules.includes(m.id));
  }, [roleInfo]);

  // 1. State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isPermSheetOpen, setIsPermSheetOpen] = useState(false);
  const [tempPermissions, setTempPermissions] = useState<any[]>([]);

  // 2. Data Fetching
  const { data: roles = [], isLoading } = useRoles(companyId);
  const { data: departments = [] } = useDepartments(companyId);
  const { data: columnDefs = [] } = useHrColumnDefs("roles", companyId);
  const { data: rolePerms } = useRolePermissions(selectedRowId || undefined);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRowId),
    [roles, selectedRowId],
  );

  // 3. Mutations
  const addRole = useAddRole(companyId, {
    onSuccess: () => toast.success("Role deployed successfully"),
    onError: (err: any) => toast.error(err.message || "Failed to deploy role"),
  });
  const updateRole = useUpdateRole(companyId, {
    onSuccess: () => toast.success("Role optimized successfully"),
    onError: (err: any) =>
      toast.error(err.message || "Failed to optimize role"),
  });
  const deleteRole = useDeleteRole(companyId, {
    onSuccess: () => {
      toast.success("Role recalled successfully");
      setSelectedRowId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to recall role"),
  });

  const updatePerms = useUpdateRolePermissions(companyId, {
    onSuccess: () => {
      toast.success("Permissions synchronized");
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to sync permissions"),
  });

  const addColumn = useAddHrColumn("roles", companyId, {
    onSuccess: () => toast.success("Field deployed"),
  });
  const updateColumn = useUpdateHrColumn("roles", companyId, {
    onSuccess: () => toast.success("Field optimized"),
  });
  const deleteColumn = useDeleteHrColumn("roles", companyId, {
    onSuccess: () => toast.success("Field recalled"),
  });

  // 4. Derived Configuration
  const virtualColumns = useMemo((): VirtualColumn[] => {
    return (columnDefs as any[]).map((def) => ({
      id: String(def.id),
      label: String(def.field_label),
      key: String(def.field_name),
      type: def.field_type as any,
      options: ((def.field_options || []) as string[]).map((o) => ({
        label: o,
        value: o,
      })),
    }));
  }, [columnDefs]);

  const mappedRoles = useMemo(
    () => roles.map((r) => ({ ...r, customValues: r.custom_fields || {} })),
    [roles],
  );

  const stats = useMemo(
    () => ({
      total: roles.length,
      withPerms: roles.filter((r) => (r.permissions?.length || 0) > 0).length,
    }),
    [roles],
  );

  const openPermissionEditor = useCallback(() => {
    if (!selectedRole) return;
    // We favor specific fetched permissions over the join if available
    setTempPermissions([...(rolePerms || selectedRole.permissions || [])]);
    setIsPermSheetOpen(true);
  }, [selectedRole, rolePerms]);

  // 5. Table Columns
  const columns = useMemo(
    () => [
      {
        header: "Organizational Role",
        accessorKey: "name",
        meta: { type: "text" as ColumnFieldType },
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-700 tracking-tight leading-none mb-1">
                {row.original.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 uppercase tracking-tighter">
                <ClipboardList className="w-2.5 h-2.5" /> ID:{" "}
                {row.original.id.slice(0, 8)}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Department Scope",
        accessorKey: "department",
        meta: {
          type: "select" as ColumnFieldType,
          options: departments.map((d: any) => ({
            label: d.name,
            value: d.id,
          })),
        },
        cell: ({ row }: any) => {
          const deptId = row.original.department;
          const dept = departments.find((d: any) => d.id === deptId);
          return (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[9px] font-black tracking-widest bg-slate-50 text-slate-600 border-slate-100 uppercase"
              >
                {dept?.name || "System Global"}
              </Badge>
            </div>
          );
        },
      },
      {
        header: "Quick Privileges",
        accessorKey: "permissions",
        meta: {
          type: "text" as ColumnFieldType, // Default to text but we want to hide it
          excludeFromForm: true,
        },
        cell: ({ row }: any) => {
          const role = row.original;
          const deptId = role.department;
          const dept = departments.find((d: any) => d.id === deptId);
          const deptName = dept?.name || "Human Resources";
          const targetModule = (
            MODULE_DISPLAY_TO_ID[deptName] || "hr"
          ).toLowerCase();

          // Check if module is allowed in plan
          const isModuleAllowed =
            roleInfo?.plan_modules?.includes(targetModule);

          if (!isModuleAllowed && roleInfo?.user_type !== "super_admin") {
            return (
              <Badge
                variant="outline"
                className="text-[8px] opacity-30 grayscale"
              >
                PLAN_RESTRICTED
              </Badge>
            );
          }

          const perms = role.permissions || [];

          const hasPerm = (act: string) =>
            perms.some(
              (p: any) => p.module === targetModule && p.action === act,
            );

          return (
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {["view", "create", "edit", "delete"].map((act) => {
                const active = hasPerm(act);
                return (
                  <div
                    key={act}
                    title={`${act.toUpperCase()} ${targetModule.toUpperCase()}`}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer border shadow-sm ${
                      active
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-white border-slate-100 text-slate-300 hover:border-indigo-200 hover:text-indigo-400"
                    }`}
                    onClick={async () => {
                      const newPerms = active
                        ? perms.filter(
                            (p: any) =>
                              !(p.module === targetModule && p.action === act),
                          )
                        : [
                            ...perms.map((p: any) => ({
                              module: p.module,
                              action: p.action,
                            })),
                            { module: targetModule, action: act },
                          ];

                      await updatePerms.mutateAsync({
                        roleId: role.id,
                        permissions: newPerms,
                      });
                      toast.success(
                        `${act.toUpperCase()} ${active ? "removed" : "granted"} for ${targetModule.toUpperCase()}`,
                      );
                    }}
                  >
                    <span className="text-[9px] font-black uppercase">
                      {act === "create" ? "A" : act[0]}
                    </span>
                  </div>
                );
              })}
              <div className="w-[1px] h-4 bg-slate-100 mx-1" />
              <Badge
                variant="outline"
                className="text-[8px] font-black tracking-tighter bg-slate-50 text-slate-400 border-none px-1 uppercase opacity-50"
              >
                {MODULES.find((m) => m.id === targetModule)?.name ||
                  targetModule}
              </Badge>
            </div>
          );
        },
      },
      {
        header: "Privileges",
        accessorKey: "id",
        meta: {
          type: "text" as ColumnFieldType,
          excludeFromForm: true,
        },
        cell: ({ row }: any) => {
          const count = row.original.permissions?.length || 0;
          return (
            <div
              className="flex items-center gap-2 cursor-pointer group/perm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRowId(row.original.id);
                openPermissionEditor();
              }}
            >
              <Badge
                variant="outline"
                className={`text-[9px] font-black tracking-widest transition-all ${count > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100 group-hover/perm:bg-emerald-600 group-hover/perm:text-white" : "bg-slate-50 text-slate-400 border-slate-100 group-hover/perm:border-indigo-400 group-hover/perm:text-indigo-600"}`}
              >
                {count} MODULES CONFIGURED
                <ChevronRight className="w-3 h-3 ml-1 group-hover/perm:translate-x-0.5 transition-transform" />
              </Badge>
            </div>
          );
        },
      },
      {
        header: "Summary",
        accessorKey: "description",
        meta: { type: "text" as ColumnFieldType },
        cell: ({ row }: any) => (
          <span className="text-[11px] text-slate-500 line-clamp-1 max-w-[250px] font-medium leading-relaxed italic">
            {row.original.description ||
              "Operational role without explicit summary."}
          </span>
        ),
      },
    ],
    [departments, openPermissionEditor, updatePerms, roleInfo],
  );

  const handleUpdate = async (id: string, updatedFields: any) => {
    try {
      const payload: any = { id };
      const customData = updatedFields.customValues || {};
      const standardKeys = ["name", "description", "department"];

      Object.keys(updatedFields).forEach((key) => {
        if (standardKeys.includes(key)) payload[key] = updatedFields[key];
      });

      const existing = roles.find((x) => x.id === id);
      const mergedCustom = {
        ...(existing?.custom_fields || {}),
        ...customData,
      };
      if (Object.keys(mergedCustom).length > 0)
        payload.custom_fields = mergedCustom;

      await updateRole.mutateAsync(payload);
    } catch (err) {
      console.error("[RolesPage] Update error:", err);
    }
  };

  const handleAdd = async (newItem: any) => {
    try {
      const customData = newItem.customValues || {};
      const payload: any = { company_id: companyId, custom_fields: customData };
      const standardKeys = ["name", "description", "department"];

      Object.keys(newItem).forEach((key) => {
        if (standardKeys.includes(key)) payload[key] = newItem[key];
      });

      await addRole.mutateAsync(payload);
    } catch (err) {
      console.error("[RolesPage] Add error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRole.mutateAsync(id);
  };

  const togglePermission = (module: string, action: string) => {
    const exists = tempPermissions.find(
      (p) => p.module === module && p.action === action,
    );
    if (exists) {
      setTempPermissions(
        tempPermissions.filter(
          (p) => !(p.module === module && p.action === action),
        ),
      );
    } else {
      setTempPermissions([...tempPermissions, { module, action }]);
    }
  };

  const handlePermissionSave = async () => {
    if (!selectedRowId) return;
    await updatePerms.mutateAsync({
      roleId: selectedRowId,
      permissions: tempPermissions,
    });
    setIsPermSheetOpen(false);
  };

  const handleColumnAdd = async (payload: any) => {
    if (!companyId) return;
    await addColumn.mutateAsync({
      entityType: "roles",
      fieldLabel: payload.label,
      fieldName: payload.key,
      fieldType: payload.type === "status" ? "select" : payload.type,
      fieldOptions: (payload.options ?? []).map((o: any) =>
        String(o.value ?? o.label),
      ),
    });
  };

  const handleColumnUpdate = async (fieldId: string, payload: any) => {
    if (!companyId) return;
    await updateColumn.mutateAsync({
      fieldId,
      fieldLabel: payload.label,
      fieldName: payload.key,
      fieldType: payload.type === "status" ? "select" : payload.type,
      fieldOptions: (payload.options ?? []).map((o: any) =>
        String(o.value ?? o.label),
      ),
    });
  };

  const handleColumnDelete = async (fieldId: string) => {
    if (!companyId) return;
    await deleteColumn.mutateAsync(fieldId);
  };

  if (!companyId) return null;

  return (
    <div className="space-y-4 relative">
      <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/50 shadow-2xl shadow-indigo-900/5 min-h-[750px] flex flex-col relative overflow-hidden">
        {/* Dynamic Header */}
        <div className="relative z-[60] bg-white/10 border-b border-slate-200/50">
          <AnimatePresence mode="wait">
            {!selectedRowId ? (
              <motion.div
                key="default-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input
                      placeholder="Search system roles..."
                      className="pl-10 h-10 border-slate-200/60 rounded-2xl bg-white shadow-sm text-xs focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-auto mr-4">
                  <span className="flex items-center gap-2">
                    Total Roles{" "}
                    <span className="text-slate-900 text-xs font-black">
                      {stats.total}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-emerald-500">
                    Configured{" "}
                    <span className="text-emerald-700 text-xs font-black">
                      {stats.withPerms}
                    </span>
                  </span>
                </div>

                <Button
                  size="sm"
                  className="h-10 px-6 rounded-2xl gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-900/20"
                  onClick={() =>
                    (
                      document.querySelector(
                        '[aria-label="New Record"]',
                      ) as HTMLButtonElement
                    )?.click()
                  }
                >
                  <Plus className="w-4 h-4" /> DEPLOY ROLE
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="selection-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex items-center justify-between bg-indigo-50/80 backdrop-blur-md text-indigo-900 shadow-sm border-b-2 border-indigo-200/50 transition-colors duration-500"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-3xl bg-white flex items-center justify-center text-indigo-600 font-black text-xs shadow-xl border-2 border-indigo-100">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-sm font-black text-slate-900 tracking-tight">
                      {selectedRole?.name}
                    </h2>
                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest opacity-70 flex items-center gap-2">
                      <Layers className="w-3 h-3" />{" "}
                      {departments.find(
                        (d) => d.id === selectedRole?.department,
                      )?.name || "CROSS-DEPARTMENT SCOPE"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 px-4 rounded-xl gap-2 border-indigo-200 bg-white hover:bg-indigo-600 hover:text-white transition-all font-black text-[10px] tracking-widest opacity-90"
                    onClick={openPermissionEditor}
                  >
                    <ShieldAlert className="w-4 h-4" /> CONFIGURE PRIVILEGES
                  </Button>
                  <div className="w-[1px] h-6 bg-indigo-200/50 mx-2" />
                  <Button
                    variant="ghost"
                    className="h-11 w-11 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-2xl transition-all"
                    onClick={() => setSelectedRowId(null)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table Content */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {isLoading ? (
            <FleetTableSkeleton rows={12} cols={6} />
          ) : (
            <EditableTable
              hideHeader={true}
              multiSelect={false}
              data={mappedRoles}
              columns={columns}
              virtualColumns={virtualColumns}
              onSelectionChange={(ids) =>
                setSelectedRowId(ids[ids.length - 1] || null)
              }
              selectedRowId={selectedRowId}
              searchQuery={searchTerm}
              onSearchQueryChange={setSearchTerm}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onColumnAdd={handleColumnAdd}
              onColumnUpdate={handleColumnUpdate}
              onColumnDelete={handleColumnDelete}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 bg-slate-50/50 border-t border-slate-200/50 flex items-center justify-between select-none">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 group cursor-help">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)] animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Auth Protocol Active
              </span>
            </div>
            <div className="flex items-center gap-2 group cursor-help">
              <Settings2 className="w-3 h-3 text-slate-400 group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Entity: SYSTEM_ROLES
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-100/50 px-3 py-1 rounded-full border border-slate-200/50">
              RBAC_V2 COMPLIANT
            </span>
          </div>
        </div>
      </div>

      <Sheet open={isPermSheetOpen} onOpenChange={setIsPermSheetOpen}>
        <PrivilegeMatrix
          selectedRoleName={selectedRole?.name}
          allowedModules={allowedModules}
          actions={ACTIONS}
          tempPermissions={tempPermissions}
          togglePermission={togglePermission}
          onSave={handlePermissionSave}
          onClose={() => setIsPermSheetOpen(false)}
          isLoading={updatePerms.isPending}
        />
      </Sheet>
    </div>
  );
}
