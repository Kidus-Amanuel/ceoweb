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
    const { companyName, industry, companySize, slug } = body;

    // 1. Create Company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        slug: slug, // simplified slug generation
        owner_id: user.id,
        status: "active",
      })
      .select()
      .single();

    if (companyError) throw companyError;

    // 2. Seed Default Roles for the Company
    const defaultRoles = [
      {
        company_id: company.id,
        name: "General Manager",
        description: "Manages overall company operations",
      },
      {
        company_id: company.id,
        name: "HR Manager",
        description: "Manages HR department",
      },
      {
        company_id: company.id,
        name: "CRM Manager",
        description: "Manages CRM module",
      },
      {
        company_id: company.id,
        name: "Sales Executive",
        description: "CRM sales team",
      },
    ];

    const { data: roleRecords, error: rolesError } = await supabase
      .from("roles")
      .insert(defaultRoles)
      .select();

    if (rolesError) throw rolesError;

    // 2b. Assign Permissions to GM Role
    const gmRecord = roleRecords?.find((r) => r.name === "General Manager");
    if (gmRecord) {
      const modules = ["crm", "hr", "fleet", "inventory", "finance"];
      const permissions = modules.map((m) => ({
        role_id: gmRecord.id,
        module: m,
        action: "view",
      }));
      await supabase.from("role_permissions").insert(permissions);
    }

    // 3. Update User Profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        company_id: company.id,
        onboarding: true,
        // user_type is handled by handle_new_user trigger on signup
        // and should remain super_admin for direct signups
      })
      .eq("id", user.id);

    if (profileError) throw profileError;

    // 4. Link User to Company in company_users
    const { data: gmRole } = await supabase
      .from("roles")
      .select("id")
      .eq("company_id", company.id)
      .eq("name", "General Manager")
      .single();

    if (gmRole) {
      await supabase.from("company_users").insert({
        user_id: user.id,
        company_id: company.id,
        role_id: gmRole.id,
        status: "active",
        position: "Founder/CEO",
      });
    }

    // 5. Update Company counts/size if provided
    if (body.companySize) {
      await supabase
        .from("companies")
        .update({ companysize: { size: body.companySize } })
        .eq("id", company.id);
    }

    // Return success
    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
