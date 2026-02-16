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

    // 2. Fetch Active Modules for seeding permissions
    const { data: dbModules } = await supabase
      .from("modules")
      .select("name, display_name")
      .eq("is_active", true);

    const availableModules = dbModules?.map((m) => m.name) || [
      "crm",
      "hr",
      "fleet",
      "inventory",
      "finance",
    ];

    // 3. Seed Default Roles for the Company
    const defaultRoles: any[] = [
      {
        company_id: company.id,
        name: "General Manager",
        description: "Manages overall company operations",
        department: null,
      },
      {
        company_id: company.id,
        name: "Sales Executive",
        description: "CRM sales team",
        department: "crm",
      },
    ];

    // Add Manager roles for each module
    availableModules.forEach((moduleName) => {
      const displayName =
        dbModules?.find((m) => m.name === moduleName)?.display_name ||
        moduleName.charAt(0) + moduleName.slice(1);

      const roleName = `${displayName} Manager`;

      // Check if already added (like CRM Manager vs Sales Executive)
      if (!defaultRoles.find((r) => r.name === roleName)) {
        defaultRoles.push({
          company_id: company.id,
          name: roleName,
          description: `Manages ${displayName} module`,
          department: moduleName,
        });
      }
    });

    const { data: roleRecords, error: rolesError } = await supabase
      .from("roles")
      .insert(defaultRoles)
      .select();

    if (rolesError) throw rolesError;

    // 3b. Assign Permissions to GM Role (Full Global Access)
    const gmRecord = roleRecords?.find((r) => r.name === "General Manager");
    if (gmRecord) {
      const actions = ["view", "create", "edit", "delete", "export", "approve"];
      const permissions: any[] = [];

      availableModules.forEach((moduleName) => {
        actions.forEach((action) => {
          permissions.push({
            role_id: gmRecord.id,
            module: moduleName,
            action: action,
          });
        });
      });

      await supabase.from("role_permissions").insert(permissions);
    }

    // 3c. Assign Module-Specific Permissions
    for (const role of roleRecords || []) {
      if (role.department && role.name !== "General Manager") {
        await supabase.from("role_permissions").insert({
          role_id: role.id,
          module: role.department,
          action: "view",
        });
      }
    }

    // 3. Update User Profile
    // We update company_id even for super_admin to provide context for get_user_company_id()
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
        company_id: company.id,
        user_type: isSuperAdmin ? "super_admin" : "company_user",
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      throw profileError;
    }

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
      const { error: linkError } = await supabase.from("company_users").insert({
        user_id: user.id,
        company_id: company.id,
        role_id: gmRoleId,
        status: "active",
        position: isSuperAdmin ? "Owner" : "Founder/CEO",
      });

      if (linkError) {
        console.error("Failed to link user to company:", linkError);
        throw linkError;
      }
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
          user_type: isSuperAdmin ? "super_admin" : "company_user",
          company_id: company.id,
          company_ids: updatedCompanyIds,
          role_id: gmRoleId,
          onboarding_completed: true,
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
