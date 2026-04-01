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
  | "payroll_runs"
  | "payslips";

export function useHRRealtime(companyId: string | undefined, tablesToWatch: HRTables[] = []) {
  const qc = useQueryClient();
  const tablesKey = tablesToWatch.join(",");

  useEffect(() => {
    if (!companyId || !tablesKey) return;

    const watchedTables = tablesKey.split(",") as HRTables[];
    const supabase = createClient();

    let channel = supabase.channel(`hr-master-${companyId}-${tablesKey}`);

    // Subscribe to EACH table individually with the company filter
    watchedTables.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          // Trigger a query invalidation for the specific entity
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
            case "payslips":
              qc.invalidateQueries({ queryKey: ["payslips", companyId] });
              break;
          }
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, tablesKey, qc]);
}
