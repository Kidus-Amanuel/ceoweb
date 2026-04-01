import { Settings2 } from "lucide-react";
import { Badge } from "@/components/shared/ui/badge/Badge";

export function EmployeesFooter({ entityType }: { entityType: string }) {
  return (
    <div className="px-6 py-2.5 bg-slate-50/50 border-t border-slate-200/50 flex items-center justify-between select-none shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 group cursor-help">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            System Active
          </span>
        </div>
        <div className="flex items-center gap-2 group cursor-help">
          <Settings2 className="w-3 h-3 text-slate-400 group-hover:rotate-90 transition-transform duration-500" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Metadata Entity: {entityType.toUpperCase()}
          </span>
        </div>
      </div>
      <Badge
        variant="outline"
        className="text-[8px] font-black text-slate-300 border-slate-200 uppercase tracking-widest italic px-3 py-0.5 rounded-full"
      >
        CEO-ERP Interlink v4.0.2 / SECURE
      </Badge>
    </div>
  );
}
