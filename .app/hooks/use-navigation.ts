import { NAV_CONFIG, NavItem } from "@/lib/constants/nav-config";
import { useMemo } from "react";
import { useUser } from "@/app/context/UserContext";

export function useNavigation() {
  const { roleInfo, isLoading } = useUser();

  const filteredNav = useMemo(() => {
    if (!roleInfo) return [];

    const planModules = roleInfo.plan_modules || [];

    return NAV_CONFIG.filter((item: NavItem) => {
      // 1. Super admins always see everything (for the upgrade upsell flow)
      if (roleInfo.user_type === "super_admin") return true;

      // 2. Check User Type roles in config
      if (item.roles && !item.roles.includes(roleInfo.user_type)) {
        return false;
      }

      // 3. Check Plan & Module Permissions for Company Users
      if (item.module) {
        // Module must be in the plan for company users to see it
        const isModuleInPlan = planModules.some(
          (m: string) => m.toLowerCase() === item.module?.toLowerCase(),
        );

        if (!isModuleInPlan) return false;

        const userPermissions = roleInfo.permissions || [];
        const hasModuleAccess = userPermissions.some(
          (p: { module: string; action: string }) =>
            p.module.toLowerCase() === item.module?.toLowerCase(),
        );

        if (!hasModuleAccess) {
          return false;
        }
      }

      return true;
    });
  }, [roleInfo]);

  return filteredNav;
}
