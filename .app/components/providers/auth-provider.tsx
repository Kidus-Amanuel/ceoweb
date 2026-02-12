"use client";

import React, { useState, ReactNode } from "react";
import { AuthContext, AuthContextType, User } from "@/hooks/use-auth";

const MOCK_USERS: Record<string, User> = {
  super_admin: {
    id: "user_1",
    name: "System Admin",
    email: "admin@erp.com",
    userType: "super_admin",
    companyScope: "limited",
    companyIds: ["comp_1023", "comp_8891"],
  },
  general_manager: {
    id: "user_2",
    name: "Kidus Abebe",
    email: "kidus@abc.com",
    userType: "company_user",
    companyId: "comp_1023",
    roleId: "role_1", // General Manager (All Modules)
  },
  hr_manager: {
    id: "user_3",
    name: "Sara Bekele",
    email: "sara@abc.com",
    userType: "company_user",
    companyId: "comp_1023",
    roleId: "role_2", // HR Manager (HR Only)
  },
  fleet_manager: {
    id: "user_10",
    name: "Tadesse Yohannes",
    email: "tadesse@xyz.com",
    userType: "company_user",
    companyId: "comp_8891",
    roleId: "role_9", // Fleet Manager (Fleet Only)
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // --- DEVELOPMENT OVERRIDE ---
  // Change this key to test different roles: 'super_admin', 'general_manager', 'hr_manager', 'fleet_manager'
  const [user, setUser] = useState<User | null>(MOCK_USERS.super_admin);

  const signOut = () => {
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading: false,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
