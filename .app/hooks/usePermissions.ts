/**
 * usePermissions Hook
 * Manages and checks role-based permissions for company users
 */

"use client";

import { useEffect, useState } from "react";
import { Permission } from "@/lib/auth/types";
import {
  fetchRolePermissions,
  hasPermission as checkPermission,
  hasModuleAccess as checkModuleAccess,
  getModuleActions,
  canPerformAction,
} from "@/lib/auth/permissions";
import { useAuth } from "./useAuth";

export function usePermissions() {
  const { session, isCompanyUser } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCompanyUser && session?.roleId) {
      loadPermissions(session.roleId);
    } else if (!isCompanyUser) {
      // Super admin - no need to load permissions
      setPermissions([]);
      setIsLoading(false);
    }
  }, [session?.roleId, isCompanyUser]);

  const loadPermissions = async (roleId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const perms = await fetchRolePermissions(roleId);
      setPermissions(perms);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load permissions",
      );
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    return canPerformAction(session, permissions, module, action);
  };

  const hasModuleAccess = (module: string): boolean => {
    // Super admins have access to all modules
    if (session?.userType === "super_admin") {
      return true;
    }

    return checkModuleAccess(permissions, module);
  };

  const getActions = (module: string): string[] => {
    // Super admins can perform all actions
    if (session?.userType === "super_admin") {
      return ["view", "create", "edit", "delete"];
    }

    return getModuleActions(permissions, module);
  };

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
    hasModuleAccess,
    getActions,
    reload: () => session?.roleId && loadPermissions(session.roleId),
  };
}
