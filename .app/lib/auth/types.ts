/**
 * Authentication and Authorization Type Definitions
 * Based on the two-tier user type system (super_admin + company_user)
 */

// User types in the system
export type UserType = "super_admin" | "company_user";

// Company scope for super admin
export type CompanyScope = "all" | "limited";

/**
 * Authentication session interface
 * Represents the authenticated user's session data
 */
export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  userType: UserType;

  // Company user specific fields
  companyId?: string; // Only present for company_user
  roleId?: string; // Only present for company_user

  // Super admin specific fields
  companyIds?: string[]; // Only present for super_admin with limited scope
  companyScope?: CompanyScope; // Only present for super_admin
}

/**
 * Permission structure from role_permissions table
 */
export interface Permission {
  module: string; // e.g., "HRM", "CRM", "Inventory"
  action: string; // e.g., "view", "create", "edit", "delete"
}

/**
 * Role permissions response from API
 */
export interface RolePermissions {
  roleId: string;
  permissions: Permission[];
}

/**
 * Route protection requirements
 */
export interface RouteRequirement {
  userTypes: UserType[]; // Which user types can access this route
  requiresCompanyId?: boolean; // Must have companyId in session
  requiresPermissions?: boolean; // Needs to check permissions
}

/**
 * Auth state for components
 */
export interface AuthState {
  session: AuthSession | null;
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Type guards
 */
export function isSuperAdmin(session: AuthSession | null): boolean {
  return session?.userType === "super_admin";
}

export function isCompanyUser(session: AuthSession | null): boolean {
  return session?.userType === "company_user";
}

export function hasCompanyAccess(
  session: AuthSession | null,
  companyId: string,
): boolean {
  if (!session) return false;

  if (isSuperAdmin(session)) {
    if (session.companyScope === "all") return true;
    return session.companyIds?.includes(companyId) ?? false;
  }

  return session.companyId === companyId;
}
