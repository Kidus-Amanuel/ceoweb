import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, planId } = body;

    // 1. Verify user is owner or super_admin for this company
    const { data: company } = await supabase
      .from("companies")
      .select("owner_id, plan_id")
      .eq("id", companyId)
      .single();

    if (!company) {
      return NextResponse.json(
        { error: " Company not found" },
        { status: 404 },
      );
    }

    // (Simplified check for MVP: just ensure it's the owner)
    if (company.owner_id !== user.id) {
      // Check if they are super_admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();

      if (profile?.user_type !== "super_admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // 2. Fetch the new plan's modules
    const { data: newPlan } = await supabase
      .from("plans")
      .select("modules, name")
      .eq("id", planId)
      .single();

    if (!newPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 400 });
    }

    // 3. Update the company's plan
    const { error: updateError } = await supabase
      .from("companies")
      .update({ plan_id: planId, status: "active" })
      .eq("id", companyId);

    if (updateError) throw updateError;

    // 4. Seed new departments for the unlocked modules
    const allowedModules: string[] = newPlan.modules || [];

    // Fetch display names for all modules in the new plan
    const { data: dbModules } = await supabase
      .from("modules")
      .select("name, display_name")
      .in("name", allowedModules);

    if (dbModules && dbModules.length > 0) {
      // Create missing departments
      // Logic: For each module, check if department already exists by name
      const { data: existingDepts } = await supabase
        .from("departments")
        .select("name")
        .eq("company_id", companyId);

      const existingDeptNames = existingDepts?.map((d) => d.name) || [];

      const newDeptRecords = dbModules
        .filter((m) => !existingDeptNames.includes(m.display_name))
        .map((m) => ({
          company_id: companyId,
          name: m.display_name,
        }));

      if (newDeptRecords.length > 0) {
        await supabase.from("departments").insert(newDeptRecords);
      }
    }

    return NextResponse.json({ success: true, plan: newPlan.name });
  } catch (error: any) {
    console.error("Upgrade error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
