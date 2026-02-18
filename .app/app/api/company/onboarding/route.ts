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

    // 1. Get the Starter Plan ID
    const { data: starterPlan } = await supabase
      .from("plans")
      .select("id")
      .eq("name", "Starter")
      .single();

    // 2. Create Company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        slug: slug,
        owner_id: user.id,
        plan_id: starterPlan?.id,
        status: "active",
      })
      .select()
      .single();

    if (companyError) throw companyError;

    // 3. Fetch Modules allowed by the Plan (Starter)
    const { data: starterPlanData } = await supabase
      .from("plans")
      .select("modules")
      .eq("name", "Starter")
      .single();

    const allowedModules: string[] = starterPlanData?.modules || ["hr", "crm"];

    // Fetch Display Names for these modules
    const { data: dbModules } = await supabase
      .from("modules")
      .select("name, display_name")
      .in("name", allowedModules);

    const availableModules = dbModules || [
      { name: "hr", display_name: "Human Resources" },
      { name: "crm", display_name: "CRM" },
    ];

    // 3. Seed Default Departments, Positions, and Roles for the Company

    // 3a. Create Departments
    const departmentRecords = availableModules.map((m: any) => ({
      company_id: company.id,
      name: m.display_name,
    }));

    const { data: dbDepartments, error: deptError } = await supabase
      .from("departments")
      .insert(departmentRecords)
      .select();

    if (deptError) throw deptError;

    // 3b. Create Positions
    const positionRecords: any[] = [
      {
        company_id: company.id,
        title: "General Manager",
        department_id: null,
      },
    ];

    availableModules.forEach((m: any) => {
      const dept = dbDepartments?.find((d) => d.name === m.display_name);
      positionRecords.push({
        company_id: company.id,
        title: `${m.display_name} Manager`,
        department_id: dept?.id || null,
      });
    });

    const { data: dbPositions, error: posError } = await supabase
      .from("positions")
      .insert(positionRecords)
      .select();

    if (posError) throw posError;

    // 3c. Create Roles linked to Departments
    const defaultRoles: any[] = [
      {
        company_id: company.id,
        name: "General Manager",
        description: "Manages overall company operations",
        department: null,
      },
    ];

    availableModules.forEach((m: any) => {
      const roleName = `${m.display_name} Manager`;
      defaultRoles.push({
        company_id: company.id,
        name: roleName,
        description: `Manages ${m.display_name} module`,
        department: m.name, // Use internal code (e.g., "hr")
      });
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

      availableModules.forEach((m: any) => {
        actions.forEach((action) => {
          permissions.push({
            role_id: gmRecord.id,
            module: m.name, // Use internal code
            action: action,
          });
        });
      });

      await supabase.from("role_permissions").insert(permissions);
    }

    // 3c. Assign Module-Specific Permissions for Managers
    for (const role of roleRecords || []) {
      if (role.department && role.name !== "General Manager") {
        await supabase.from("role_permissions").insert({
          role_id: role.id,
          module: role.department, // This is now m.name
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

    // 7. Create Employee Record for the Owner
    const { data: finalProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const fullName =
      finalProfile?.full_name || user.user_metadata?.full_name || "";
    const firstName = fullName.split(" ")[0] || "";
    const lastName = fullName.split(" ").slice(1).join(" ") || "";

    const { error: employeeError } = await supabase.from("employees").insert({
      company_id: company.id,
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: user.email,
      employee_code: `OWN-${user.id.substring(0, 8)}`,
      status: "active",
      hire_date: new Date().toISOString().split("T")[0],
      position_id: gmRecord?.id
        ? dbPositions?.find((p) => p.title === "General Manager")?.id
        : null,
    });

    if (employeeError) {
      console.warn("Could not create owner employee record:", employeeError);
    }

    // 8. Return success
    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
