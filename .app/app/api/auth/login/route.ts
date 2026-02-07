import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/validators/auth";
import { authService } from "@/services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate Input
    const { email, password } = loginSchema.parse(body);

    // 2. Call Service
    const data = await authService.login(email, password);

    // 3. Return Success
    return NextResponse.json(
      { message: "Login successful", user: data.user },
      { status: 200 },
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { message: "Validation failed", errors: error.errors },
        { status: 400 },
      );
    }

    console.error("[Login API Error]:", error);

    return NextResponse.json(
      {
        message: error.message || "An error occurred during login",
        code: error.code || "LOGIN_ERROR",
      },
      { status: error.status || 401 },
    );
  }
}
