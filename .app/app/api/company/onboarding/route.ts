import { createClient, createAdminClient } from "@/lib/supabase/server";
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
        slug: slug,
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
    // We keep super_admin status for direct signups
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = profile?.user_type === "super_admin";

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        onboarding: true,
        // Only set company_id for regular users. Super admins stay NULL in profiles
        ...(isSuperAdmin
          ? {}
          : { company_id: company.id, user_type: "company_user" }),
      })
      .eq("id", user.id);

    if (profileError) throw profileError;

    // 4. Link User to Company in company_users
    let gmRoleId = gmRecord?.id;
    if (!gmRoleId) {
      const { data: gmRole } = await supabase
        .from("roles")
        .select("id")
        .eq("company_id", company.id)
        .eq("name", "General Manager")
        .single();
      gmRoleId = gmRole?.id;
    }

    if (gmRoleId) {
      await supabase.from("company_users").insert({
        user_id: user.id,
        company_id: company.id,
        role_id: gmRoleId,
        status: "active",
        position: isSuperAdmin ? "Owner" : "Founder/CEO",
      });
    }

    // 5. Update Company counts/size if provided
    if (companySize) {
      await supabase
        .from("companies")
        .update({ status: "active" })
        .eq("id", company.id);
    }

    // 6. Sync Metadata to Supabase Auth
    const supabaseAdmin = await createAdminClient();

    // Get existing companyIds array or initialize it
    const existingCompanyIds = Array.isArray(user.user_metadata?.companyIds)
      ? user.user_metadata.companyIds
      : user.user_metadata?.companyId
        ? [user.user_metadata.companyId]
        : [];

    // Check if new company.id is already in the array
    const updatedCompanyIds = Array.from(
      new Set([...existingCompanyIds, company.id]),
    );

    const { error: metadataError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          userType: isSuperAdmin ? "super_admin" : "company_user",
          companyId: company.id, // Set as current active company
          companyIds: updatedCompanyIds, // Array of all companies
          roleId: gmRoleId,
          onboardingCompleted: true,
        },
      });

    if (metadataError) {
      console.error("Failed to sync onboarding metadata:", metadataError);
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
