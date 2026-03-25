import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const id = searchParams.get("id");

    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    if (id) {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          department:departments (id, name),
          position:positions (id, title),
          leaves:leaves (id, start_date, end_date, status, reason, leave_type:leave_types(id, name)),
          documents:employee_documents (*)
        `,
        )
        .eq("id", id)
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("employees")
      .select(
        `
        *,
        department:departments (id, name),
        position:positions (id, title),
        leaves:leaves (id, start_date, end_date, status, leave_type_id)
      `,
        { count: "exact" },
      )
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`,
      );
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("first_name", { ascending: true })
      .range(from, to);

    if (error) throw error;

    // Derived flags for UI
    const enrichedData = (data || []).map((emp) => {
      const activeLeave = emp.leaves?.find(
        (l: any) =>
          l.status === "approved" &&
          l.start_date <= today &&
          l.end_date >= today,
      );

      return {
        ...emp,
        on_active_leave: !!activeLeave,
        current_leave: activeLeave || null,
      };
    });

    return NextResponse.json({
      data: enrichedData,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("[Employees API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const body = await req.json();
    const { data, error } = await supabase
      .from("employees")
      .insert({ ...body, company_id: companyId })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const body = await req.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from("employees")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const { error } = await supabase
      .from("employees")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
