import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

export const authService = {
  async signUp(
    email: string,
    password: string,
    fullName: string,
    metadata: Record<string, any> = {},
    supabase?: SupabaseClient,
  ) {
    const client = supabase || createClient();
    const deployUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...metadata,
        },
        emailRedirectTo: `${deployUrl}/auth/callback`,
      },
    });
  },

  async login(email: string, password: string, supabase?: SupabaseClient) {
    const client = supabase || createClient();
    return client.auth.signInWithPassword({
      email,
      password,
    });
  },

  async logout(supabase?: SupabaseClient) {
    const client = supabase || createClient();
    return client.auth.signOut();
  },

  async resetPassword(email: string) {
    const supabase = createClient();
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    });
  },
};
