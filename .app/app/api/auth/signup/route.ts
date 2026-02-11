import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation/auth";
import { authService } from "@/services/auth.service";
import logger from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate Input
    const validatedData = signupSchema.parse(body);

    // 2. Call Service
    const data = await authService.signup(validatedData);

    logger.info(
      { email: validatedData.email, context: "auth-api" },
      "User signup successful",
    );

    // 3. Return Success
    return NextResponse.json(
      { message: "Signup successful", data },
      { status: 201 },
    );
  } catch (error: any) {
    // Handle Zod validation errors specifically if needed
    if (error.name === "ZodError") {
      logger.warn(
        { errors: error.errors, context: "auth-api" },
        "Signup validation failed",
      );
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: error.errors,
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
