import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user company
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id)
      return NextResponse.json({ error: "Company not found" }, { status: 403 });

    // Fetch employees for this company
    // Note: employees table uses first_name + last_name (no single 'name' column)
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, job_title, status")
      .eq("company_id", profile.company_id)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("first_name", { ascending: true });

    if (error) throw error;

    // Shape: add a computed 'name' field for dropdown compatibility
    const shaped = (data || []).map((e: any) => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`.trim(),
      first_name: e.first_name,
      last_name: e.last_name,
      email: e.email || "",
      job_title: e.job_title || "",
      status: e.status,
    }));

    return NextResponse.json(shaped);
  } catch (error: any) {
    console.error("[Employees API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
