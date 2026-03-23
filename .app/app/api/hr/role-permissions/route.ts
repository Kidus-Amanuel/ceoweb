import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

// GET: Fetch all permissions for a role
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("role_id");
    if (!roleId)
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 },
      );

    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase } = auth;

    const { data, error } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", roleId);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("[Role Permissions API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Sync permissions for a role (Replace all)
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("role_id");
    if (!roleId)
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 },
      );

    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase } = auth;

    const body = await req.json();
    const { permissions = [] } = body;

    // 1. Delete existing permissions
    const { error: delErr } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    if (delErr) throw delErr;

    // 2. Insert new ones
    if (permissions.length > 0) {
      const { error: insErr } = await supabase.from("role_permissions").insert(
        permissions.map((p: any) => ({
          role_id: roleId,
          module: p.module,
          action: p.action,
        })),
      );

      if (insErr) throw insErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Role Permissions API] POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
