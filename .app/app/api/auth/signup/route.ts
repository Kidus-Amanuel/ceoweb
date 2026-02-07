import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/validators/auth";
import { authService } from "@/services/auth.service";
import { handleAxiosError } from "@/utils/error-handler";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validate Input
    const validatedData = signupSchema.parse(body);

    // 2. Call Service
    const data = await authService.signup(validatedData);

    // 3. Return Success
    return NextResponse.json(
      { message: "Signup successful", data },
      { status: 201 },
    );
  } catch (error: any) {
    // Handle Zod validation errors specifically if needed
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: error.errors,
        },
        { status: 400 },
      );
    }

    // Generic error handling (consistent with our handleAxiosError logic)
    console.error("[Signup API Error]:", error);

    return NextResponse.json(
      {
        message: error.message || "An error occurred during signup",
        code: error.code || "SIGNUP_ERROR",
      },
      { status: error.status || 500 },
    );
  }
}
