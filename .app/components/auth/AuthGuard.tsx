/**
 * AuthGuard Component
 * Client-side wrapper for protected routes
 * Handles loading states, permission checks, and redirects
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getRouteRequirements } from "@/lib/auth/route-config";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: {
    module: string;
    action: string;
  };
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  requiredPermission,
  fallback,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading: authLoading, isSuperAdmin } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkAuthorization = useCallback(async () => {
    setIsChecking(true);

    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // No session - redirect to login
    if (!session) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      setIsAuthorized(false);
      setIsChecking(false);
      return;
    }

    // Get route requirements
    const requirements = getRouteRequirements(pathname);

    // Check user type authorization
    if (
      !isSuperAdmin &&
      requirements.userTypes.length > 0 &&
      !requirements.userTypes.includes(session.userType)
    ) {
      // Unauthorized user type
      if (session.userType === "company_user") {
        router.push("/dashboard");
      } else {
        router.push("/admin");
      }
      setIsAuthorized(false);
      setIsChecking(false);
      return;
    }

    // Check if company user has required companyId
    if (
      !isSuperAdmin &&
      requirements.requiresCompanyId &&
      session.userType === "company_user" &&
      !session.companyId
    ) {
      router.push("/login"); // or /onboarding if needed
      setIsAuthorized(false);
      setIsChecking(false);
      return;
    }

    // Check specific permission if required
    if (requiredPermission && !isSuperAdmin) {
      // Wait for permissions to load for company users
      if (permissionsLoading) {
        return;
      }

      const hasRequiredPermission = hasPermission(
        requiredPermission.module,
        requiredPermission.action,
      );

      if (!hasRequiredPermission) {
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }
    }

    // All checks passed
    setIsAuthorized(true);
    setIsChecking(false);
  }, [
    authLoading,
    session,
    router,
    pathname,
    isSuperAdmin,
    requiredPermission,
    permissionsLoading,
    hasPermission,
  ]);

  useEffect(() => {
    // Avoid synchronous setState in effect by using an async wrapper if necessary
    // or just ensuring it only runs when needed.
    const runCheck = async () => {
      await checkAuthorization();
    };
    runCheck();
  }, [checkAuthorization, pathname]); // Simplified dependencies since checkAuthorization is useCallback

  // Show loading state
  if (isChecking || authLoading || permissionsLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unauthorized
          </h1>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}
