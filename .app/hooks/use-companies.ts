import { useUser } from "@/app/context/UserContext";
import { Company } from "@/lib/constants/nav-config";
import { useLayoutStore } from "@/store/layout-store";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useCompanies() {
  const { user, roleInfo, refreshUser } = useUser();
  const { selectedCompanyId, setSelectedCompanyId } = useLayoutStore();
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    async function fetchCompanies() {
      if (!user) {
        setAvailableCompanies([]);
        return;
      }

      const meta = user.user_metadata || {};
      const userType = meta.user_type || meta.userType || "company_user";

      setIsLoading(true);
      const supabase = createClient();

      try {
        let companies: any[] = [];

        if (userType === "super_admin") {
          // Super Admin: Fetch all companies where they are the owner
          const { data, error } = await supabase
            .from("companies")
            .select("id, name, plan_id, plans(name)")
            .eq("owner_id", user.id);

          if (error) throw error;
          companies = data || [];
        } else {
          // Regular User: Fetch only their assigned company from metadata
          const companyId = meta.company_id || meta.companyId;

          if (companyId) {
            const { data, error } = await supabase
              .from("companies")
              .select("id, name, plan_id, plans(name)")
              .eq("id", companyId);

            if (error) throw error;
            companies = data || [];
          }
        }

        if (companies.length > 0) {
          const mapped: Company[] = companies.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: (c.plans as any)?.name || "Starter",
          }));
          setAvailableCompanies(mapped);
        } else {
          setAvailableCompanies([]);
        }
      } catch (err) {
        console.error("Error in useCompanies:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanies();
  }, [user]);

  const selectedCompany =
    availableCompanies.find((c) => c.id === selectedCompanyId) ||
    availableCompanies.find((c) => c.id === roleInfo?.company_id) ||
    availableCompanies[0] ||
    null;

  // Sync selectedCompanyId if not set or mismatched with roleInfo (if not super_admin, we follow roleInfo)
  useEffect(() => {
    if (!selectedCompanyId && selectedCompany) {
      setSelectedCompanyId(selectedCompany.id);
    }
  }, [selectedCompany, selectedCompanyId, setSelectedCompanyId]);

  const switchCompany = async (companyId: string) => {
    if (!user || isSwitching) return;

    console.log(`[useCompanies] Switching to company: ${companyId}`);
    setIsSwitching(true);
    const supabase = createClient();

    try {
      // For Super Admin, we update the organization context in the profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("id", user.id);

      if (error) {
        console.error("[useCompanies] Failed to update profile:", error);
        throw error;
      }

      console.log(
        `[useCompanies] Profile updated successfully to ${companyId}`,
      );

      // Update local store
      setSelectedCompanyId(companyId);

      // Refresh UserContext to get new roleInfo (plans, permissions, etc.)
      console.log("[useCompanies] Refreshing user context...");
      await refreshUser();
      console.log("[useCompanies] User context refreshed.");
    } catch (err) {
      console.error("Error switching company:", err);
    } finally {
      setIsSwitching(false);
    }
  };

  return {
    availableCompanies,
    selectedCompany,
    setSelectedCompany: switchCompany,
    isLoading: isLoading || isSwitching,
    isSwitching,
  };
}
