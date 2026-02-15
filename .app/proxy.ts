/**
 * Next.js 16 Proxy for Route Protection
 * Combines Supabase session management with authentication/authorization checks
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes - skip all checks
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Create Supabase client for server-side
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // No session - handle unauthorized access
  if (!session) {
    // Return 401 for API routes instead of redirecting
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Extract user type from session
  let userType = session.user.user_metadata?.userType as UserType;

  // Fallback: If userType is missing, try to get the latest user data from Supabase
  if (!userType) {
    const {
      data: { user: latestUser },
    } = await supabase.auth.getUser();
    if (latestUser?.user_metadata?.userType) {
      userType = latestUser.user_metadata.userType as UserType;
    }
  }

  if (!userType) {
    console.error("User type not found in session or latest user data");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check route requirements
  const requirements = getRouteRequirements(pathname);

  // Check if user type is allowed for this route
  if (
    requirements.userTypes.length > 0 &&
    !requirements.userTypes.includes(userType)
  ) {
    // Redirect unauthorized users to appropriate page
    if (userType === "company_user" && requiresSuperAdmin(pathname)) {
      // Company user trying to access super admin route
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else if (userType === "super_admin" && requiresCompanyUser(pathname)) {
      // Super admin trying to access company route (redirect to admin)
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Default: redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Additional checks for company users
  if (userType === "company_user" && requirements.requiresCompanyId) {
    const companyId = session.user.user_metadata?.companyId;

    if (!companyId) {
      console.error("Company user missing companyId");
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // All checks passed - return response with updated session cookies
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
