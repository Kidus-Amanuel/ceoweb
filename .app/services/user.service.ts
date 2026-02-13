import { createClient } from "@/lib/supabase/client";
import { RoleInfo } from "@/app/context/UserContext";

export const userService = {
  async getUserRoleInfo() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase.rpc("get_user_role_info");

    if (!error && data) {
      return data as RoleInfo;
    }

    // Fallback for super_admin or users not yet in company_users
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      return {
        user_id: profile.id,
        company_id: profile.company_id,
        company_name: null,
        role_id: null,
        role_name: null,
        position: null,
        status: profile.status,
        user_type: profile.user_type,
        permissions: [],
      } as RoleInfo;
    }

    return null;
  },

  async updateProfile(updates: { full_name?: string; avatar_url?: string }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    return supabase.from("profiles").update(updates).eq("id", user.id);
  },
};
