import { useAuth } from "@/hooks/use-auth";
import { NAV_CONFIG, NavItem } from "@/lib/constants/nav-config";
import { useMemo } from "react";

// Mock permissions mapping based on erp_mock_data.md
const ROLE_PERMISSIONS: Record<string, string[]> = {
  role_1: ["CRM", "HR", "Fleet", "Finance", "Inventory"], // General Manager
  role_2: ["HR"], // HR Manager
  role_3: ["CRM"], // CRM Manager
  role_5: ["HR"], // HR Manager (XYZ)
  role_6: ["HR"], // HR Supervisor
  role_7: ["Fleet"], // Driver
  role_8: ["CRM"], // Sales Executive
  role_9: ["Fleet"], // Fleet Manager
  role_10: ["HR"], // HR Supervisor
  role_11: ["Fleet"], // Driver
  role_12: ["CRM"], // Sales Executive
};

export function useNavigation() {
  const { user } = useAuth();

  const filteredNav = useMemo(() => {
    if (!user) return [];

    return NAV_CONFIG.filter((item) => {
      // 1. Check User Type (Super Admin vs Company User)
      if (item.roles && !item.roles.includes(user.userType)) {
        return false;
      }

      // 2. Check Module Permissions for Company Users
      if (user.userType === "company_user" && item.module) {
        const userPermissions = ROLE_PERMISSIONS[user.roleId || ""] || [];
        if (!userPermissions.includes(item.module)) {
          return false;
        }
      }

      return true;
    });
  }, [user]);

  return filteredNav;
}
