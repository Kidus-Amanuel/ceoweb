import { NAV_CONFIG, NavItem } from "@/lib/constants/nav-config";
import { useMemo } from "react";
import { useUser } from "@/app/context/UserContext";

export function useNavigation() {
  const { roleInfo, isLoading } = useUser();

  const filteredNav = useMemo(() => {
    // We only return empty if we have absolutely no role information
    if (!roleInfo) return [];

    return NAV_CONFIG.filter((item: NavItem) => {
      // 1. Super admins always see everything
      if (roleInfo.user_type === "super_admin") return true;

      // 2. Check User Type roles in config
      if (item.roles && !item.roles.includes(roleInfo.user_type)) {
        return false;
      }

      // 3. Check Module Permissions for Company Users
      if (item.module) {
        const userPermissions = roleInfo.permissions || [];
        // Check if any permission module matches (case-insensitive)
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
