"use client";

import { Save, ShieldAlert, Layers } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/shared/ui/sheet/Sheet";

interface PrivilegeMatrixProps {
  selectedRoleName?: string;
  allowedModules: Array<{ id: string; name: string }>;
  actions: string[];
  tempPermissions: any[];
  togglePermission: (module: string, action: string) => void;
  onSave: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function PrivilegeMatrix({
  selectedRoleName,
  allowedModules,
  actions,
  tempPermissions,
  togglePermission,
  onSave,
  onClose,
  isLoading,
}: PrivilegeMatrixProps) {
  return (
    <SheetContent
      side="right"
      className="w-full sm:max-w-xl p-0 border-l border-indigo-100 bg-white/95 backdrop-blur-2xl flex flex-col h-screen overflow-hidden"
    >
      <SheetHeader className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <SheetTitle className="text-xl font-black text-slate-900 tracking-tight">
              Privilege Matrix
            </SheetTitle>
            <SheetDescription className="text-xs font-medium text-slate-500">
              Configure granular access for{" "}
              <span className="text-indigo-600 font-bold">
                {selectedRoleName || "Operational Role"}
              </span>
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 w-full overflow-y-auto custom-scrollbar bg-white">
        <div className="px-8 py-8 space-y-10">
          {allowedModules.map((mod) => (
            <div key={mod.id} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Layers className="w-3 h-3 text-indigo-500" /> {mod.name}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[8px] bg-slate-50 text-slate-400 border-none px-0"
                >
                  ENTITY_SCOPE
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {actions.map((act) => {
                  const isChecked = !!tempPermissions.find(
                    (p) => p.module === mod.id && p.action === act,
                  );
                  return (
                    <div
                      key={`${mod.id}-${act}`}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer group ${
                        isChecked
                          ? "bg-indigo-50/50 border-indigo-200"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                      onClick={() => togglePermission(mod.id, act)}
                    >
                      <Checkbox
                        id={`${mod.id}-${act}`}
                        checked={isChecked}
                        onCheckedChange={() => togglePermission(mod.id, act)}
                        className="border-indigo-200 data-[state=checked]:bg-indigo-600"
                      />
                      <label
                        className={`text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                          isChecked
                            ? "text-indigo-700"
                            : "text-slate-500 group-hover:text-slate-900"
                        }`}
                      >
                        {act}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Add padding at the bottom of the scroll area to prevent overlap with footer shadows if any */}
          <div className="h-4" />
        </div>
      </div>

      <SheetFooter className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex-shrink-0 z-10">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              MODS: {tempPermissions.length} SELECTED
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="rounded-xl px-6 text-[10px] font-black uppercase tracking-widest"
              onClick={onClose}
            >
              ABORT
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 gap-2 font-black text-[10px] tracking-widest shadow-xl shadow-indigo-600/20"
              onClick={onSave}
              loading={isLoading}
            >
              <Save className="w-4 h-4" /> SYNC PRIVILEGES
            </Button>
          </div>
        </div>
      </SheetFooter>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </SheetContent>
  );
}
