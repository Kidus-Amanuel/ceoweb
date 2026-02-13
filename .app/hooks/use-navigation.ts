import { useAuthStore } from "@/store/authStore";
import { NAV_CONFIG, NavItem } from "@/lib/constants/nav-config";
import { useMemo } from "react";

export function useNavigation() {
  const { user } = useAuthStore();

  const filteredNav = useMemo(() => {
    if (!user) return [];

    return NAV_CONFIG.filter((item: NavItem) => {
      // 1. Super admins always see everything
      if (user.userType === "super_admin") return true;

      // 2. Check User Type roles in config
      if (item.roles && !item.roles.includes(user.userType)) {
        return false;
      }

      // 3. Check Module Permissions for Company Users
      if (item.module) {
        const userPermissions = user.permissions || [];
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
  }, [user]);

  return filteredNav;
}
