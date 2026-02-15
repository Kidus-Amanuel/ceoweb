"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Define the shape of role info returned by get_user_role_info
export interface RoleInfo {
  user_id: string;
  company_id: string | null;
  company_name: string | null;
  role_id: string | null;
  role_name: string | null;
  position: string | null;
  status: string;
  user_type: "super_admin" | "company_user";
  permissions: { module: string; action: string }[];
}

interface UserContextType {
  user: User | null;
  roleInfo: RoleInfo | null;
  isLoading: boolean;
  hasPermission: (module: string, action: string) => boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await supabase.rpc("get_user_role_info");
        if (error) {
          console.error("Error fetching role info:", error);
          setRoleInfo(null);
        } else {
          setRoleInfo(data as RoleInfo);
        }
      } else {
        setRoleInfo(null);
      }
    } catch (error) {
      console.error("Error in fetchUserData:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUserData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUserData();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setRoleInfo(null);
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData, router, supabase]);

  const hasPermission = (module: string, action: string) => {
    if (!roleInfo) return false;
    if (roleInfo.user_type === "super_admin") return true;

    return roleInfo.permissions.some(
      (p) => p.module === module && p.action === action,
    );
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const refreshUser = async () => {
    await fetchUserData();
  };

  return (
    <UserContext.Provider
      value={{
        user,
        roleInfo,
        isLoading,
        hasPermission,
        refreshUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
