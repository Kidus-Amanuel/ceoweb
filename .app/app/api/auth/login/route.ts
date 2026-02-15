import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import { authService } from "@/services/auth.service";
import logger from "@/lib/utils/logger";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate Input
    const { email, password } = loginSchema.parse(body);

    // 2. Call Service with Server Client
    const supabase = await createClient();
    const { data: authData, error: authError } = await authService.login(
      email,
      password,
      supabase,
    );

    if (authError) {
      logger.warn(
        { error: authError, context: "auth-api" },
        "Supabase login failed",
      );
      return NextResponse.json(
        {
          message: authError.message,
          code: authError.status?.toString() || "AUTH_ERROR",
        },
        { status: authError.status || 401 },
      );
    }

    logger.info({ email, context: "auth-api" }, "User login successful");

    // 3. Fetch User Profile for metadata and redirection logic
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding, user_type, company_id")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      logger.error(
        { error: profileError, userId: authData.user.id, context: "auth-api" },
        "Failed to fetch user profile after login",
      );
      // We still return success but without profile, client handles fallback
    }

    // 4. Update user metadata for auth guard system
    if (profile) {
      const metadata: Record<string, any> = {
        userType: profile.user_type,
        name: authData.user.email?.split("@")[0] || "User",
      };

      // Add company-specific metadata for company users
      if (profile.user_type === "company_user") {
        metadata.companyId = profile.company_id;

        // Fetch roleId from company_users table
        const { data: companyUser } = await supabase
          .from("company_users")
          .select("role_id")
          .eq("user_id", authData.user.id)
          .eq("company_id", profile.company_id)
          .single();

        if (companyUser) {
          metadata.roleId = companyUser.role_id;
        }
      }

      // Update user metadata in Supabase Auth using Admin Client
      const supabaseAdmin = await createAdminClient();
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
          user_metadata: metadata,
        });

      if (updateError) {
        logger.error(
          {
            error: updateError,
            userId: authData.user.id,
            context: "auth-api",
          },
          "Failed to update user metadata",
        );
      } else {
        logger.info(
          { userId: authData.user.id, metadata, context: "auth-api" },
          "User metadata updated successfully",
        );
      }
    }

    // 5. Return Success
    return NextResponse.json(
      {
        message: "Login successful",
        user: authData.user,
        profile: profile || null,
      },
      { status: 200 },
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      logger.warn(
        { errors: error.errors, context: "auth-api" },
        "Login validation failed",
      );
      return NextResponse.json(
        { message: "Validation failed", errors: error.errors },
        { status: 400 },
      );
    }

    logger.error({ error, context: "auth-api" }, "Login API failure");

    return NextResponse.json(
      {
        message: error.message || "An error occurred during login",
        code: error.code || "LOGIN_ERROR",
      },
      { status: error.status || 500 },
    );
  }
}
