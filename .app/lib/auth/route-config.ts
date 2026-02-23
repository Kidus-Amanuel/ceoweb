/**
 * Route Protection Configuration
 * Defines which routes require which user types and permissions
 */

import { RouteRequirement } from "./types";

/**
 * Public routes - no authentication required
 */
export const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
];

/**
 * Super admin only routes
 */
export const SUPER_ADMIN_ROUTES = [
  "/admin",
  "/admin/companies",
  "/admin/users",
  "/admin/settings",
];

/**
 * Routes accessible by both super_admin and company_user
 */
export const AUTHENTICATED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/onboarding",
];

/**
 * Company user routes - requires companyId
 * These routes also need permission checks
 */
export const COMPANY_USER_ROUTES = [
  "/hrm",
  "/crm",
  "/inventory",
  "/fleet",
  "/finance",
];

/**
 * Check if a path is a public route
 */
export function isPublicRoute(pathname: string): boolean {
  // Exact match for root
  if (pathname === "/") return true;

  // Check if path starts with any public route
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path requires super admin
 */
export function requiresSuperAdmin(pathname: string): boolean {
  return SUPER_ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path requires company user with companyId
 */
export function requiresCompanyUser(pathname: string): boolean {
  return COMPANY_USER_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path requires authentication (any user type)
 */
export function requiresAuth(pathname: string): boolean {
  return (
    !isPublicRoute(pathname) &&
    (requiresSuperAdmin(pathname) ||
      requiresCompanyUser(pathname) ||
      AUTHENTICATED_ROUTES.some((route) => pathname.startsWith(route)))
  );
}

/**
 * Get route requirements for a given path
 */
export function getRouteRequirements(pathname: string): RouteRequirement {
  if (isPublicRoute(pathname)) {
    return { userTypes: [] };
  }

  if (requiresSuperAdmin(pathname)) {
    return { userTypes: ["super_admin"] };
  }

  if (requiresCompanyUser(pathname)) {
    return {
      userTypes: ["company_user", "super_admin"],
      requiresCompanyId: true,
      requiresPermissions: true,
    };
  }

  // Authenticated routes (both types)
  return { userTypes: ["super_admin", "company_user"] };
}
