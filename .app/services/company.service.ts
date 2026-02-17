import { createClient } from "@/lib/supabase/client";

export const companyService = {
  async getCompanyDetails(companyId: string) {
    const supabase = createClient();
    return supabase.from("companies").select("*").eq("id", companyId).single();
  },

  async getCompanyStats(companyId: string) {
    const supabase = createClient();
    return supabase.rpc("get_company_stats", { p_company_id: companyId });
  },

  // Example for fetching modules enabled for the company
  async getEnabledModules(companyId: string) {
    // Logic would depend on how modules are associated with companies.
    // Assuming all modules are available to all companies for now based on schema
    // or filtering based on some company_settings table if it existed.
    const supabase = createClient();
    return supabase.from("modules").select("*").eq("is_active", true);
  },
};
