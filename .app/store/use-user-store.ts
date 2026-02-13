import { create } from "zustand";
import { User } from "@supabase/supabase-js";
import { RoleInfo } from "@/app/context/UserContext";

interface UserState {
  user: User | null;
  roleInfo: RoleInfo | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRoleInfo: (roleInfo: RoleInfo | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  roleInfo: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setRoleInfo: (roleInfo) => set({ roleInfo }),
  setIsLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, roleInfo: null, isLoading: false }),
}));
