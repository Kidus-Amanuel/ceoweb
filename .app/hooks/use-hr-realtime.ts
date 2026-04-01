import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { hrKeys } from "../utils/hr-constants";

export type HRTables = 
  | "employees" 
  | "departments" 
  | "leaves" 
  | "positions" 
  | "attendance" 
  | "leave_types" 
  | "payroll_runs";

export function useHRRealtime(companyId: string | undefined, tablesToWatch: HRTables[] = []) {
  const qc = useQueryClient();
  const tablesKey = tablesToWatch.join(",");

  useEffect(() => {
    if (!companyId || !tablesKey) return;

    const watchedTables = tablesKey.split(",") as HRTables[];
    const supabase = createClient();

    const channel = supabase
      .channel(`hr-master-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const table = payload.table as HRTables;
          
          if (watchedTables.includes(table)) {
            switch (table) {
              case "employees":
                qc.invalidateQueries({ queryKey: hrKeys.employees(companyId) });
                break;
              case "departments":
                qc.invalidateQueries({ queryKey: hrKeys.departments(companyId) });
                break;
              case "positions":
                qc.invalidateQueries({ queryKey: hrKeys.positions(companyId) });
                break;
              case "attendance":
                qc.invalidateQueries({ queryKey: hrKeys.attendance(companyId) });
                break;
              case "leaves":
                qc.invalidateQueries({ queryKey: hrKeys.leaves(companyId) });
                break;
              case "leave_types":
                qc.invalidateQueries({ queryKey: hrKeys.leaveTypes(companyId) });
                break;
              case "payroll_runs":
                qc.invalidateQueries({ queryKey: hrKeys.payrollRuns(companyId) });
                break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, tablesKey, qc]);
}
