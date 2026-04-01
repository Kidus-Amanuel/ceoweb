import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

/**
 * POST: Generate payslips for a payroll run
 * Logic:
 * 1. Identify the payroll run and its period (Start/End date).
 * 2. Fetch all active employees.
 * 3. For each employee, calculate pay based on:
 *    - basic_salary (monthly)
 *    - attendance (total hours worked in period if hourly_rate exists)
 * 4. Bulk insert payslips.
 * 5. Update payroll_run with total cost and status 'processing'.
 */
export async function POST(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("run_id");

    if (!runId)
      return NextResponse.json({ error: "Run ID is required" }, { status: 400 });

    // 1. Fetch the Run
    const { data: run, error: runError } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", runId)
      .eq("company_id", companyId)
      .single();

    if (runError || !run) throw new Error("Payroll run not found.");

    // 2. Fetch Active Employees
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "active")
      .is("deleted_at", null);

    if (empError) throw empError;

    // 3. For each employee, calculate and prepare payslip
    const payslipPromises = employees.map(async (emp) => {
      // Calculate total hours from attendance for this period
      const { data: attendance } = await supabase
        .from("attendance")
        .select("hours_worked")
        .eq("employee_id", emp.id)
        .gte("date", run.period_start)
        .lte("date", run.period_end)
        .is("deleted_at", null);

      const totalHours = (attendance || []).reduce(
        (sum, a) => sum + (Number(a.hours_worked) || 0),
        0
      );

      // Simple Logic:
      // If hourly_rate exists, pay = rate * hours
      // Else pay = basic_salary (assumed monthly)
      let pay = Number(emp.basic_salary) || 0;
      if (emp.hourly_rate && Number(emp.hourly_rate) > 0) {
        pay = Number(emp.hourly_rate) * totalHours;
      }

      return {
        company_id: companyId,
        payroll_run_id: runId,
        employee_id: emp.id,
        basic_pay: pay,
        total_allowances: 0,
        total_deductions: 0,
        net_pay: pay,
        status: "draft",
        breakdown: {
          calculated_hours: totalHours,
          hourly_rate: emp.hourly_rate || 0,
          monthly_base: emp.basic_salary || 0,
          period: `${run.period_start} to ${run.period_end}`
        }
      };
    });

    const payslipsToInsert = await Promise.all(payslipPromises);

    // 4. Clear existing slips for this run to avoid duplicates
    await supabase
      .from("payslips")
      .delete()
      .eq("payroll_run_id", runId)
      .eq("company_id", companyId);

    // 5. Bulk Insert
    const { error: insertError } = await supabase
      .from("payslips")
      .insert(payslipsToInsert);

    if (insertError) throw insertError;

    // 6. Update Run Status and Total Cost
    const totalCost = payslipsToInsert.reduce((sum, p) => sum + p.net_pay, 0);
    const { data: updatedRun, error: updateError } = await supabase
      .from("payroll_runs")
      .update({
        status: "processing",
        total_cost: totalCost,
        updated_at: new Date().toISOString()
      })
      .eq("id", runId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 7. Success Notification
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("notifications").insert({
          company_id: companyId,
          actor_id: user.id,
          category: "hr",
          scope: "company",
          title: "Payroll Batch Processed",
          content: `Generated ${payslipsToInsert.length} payslips for period ${run.period_start}. Total cost: $${totalCost.toLocaleString()}.`,
          metadata: { payroll_run_id: runId, type: "payroll_generated" }
        });
      }
    } catch (e) {
      console.warn("Notification failed:", e);
    }

    return NextResponse.json({ success: true, count: payslipsToInsert.length, totalCost });
  } catch (error: any) {
    console.error("[Payroll Generate API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
