import { useUser } from "@/app/context/UserContext";
import { Company } from "@/lib/constants/nav-config";
import { useLayoutStore } from "@/store/layout-store";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useCompanies() {
  const { user } = useUser();
  const { selectedCompanyId, setSelectedCompanyId } = useLayoutStore();
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
            .select("id, name")
            .eq("owner_id", user.id);

          if (error) throw error;
          companies = data || [];
        } else {
          // Regular User: Fetch only their assigned company from metadata
          const companyId = meta.company_id || meta.companyId;

          if (companyId) {
            const { data, error } = await supabase
              .from("companies")
              .select("id, name")
              .eq("id", companyId);

            if (error) throw error;
            companies = data || [];
          }
        }

        if (companies.length > 0) {
          const mapped: Company[] = companies.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: "Enterprise",
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
    availableCompanies[0] ||
    null;

  // Sync selectedCompanyId if not set
  useEffect(() => {
    if (!selectedCompanyId && selectedCompany) {
      setSelectedCompanyId(selectedCompany.id);
    }
  }, [selectedCompany, selectedCompanyId, setSelectedCompanyId]);

  return {
    availableCompanies,
    selectedCompany,
    setSelectedCompany: (id: string) => setSelectedCompanyId(id),
    isLoading,
  };
}
