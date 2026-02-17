/**
 * Permission Management Utilities
 * Handles fetching and checking role-based permissions for company users
 */

import { Permission, RolePermissions, AuthSession } from "./types";

/**
 * Fetch permissions for a role from API
 */
export async function fetchRolePermissions(
  roleId: string,
): Promise<Permission[]> {
  try {
    const response = await fetch(`/api/roles/${roleId}/permissions`);

    if (!response.ok) {
      console.error("Failed to fetch role permissions:", response.statusText);
      return [];
    }

    const data: RolePermissions = await response.json();
    return data.permissions;
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return [];
  }
}

/**
 * Check if user has permission for a specific module and action
 */
export function hasPermission(
  permissions: Permission[],
  module: string,
  action: string,
): boolean {
  return permissions.some(
    (p) =>
      p.module.toLowerCase() === module.toLowerCase() &&
      p.action.toLowerCase() === action.toLowerCase(),
  );
}

/**
 * Check if user has any permission for a module
 */
export function hasModuleAccess(
  permissions: Permission[],
  module: string,
): boolean {
  return permissions.some(
    (p) => p.module.toLowerCase() === module.toLowerCase(),
  );
}

/**
 * Get all actions user can perform on a module
 */
export function getModuleActions(
  permissions: Permission[],
  module: string,
): string[] {
  return permissions
    .filter((p) => p.module.toLowerCase() === module.toLowerCase())
    .map((p) => p.action);
}

/**
 * Check if super admin (they bypass permission checks)
 */
export function isSuperAdmin(session: AuthSession | null): boolean {
  return session?.userType === "super_admin";
}

/**
 * Check if user can perform action (super admin or has permission)
 */
export function canPerformAction(
  session: AuthSession | null,
  permissions: Permission[],
  module: string,
  action: string,
): boolean {
  // Super admins have full access
  if (isSuperAdmin(session)) {
    return true;
  }

  // Check permissions for company users
  return hasPermission(permissions, module, action);
}

/**
 * Filter permissions by module
 */
export function getPermissionsByModule(
  permissions: Permission[],
  module: string,
): Permission[] {
  return permissions.filter(
    (p) => p.module.toLowerCase() === module.toLowerCase(),
  );
}

/**
 * Get all unique modules from permissions
 */
export function getAvailableModules(permissions: Permission[]): string[] {
  const modules = new Set(permissions.map((p) => p.module));
  return Array.from(modules);
}
