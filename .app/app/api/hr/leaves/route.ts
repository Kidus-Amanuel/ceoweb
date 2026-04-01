import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";
import { HRLeaveService } from "../../../../services/hr.leave.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const employeeId = searchParams.get("employee_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const result = await HRLeaveService.listLeaves({
      supabase,
      companyId,
      page,
      pageSize,
      employeeId,
      status,
      search,
    });

    if (result.error) throw new Error(result.error);
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("[Leaves API] GET Error:", error);
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

    // Mapping total_days to days_taken for backward compatibility
    if (body.total_days && !body.days_taken) {
      body.days_taken = body.total_days;
      delete body.total_days;
    }

    const result = await HRLeaveService.createLeave({
      supabase,
      payload: { ...body, companyId },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("[Leaves API] POST Error:", error);
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

    // Mapping total_days to days_taken for backward compatibility
    if (body.total_days && !body.days_taken) {
      body.days_taken = body.total_days;
      delete body.total_days;
    }

    const result = await HRLeaveService.updateLeave({
      supabase,
      payload: { ...body, companyId },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("[Leaves API] PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const result = await HRLeaveService.deleteLeave({
      supabase,
      companyId,
      id
    });

    if (result.error) throw new Error(result.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Leaves API] DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
