import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Test profiles table existence and schema
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Check table info from information_schema
    // Note: This might require higher privileges, but worth a try
    // Just checking if we can select from it implies it exists

    if (countError) {
      return NextResponse.json(
        { message: "Profiles Table Access Failed", error: countError },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "DB Check Passed",
        profiles_count: count,
        note: "Table exists and is accessible.",
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: "Unexpected Error", error: err.message },
      { status: 500 },
    );
  }
}
