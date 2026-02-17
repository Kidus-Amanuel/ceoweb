import { createContext, useContext } from "react";

export type UserType = "super_admin" | "company_user";

export interface User {
  id: string;
  name: string;
  email: string;
  userType: UserType;
  companyId?: string; // For company_user
  roleId?: string; // For company_user
  companyScope?: "full" | "limited"; // For super_admin
  companyIds?: string[]; // For super_admin
  permissions?: { module: string; action: string }[];
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
