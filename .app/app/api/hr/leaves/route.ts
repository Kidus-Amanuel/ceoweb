import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

// GET: Fetch all leave requests
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const employeeId = searchParams.get("employee_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    let query = supabase
      .from("leaves")
      .select(
        `
        *,
        employee:employees!inner (id, first_name, last_name, employee_code),
        leave_type:leave_types (id, name)
      `,
        { count: "exact" },
      )
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (employeeId) query = query.eq("employee_id", employeeId);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_code.ilike.%${search}%`,
        { foreignTable: "employee" },
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("start_date", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("[Leaves API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Submit a leave request
export async function POST(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const body = await req.json();

    // Overlapping leave validation
    if (body.employee_id && body.start_date && body.end_date) {
      const { data: overlaps, error: overlapError } = await supabase
        .from("leaves")
        .select("id")
        .eq("company_id", companyId)
        .eq("employee_id", body.employee_id)
        .is("deleted_at", null)
        .neq("status", "rejected")
        .neq("status", "cancelled")
        .lte("start_date", body.end_date)
        .gte("end_date", body.start_date);

      if (overlapError) throw overlapError;
      if (overlaps && overlaps.length > 0) {
        return NextResponse.json(
          {
            error: "Employee already has a leave overlapping with these dates.",
          },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabase
      .from("leaves")
      .insert({
        ...body,
        company_id: companyId,
        status: body.status || "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Leaves API] POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Approve/Reject or Edit leave
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

    // Validate overlaps if dates or employee change
    if (updates.employee_id || updates.start_date || updates.end_date) {
      // We need the full record to validate overlaps if partial dates provided
      const { data: existingLeave } = await supabase
        .from("leaves")
        .select("employee_id, start_date, end_date")
        .eq("id", id)
        .single();

      if (existingLeave) {
        const checkEmployeeId =
          updates.employee_id || existingLeave.employee_id;
        const checkStartDate = updates.start_date || existingLeave.start_date;
        const checkEndDate = updates.end_date || existingLeave.end_date;

        const { data: overlaps, error: overlapError } = await supabase
          .from("leaves")
          .select("id")
          .eq("company_id", companyId)
          .eq("employee_id", checkEmployeeId)
          .neq("id", id) // Exclude current leave
          .is("deleted_at", null)
          .neq("status", "rejected")
          .neq("status", "cancelled")
          .lte("start_date", checkEndDate)
          .gte("end_date", checkStartDate);

        if (overlapError) throw overlapError;
        if (overlaps && overlaps.length > 0) {
          return NextResponse.json(
            {
              error:
                "Employee already has a leave overlapping with these dates.",
            },
            { status: 400 },
          );
        }
      }
    }

    const { data, error } = await supabase
      .from("leaves")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Leaves API] PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Cancel/Delete leave request
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

    const { error } = await supabase
      .from("leaves")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Leaves API] DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
