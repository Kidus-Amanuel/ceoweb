import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";
import { HREmployeeService } from "../../../../services/hr.employee.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const result = await HREmployeeService.getEmployee({
        supabase,
        companyId,
        id,
      });
      if (result.error) throw new Error(result.error);
      return NextResponse.json(result.data);
    }

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    const result = await HREmployeeService.listEmployees({
      supabase,
      companyId,
      page,
      pageSize,
      search,
      status,
    });

    if (result.error) throw new Error(result.error);
    return NextResponse.json(result.data);
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
    
    // Pass everything correctly formatted to HREmployeeService
    const result = await HREmployeeService.createEmployee({
      supabase,
      payload: { ...body, companyId },
    });

    if (result.error) {
      // Typically Zod errors are 400
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
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

    const result = await HREmployeeService.updateEmployee({
      supabase,
      payload: { ...body, companyId },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await HREmployeeService.deleteEmployee({
      supabase,
      companyId,
      id
    });

    if (result.error) throw new Error(result.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
