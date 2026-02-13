import { createClient } from "@/lib/supabase/client";

export const crmService = {
  async getCustomers(companyId: string) {
    const supabase = createClient();
    return supabase
      .from("customers")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
  },

  async createCustomer(data: any) {
    const supabase = createClient();
    return supabase.from("customers").insert(data).select().single();
  },

  async updateCustomer(id: string, updates: any) {
    const supabase = createClient();
    return supabase
      .from("customers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
  },

  async deleteCustomer(id: string) {
    const supabase = createClient();
    return supabase.from("customers").delete().eq("id", id);
  },
};
