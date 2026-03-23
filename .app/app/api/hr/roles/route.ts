import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

// GET: Fetch all roles
export async function GET(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const { data, error } = await supabase
      .from("roles")
      .select(
        `
        *,
        permissions:role_permissions(*)
      `,
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("[Roles API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new role
export async function POST(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const body = await req.json();
    if (!body.name)
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("roles")
      .insert({
        ...body,
        company_id: companyId,
        id: undefined,
        permissions: undefined,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Roles API] POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update a role
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
      .from("roles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        permissions: undefined,
      })
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Roles API] PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Soft delete a role
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
      .from("roles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Roles API] DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
