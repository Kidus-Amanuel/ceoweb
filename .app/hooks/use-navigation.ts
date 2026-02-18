import { NAV_CONFIG, NavItem } from "@/lib/constants/nav-config";
import { useMemo } from "react";
import { useUser } from "@/app/context/UserContext";

export function useNavigation() {
  const { roleInfo, isLoading } = useUser();

  const filteredNav = useMemo(() => {
    if (!roleInfo) return [];

    const planModules = roleInfo.plan_modules || [];

    return NAV_CONFIG.filter((item: NavItem) => {
      // 1. Platform Admin is only for Super Admins
      if (item.id === "admin" && roleInfo.user_type !== "super_admin")
        return false;

      // 2. Super admins always see everything (for the upgrade upsell flow)
      // This allows them to see "Locked" modules in the sidebar
      if (roleInfo.user_type === "super_admin") return true;

      // 3. For Regular Users: Strict Plan & Permission Filtering
      if (item.module) {
        // A. Module must be in the plan for company users to see it at all
        const isModuleInPlan = planModules.some(
          (m: string) => m.toLowerCase() === item.module?.toLowerCase(),
        );

        if (!isModuleInPlan) return false;

        // B. Permission check
        // General Manager bypass: If the module is in the plan, GMs should see it
        // even if explicit permissions haven't been synchronized yet (common after upgrade)
        const isGeneralManager =
          roleInfo.role_name?.toLowerCase().includes("general manager") ||
          roleInfo.role_name?.toLowerCase().includes("gm") ||
          roleInfo.role_name?.toLowerCase().includes("owner");

        if (isGeneralManager) return true;

        const userPermissions = roleInfo.permissions || [];
        const hasModuleAccess = userPermissions.some(
          (p: { module: string; action: string }) =>
            p.module.toLowerCase() === item.module?.toLowerCase(),
        );

        if (!hasModuleAccess) {
          return false;
        }
      }

      // 4. Fallback check for items without an explicit module (like Dashboard/Settings)
      if (item.roles && !item.roles.includes(roleInfo.user_type)) {
        return false;
      }

      return true;
    });
  }, [roleInfo]);

  return filteredNav;
}
