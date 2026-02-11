"use client";

import React, { useState, ReactNode } from "react";
import { AuthContext, AuthContextType, UserRole } from "@/hooks/use-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mocking an admin user by default
  const [user] = useState({
    name: "John Doe",
    email: "john@ceo-portal.com",
    role: "admin" as UserRole,
  });

  const value: AuthContextType = {
    user,
    isLoading: false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
