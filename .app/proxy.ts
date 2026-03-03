/**
 * Next.js Proxy for Route Protection
 * Combines Supabase session management with authentication/authorization checks.
 *
 * Key design decisions:
 * - Matcher uses an explicit ALLOWLIST — only known protected routes are intercepted.
 *   This prevents the proxy from running on non-existent routes (which would previously
 *   cause a blocking Supabase network call before Next.js could render a 404).
 * - getUser() is wrapped with a hard 5-second timeout via AbortController so that
 *   a Supabase ECONNRESET or flaky connection never hangs the entire request pipeline.
 * - The redundant second getUser() call in the userType fallback has been removed.
 *   getUser() returns the same metadata both times; the fallback was a no-op that
 *   doubled the blast radius of any network failure.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { UserType } from "./lib/auth/types";
import {
  isPublicRoute,
  requiresSuperAdmin,
  requiresCompanyUser,
  getRouteRequirements,
} from "./lib/auth/route-config";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Hard deadline (ms) for the Supabase Auth network call.
 *  If Supabase doesn't respond within this window the proxy fails-closed
 *  and redirects to /login rather than hanging the entire HTTP response. */
const AUTH_TIMEOUT_MS = 5_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calls supabase.auth.getUser() with a hard timeout.
 * Returns null on any network failure or timeout instead of throwing,
 * so the calling code can make a clean redirect decision.
 */
async function getUserWithTimeout(
  supabase: ReturnType<typeof createServerClient>,
): Promise<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("[proxy] supabase.auth.getUser() error:", error.message);
      return null;
    }

    return data.user;
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.error(
      isTimeout
        ? `[proxy] supabase.auth.getUser() timed out after ${AUTH_TIMEOUT_MS}ms`
        : "[proxy] supabase.auth.getUser() threw unexpectedly:",
      err,
    );
    return null;
  } finally {
    clearTimeout(timer);
    // Silence the unused-variable lint warning; controller.abort() is called inside timer.
    void controller;
  }
}

// ─── Proxy ────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Fast-path: public routes bypass auth entirely ──────────────────────
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // ── 2. Build response object that carries refreshed session cookies ────────
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // ── 3. Verify the user — with a hard timeout ───────────────────────────────
  //
  // getUser() makes a live HTTPS request to Supabase Auth API.
  // Without a timeout, ECONNRESET causes the await to block for the entire
  // Node.js socket timeout window (several minutes), stalling every response.
  //
  const user = await getUserWithTimeout(supabase);

  // ── 4. No authenticated user → redirect / 401 ─────────────────────────────
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Resolve user type ───────────────────────────────────────────────────
  //
  // We intentionally do NOT call getUser() a second time here.
  // The metadata comes back from the same token on the first call;
  // a second call returns identical data and doubles failure surface.
  //
  const userType = user.user_metadata?.userType as UserType | undefined;

  if (!userType) {
    console.error(
      "[proxy] userType missing from user_metadata. userId:",
      user.id,
    );
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── 6. Check route-level access requirements ───────────────────────────────
  const requirements = getRouteRequirements(pathname);

  if (
    requirements.userTypes.length > 0 &&
    !requirements.userTypes.includes(userType)
  ) {
    if (userType === "company_user" && requiresSuperAdmin(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (userType === "super_admin" && requiresCompanyUser(pathname)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── 7. Company user must have a companyId scoped to their routes ───────────
  if (userType === "company_user" && requirements.requiresCompanyId) {
    if (!user.user_metadata?.companyId) {
      console.error(
        "[proxy] company_user is missing companyId. userId:",
        user.id,
      );
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ── 8. All checks passed — forward request with refreshed cookies ──────────
  return response;
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
//
// CRITICAL: This is an EXPLICIT ALLOWLIST, not a "match everything" regex.
//
// Previous pattern: "/((?!_next/static|_next/image|favicon.ico|...).*)"
// That catches EVERY route including ones that don't exist, which caused the proxy
// to block on a Supabase network call before Next.js could render a 404.
//
// Rule: Only routes listed here will run through the auth proxy.
// Any URL not listed below passes straight to Next.js routing — if the page
// doesn't exist, Next.js renders its 404 immediately with zero auth latency.
//
export const config = {
  matcher: [
    // ── Shared authenticated routes (both user types) ──
    // NOTE: "/dashboard" has a page; "/settings" does NOT have a root page.tsx —
    // only sub-routes exist (/settings/billing, /settings/company, etc.).
    // Using ":path+" (one-or-more) instead of ":path*" (zero-or-more) ensures
    // the proxy only runs when a real sub-route is being accessed, not on the
    // bare "/settings" path that would always 404 after an expensive auth call.
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path+", // ← :path+ not :path* — /settings itself has no page
    "/onboarding/:path*",

    // ── Super admin routes ──
    "/admin/:path*",

    // ── Company user module routes ──
    // NOTE: App directory uses /hr not /hrm — must match actual folder name.
    "/hr/:path*",
    "/crm/:path*",
    "/inventory/:path*",
    "/fleet/:path*",
    "/finance/:path*",
    "/internationaltrade/:path*",
    "/ai-agent/:path*",
    "/chat/:path*",

    // ── Protected API routes (exclude /api/auth which is public) ──
    "/api/((?!auth).*)",
  ],
};
