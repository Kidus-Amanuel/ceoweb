import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation/auth";
import { authService } from "@/services/auth.service";
import logger from "@/lib/utils/logger";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Signup Request Body:", JSON.stringify(body, null, 2));

    // 1. Validate Input
    const validatedData = signupSchema.parse(body);

    // 2. Initialize Admin Client
    const supabaseAdmin = await createAdminClient();

    // 3. Check if user already exists (Invited Flow)
    const {
      data: { users },
      error: listError,
    } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find(
      (u) => u.email?.toLowerCase() === validatedData.email.toLowerCase(),
    );

    // Check if they were invited (have companyId or company_id in metadata)
    const companyId =
      existingUser?.user_metadata?.companyId ||
      existingUser?.user_metadata?.company_id;
    const isInvited = !!companyId;

    if (isInvited && existingUser) {
      logger.info(
        { email: validatedData.email },
        "Finalizing invited user signup",
      );

      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: validatedData.password,
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            userType: "company_user",
            companyId: companyId,
            roleId:
              existingUser.user_metadata?.roleId ||
              existingUser.user_metadata?.role_id,
            fullName: validatedData.fullName,
          },
        });

      if (updateError) throw updateError;

      return NextResponse.json(
        { message: "Signup successful", autoRedirect: true },
        { status: 200 },
      );
    }

    // 4. Standard Signup (New User Flow)
    const supabase = await createClient();
    const { data: authData, error: authError } = await authService.signUp(
      validatedData.email,
      validatedData.password,
      validatedData.fullName,
      { userType: "super_admin" },
      supabase,
    );

    if (authError) {
      logger.warn({ error: authError }, "Standard signup failed");
      return NextResponse.json(
        { message: authError.message },
        { status: authError.status || 400 },
      );
    }

    // Return Success with autoRedirect: false for new users
    return NextResponse.json(
      {
        message: "Signup successful",
        data: authData,
        autoRedirect: false,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Signup Error Dump:", error); // Raw error log
    if (error?.name === "ZodError" || error instanceof z.ZodError) {
      const issues = error.issues || error.errors;
      console.error("Zod Validation Issues:", JSON.stringify(issues, null, 2));

      return NextResponse.json(
        {
          message: "Validation failed",
          errors: issues,
        },
        { status: 400 },
      );
    }

    // Generic error handling using centralized logger
    logger.error({ error, context: "auth-api" }, "Signup API failure");

    return NextResponse.json(
      {
        message: error.message || "An error occurred during signup",
        code: error.code || "SIGNUP_ERROR",
      },
      { status: error.status || 500 },
    );
  }
}
