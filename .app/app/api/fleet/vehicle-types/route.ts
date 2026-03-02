import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Company not found" }, { status: 403 });
    }

    const { data: types, error } = await supabase
      .from("vehicle_types")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(types || []);
  } catch (error: any) {
    console.error("[Vehicle Types API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
