import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

// GET: Fetch attendance records
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const employeeId = searchParams.get("employee_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    let query = supabase
      .from("attendance")
      .select(
        `
        *,
        employee:employees (id, first_name, last_name, employee_code)
      `,
        { count: "exact" },
      )
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (employeeId) query = query.eq("employee_id", employeeId);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("date", { ascending: false })
      .order("check_in", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("[Attendance API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create/Clock-in
export async function POST(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const body = await req.json();

    // If no check_in is provided, assume it's a "Now" clock-in
    const payload = {
      ...body,
      company_id: companyId,
      date: body.date || new Date().toISOString().split("T")[0],
      check_in:
        body.check_in || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("attendance")
      .insert(payload)
      .select(`
        *,
        employee:employees (first_name, last_name)
      `)
      .single();

    if (error) throw error;

    // 1. Manual Notification for Attendance Check-in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data.employee) {
        await supabase.from("notifications").insert({
          company_id: companyId,
          actor_id: user.id,
          category: "hr",
          scope: "company",
          title: "Attendance Logged",
          content: `${data.employee.first_name} ${data.employee.last_name} check-in logged at ${new Date(data.check_in).toLocaleTimeString()}.`,
          metadata: { attendance_id: data.id, type: "attendance_entry" }
        });
      }
    } catch (e) {
      console.warn("[Attendance API] Notification fallback failed:", e);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Attendance API] POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update/Clock-out
export async function PATCH(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id)
      return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("attendance")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", companyId)
      .select(`
        *,
        employee:employees (first_name, last_name)
      `)
      .single();

    if (error) throw error;

    // 2. Manual Notification for Attendance Activity
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data.employee) {
        let action = "Activity Updated";
        if (body.check_out && !updates.check_out) action = "Check-out Logged";

        await supabase.from("notifications").insert({
          company_id: companyId,
          actor_id: user.id,
          category: "hr",
          scope: "company",
          title: "Attendance " + action,
          content: `Attendance record updated for ${data.employee.first_name} ${data.employee.last_name}.`,
          metadata: { attendance_id: data.id, type: "attendance_update" }
        });
      }
    } catch (e) {
      console.warn("[Attendance API] Notification fallback failed:", e);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Attendance API] PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Soft delete
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const { data: attData } = await supabase.from('attendance').select('*, employee:employees(first_name, last_name)').eq('id', id).single();

    const { error } = await supabase
      .from("attendance")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;

    // 3. Manual Notification for Attendance Purge
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && attData?.employee) {
        await supabase.from("notifications").insert({
          company_id: companyId,
          actor_id: user.id,
          category: "hr",
          scope: "company",
          title: "Attendance Record Purged",
          content: `Log record for ${attData.employee.first_name} ${attData.employee.last_name} on ${new Date(attData.date).toLocaleDateString()} was removed.`,
          metadata: { type: "attendance_deleted" }
        });
      }
    } catch (e) {
      console.warn("[Attendance API] Notification fallback failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
