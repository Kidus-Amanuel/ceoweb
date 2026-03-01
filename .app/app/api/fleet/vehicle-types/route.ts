import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: types, error } = await supabase
      .from("vehicle_types")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(types || []);
  } catch (error: any) {
    console.error("[Vehicle Types API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
