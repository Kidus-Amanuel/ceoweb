/**
 * AuthGuard Component
 * Client-side wrapper for protected routes
 * Handles loading states, permission checks, and redirects
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/app/context/UserContext";
import { getRouteRequirements } from "@/lib/auth/route-config";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: {
    module: string;
    action: string;
  };
  /** Module code to check against the user's plan (e.g. "fleet", "crm") */
  requiredModule?: string;
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  requiredPermission,
  requiredModule,
  fallback,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, roleInfo, isLoading, hasPermission } = useUser();
  // Derive status during render to avoid cascading renders
  let currentAuthState: "loading" | "authorized" | "denied" = "loading";
  let redirectTarget: string | null = null;

  if (isLoading) {
    currentAuthState = "loading";
  } else if (!user) {
    currentAuthState = "loading";
    redirectTarget = `/login?redirectTo=${encodeURIComponent(pathname)}`;
  } else if (!roleInfo) {
    if (pathname === "/onboarding") {
      currentAuthState = "authorized";
    } else {
      currentAuthState = "denied";
    }
  } else {
    // Role/Company/Onboarding Logic
    const isSuperAdmin = roleInfo.user_type === "super_admin";
    const requirements = getRouteRequirements(pathname);

    if (!isSuperAdmin && !roleInfo.company_id && pathname !== "/onboarding") {
      currentAuthState = "loading";
      redirectTarget = "/onboarding";
    } else if (
      !isSuperAdmin &&
      requirements.userTypes.length > 0 &&
      !requirements.userTypes.includes(roleInfo.user_type)
    ) {
      currentAuthState = "loading";
      redirectTarget = "/dashboard";
    } else if (
      // ── Module Plan Check ──────────────────────────────────────────────
      // roleInfo.plan_modules comes from the DB (get_user_role_info RPC) so
      // it is always accurate. We only enforce the check when plan_modules is
      // non-empty — an empty/null plan means "no restriction configured yet",
      // which prevents accidental lockouts for fresh accounts.
      // This applies to ALL user types (including super_admin): the sidebar
      // shows locked modules as an upgrade upsell, but direct URL access must
      // also be blocked.
      requiredModule &&
      (roleInfo.plan_modules?.length ?? 0) > 0 &&
      !roleInfo.plan_modules.some(
        (m: string) => m.toLowerCase() === requiredModule.toLowerCase(),
      )
    ) {
      currentAuthState = "loading";
      redirectTarget = "/dashboard";
    } else if (
      requiredPermission &&
      !isSuperAdmin &&
      !hasPermission(requiredPermission.module, requiredPermission.action)
    ) {
      currentAuthState = "denied";
    } else {
      currentAuthState = "authorized";
    }
  }

  // Handle redirects in an effect
  useEffect(() => {
    if (redirectTarget) {
      router.push(redirectTarget);
    }
  }, [redirectTarget, router]);

  // Show loading state
  if (currentAuthState === "loading") {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 font-medium tracking-wide animate-pulse">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (currentAuthState === "denied") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-card border border-border rounded-xl shadow-lg max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground mb-6">
            You don&apos;t have the necessary permissions to view this part of
            the platform.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}
