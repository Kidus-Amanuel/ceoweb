/**
 * Route Protection Configuration
 * Defines which routes require which user types and permissions.
 *
 * NOTE: The proxy matcher (proxy.ts config.matcher) is the PRIMARY gate.
 * These helpers operate ONLY on routes that the matcher has already
 * decided to intercept. They are not responsible for "all routes".
 */

import { RouteRequirement, UserType } from "./types";

// ─── Route Lists ──────────────────────────────────────────────────────────────

/**
 * Public routes — no authentication required.
 * The proxy short-circuits immediately for these.
 */
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/api/webhooks",
  "/coming-soon",
] as const;

/**
 * Super admin only routes.
 */
export const SUPER_ADMIN_ROUTES = ["/admin"] as const;

/**
 * Routes accessible by both super_admin and company_user.
 */
export const AUTHENTICATED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/onboarding",
  "/chat",
  "/ai-agent",
] as const;

/**
 * Company user module routes — require a companyId and permission checks.
 */
export const COMPANY_USER_ROUTES = [
  "/hr",
  "/hrm",
  "/crm",
  "/inventory",
  "/fleet",
  "/finance",
  "/internationaltrade",
  "/trade",
  "/api/fleet",
  "/api/hr",
  "/api/crm",
  "/api/inventory",
  "/api/finance",
  "/api/trade",
] as const;

// ─── Guards ───────────────────────────────────────────────────────────────────

/** Returns true if the route is public (no auth needed). */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route),
  );
}

/** Returns true if the route is restricted to super_admin only. */
export function requiresSuperAdmin(pathname: string): boolean {
  return SUPER_ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

/** Returns true if the route is restricted to company_user (+ super_admin). */
export function requiresCompanyUser(pathname: string): boolean {
  return COMPANY_USER_ROUTES.some((route) => pathname.startsWith(route));
}

/** Returns true if the route is in the shared authenticated set. */
export function isAuthenticatedRoute(pathname: string): boolean {
  return AUTHENTICATED_ROUTES.some((route) => pathname.startsWith(route));
}

// ─── Route Requirements ───────────────────────────────────────────────────────

/**
 * Returns the access requirements for a given pathname.
 *
 * An empty `userTypes` array means "any authenticated user is allowed"
 * (the proxy still enforces that a user exists — this just skips the
 * type-level restriction check).
 */
/**
 * Maps a given pathname to its corresponding module code.
 */
export function getModuleFromPathname(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  let firstSegment = segments[0].toLowerCase();

  // If we're in the API, we care about the NEXT segment for module identification
  if (firstSegment === "api" && segments.length > 1) {
    firstSegment = segments[1].toLowerCase();
  }

  // Root modules mapping
  const mapping: Record<string, string> = {
    hr: "hr",
    hrm: "hr",
    crm: "crm",
    inventory: "inventory",
    fleet: "fleet",
    finance: "finance",
    internationaltrade: "trade",
    trade: "trade",
    "ai-agent": "ai",
    chat: "chat",
  };

  return mapping[firstSegment] || null;
}

export function getRouteRequirements(pathname: string): RouteRequirement {
  // Public — should never reach here if isPublicRoute() check runs first.
  if (isPublicRoute(pathname)) {
    return { userTypes: [] };
  }

  // Super admin only.
  if (requiresSuperAdmin(pathname)) {
    return { userTypes: ["super_admin"] };
  }

  // Company-user module routes — need companyId + permission check.
  if (requiresCompanyUser(pathname)) {
    return {
      userTypes: ["company_user", "super_admin"],
      requiresCompanyId: true,
      requiresPermissions: true,
    };
  }

  // Shared authenticated routes — both user types allowed.
  if (isAuthenticatedRoute(pathname)) {
    return { userTypes: ["super_admin", "company_user"] };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  // If the proxy matcher is doing its job (allowlist), this branch is
  // unreachable in production. As a safe default we require full auth
  // rather than silently allowing an unclassified route.
  console.warn(
    "[route-config] Unclassified route reached getRouteRequirements():",
    pathname,
    "— defaulting to full auth requirement.",
  );
  return { userTypes: ["super_admin", "company_user"] };
}
