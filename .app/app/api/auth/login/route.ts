import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import { authService } from "@/services/auth.service";
import logger from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate Input
    const { email, password } = loginSchema.parse(body);

    // 2. Call Service
    const data = await authService.login(email, password);

    logger.info({ email, context: "auth-api" }, "User login successful");

    // 3. Return Success
    return NextResponse.json(
      { message: "Login successful", user: data.user },
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
      { status: error.status || 401 },
    );
  }
}
