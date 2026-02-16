/**
 * API Route: Get Role Permissions
 * Fetches permissions for a specific role
 * GET /api/roles/[roleId]/permissions
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId } = await params;

    // Verify user has access to this role
    // Company users can only access their own role
    if (user.user_metadata?.userType === "company_user") {
      if (user.user_metadata?.roleId !== roleId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Fetch role permissions from database
    const { data: permissions, error } = await supabase
      .from("role_permissions")
      .select("module, action")
      .eq("role_id", roleId);

    if (error) {
      console.error("Error fetching role permissions:", error);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      roleId,
      permissions: permissions || [],
    });
  } catch (error) {
    console.error("Error in role permissions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
