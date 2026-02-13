import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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

    // Role check: Only Admins/Owners
    const { data: roleInfo, error: roleRpcError } =
      await supabase.rpc("get_user_role_info");

    if (roleRpcError) {
      console.error("RPC get_user_role_info failed:", roleRpcError);
      return NextResponse.json(
        { error: "Failed to fetch user permissions", details: roleRpcError },
        { status: 500 },
      );
    }

    const isSuperAdmin = roleInfo?.user_type === "super_admin";
    const { email, role: roleName } = await request.json();
    const companyId = roleInfo?.company_id;

    console.log("Invitation Process Status:", {
      inviter: user.email,
      target: email,
      roleName,
      companyId,
      isSuperAdmin,
    });

    if (!companyId) {
      console.error(
        "Invite Error: Inviter has no company_id linked to their profile",
      );
      return NextResponse.json(
        { error: "Your account is not linked to an organization" },
        { status: 400 },
      );
    }

    // Resolve Role Name to Role ID
    console.log(`Resolving role '${roleName}' for company ${companyId}...`);
    const { data: role, error: roleSearchError } = await supabase
      .from("roles")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", roleName)
      .single();

    if (roleSearchError || !role) {
      console.warn(
        `Warning: Role '${roleName}' not found. Invitations will be sent without a pre-assigned role ID.`,
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY is missing from environment variables",
      );
      return NextResponse.json(
        { error: "Service Role Key Missing" },
        { status: 500 },
      );
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${appUrl}/signup`, // Ensure users land on our signup page
        data: {
          company_id: companyId,
          role_id: role?.id,
          role_name: roleName,
          invited_by: user.id,
        },
      },
    );

    if (error) {
      console.error("Supabase Admin Invitation Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 },
      );
    }

    console.log(`Invitation successfully sent to ${email}`);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Critical Exception in Invitation API:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error", details: error },
      { status: 500 },
    );
  }
}
