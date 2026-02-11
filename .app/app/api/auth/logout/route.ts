import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import logger from "@/lib/utils/logger";

export async function POST() {
  try {
    await authService.logout();
    logger.info({ context: "auth-api" }, "User logout successful");
    return NextResponse.json({ message: "Logout successful" }, { status: 200 });
  } catch (error: any) {
    logger.error({ error, context: "auth-api" }, "Logout API failure");
    return NextResponse.json(
      { message: "Failed to logout", error: error.message },
      { status: 500 },
    );
  }
}
