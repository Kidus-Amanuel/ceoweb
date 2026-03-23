import { NextResponse } from "next/server";
import { getFleetAuthContext } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

// GET: Fetch all positions
export async function GET(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const { data, error } = await supabase
      .from("positions")
      .select(
        `
        *,
        department:departments (id, name)
      `,
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("title", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("[Positions API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new position
export async function POST(req: Request) {
  try {
    const auth = await getFleetAuthContext();
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, companyId } = auth;

    const body = await req.json();
    if (!body.title)
      return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("positions")
      .insert({
        ...body,
        company_id: companyId,
        id: undefined,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Positions API] POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update a position
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
      .from("positions")
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
    console.error("[Positions API] PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Soft delete a position
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
      .from("positions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Positions API] DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
