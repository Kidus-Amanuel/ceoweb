import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

// GET: Fetch individual payslips (optionally filter by payroll_run_id)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("payroll_run_id");

    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    let query = supabase
      .from("payslips")
      .select(
        `
        *,
        employee:employees (id, first_name, last_name, employee_code),
        run:payroll_runs (id, status, period_start, period_end)
      `,
      )
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (runId) query = query.eq("payroll_run_id", runId);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("[Payslips API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a payslip manually or as part of batch
export async function POST(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const body = await req.json();
    const { data, error } = await supabase
      .from("payslips")
      .insert({ ...body, company_id: companyId })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Payslips API] POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update specific payslip fields
export async function PATCH(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const body = await req.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from("payslips")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Payslips API] PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
