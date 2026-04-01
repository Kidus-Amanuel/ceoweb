import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";
import { HRPositionService } from "../../../../services/hr.position.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const result = await HRPositionService.listPositions({
      supabase,
      companyId,
    });

    if (result.error) throw new Error(result.error);
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("[Positions API] GET Error:", error);
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

    const result = await HRPositionService.createPosition({
      supabase,
      payload: { ...body, companyId },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("[Positions API] POST Error:", error);
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

    const result = await HRPositionService.updatePosition({
      supabase,
      payload: { ...body, companyId },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error("[Positions API] PATCH Error:", error);
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

    const result = await HRPositionService.deletePosition({
      supabase,
      companyId,
      id
    });

    if (result.error) throw new Error(result.error);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Positions API] DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
