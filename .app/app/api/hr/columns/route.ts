import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";
import { HRService } from "@/services/hr.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity");

    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    if (!entity)
      return NextResponse.json(
        { error: "Entity is required" },
        { status: 400 },
      );

    const response = await HRService.getColumnDefinitions({
      supabase,
      companyId,
      entityType: entity as any,
    });

    if (response.error) throw new Error(response.error);
    return NextResponse.json(response.data || []);
  } catch (error: any) {
    console.error("[HR Columns API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
