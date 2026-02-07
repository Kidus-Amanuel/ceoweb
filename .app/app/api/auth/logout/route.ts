import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";

export async function POST() {
  try {
    await authService.logout();
    return NextResponse.json({ message: "Logout successful" }, { status: 200 });
  } catch (error: any) {
    console.error("[Logout API Error]:", error);
    return NextResponse.json(
      { message: "Failed to logout", error: error.message },
      { status: 500 },
    );
  }
}
