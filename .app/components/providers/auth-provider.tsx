"use client";

import React, { ReactNode, useEffect, useMemo } from "react";
import {
  AuthContext,
  AuthContextType,
  User as AuthUser,
} from "@/hooks/use-auth";
import { useUser } from "@/app/context/UserContext";
import { useAuthStore } from "@/store/authStore";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: supabaseUser, roleInfo, isLoading, logout } = useUser();
  const { setUser, setLoading } = useAuthStore();

  // Map Supabase user + RoleInfo to the application's AuthUser type
  const user: AuthUser | null = useMemo(() => {
    if (!supabaseUser || !roleInfo) return null;

    return {
      id: supabaseUser.id,
      name:
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.email ||
        "Unknown",
      email: supabaseUser.email || "",
      userType: roleInfo.user_type,
      companyId: roleInfo.company_id || undefined,
      roleId: roleInfo.role_id || undefined,
      // Add defaults for super_admin specific fields if needed
      companyScope: roleInfo.user_type === "super_admin" ? "full" : undefined,
      companyIds: undefined,
      permissions: roleInfo.permissions,
    };
  }, [supabaseUser, roleInfo]);

  // Sync with Zustand store
  useEffect(() => {
    setUser(user);
    setLoading(isLoading);
  }, [user, isLoading, setUser, setLoading]);

  const value: AuthContextType = {
    user,
    isLoading,
    signOut: logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
