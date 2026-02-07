import { createClient } from "@/lib/supabase/server";
import { SignupFormValues } from "@/validators/auth";

export const authService = {
  async signup(data: SignupFormValues) {
    const supabase = createClient();

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw error;
    }

    return authData;
  },

  async login(email: string, password: string) {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  async logout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  },
};
