import { createContext, useContext } from "react";

export type UserRole =
  | "superadmin"
  | "admin"
  | "hr_manager"
  | "crm_manager"
  | "finance_manager"
  | "inventory_clerk"
  | "driver";

export interface AuthContextType {
  user: {
    name: string;
    email: string;
    role: UserRole;
  } | null;
  isLoading: boolean;
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
