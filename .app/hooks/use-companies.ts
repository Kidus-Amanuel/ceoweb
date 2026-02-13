import { useAuthStore } from "@/store/authStore";
import { MOCK_COMPANIES, Company } from "@/lib/constants/nav-config";
import { useLayoutStore } from "@/store/layout-store";
import { useEffect, useMemo } from "react";

export function useCompanies() {
  const { user } = useAuthStore();
  const { selectedCompanyId, setSelectedCompanyId } = useLayoutStore();

  const availableCompanies = useMemo(() => {
    if (!user) return [];

    if (user.userType === "super_admin") {
      // Super Admin sees all companies in their list
      return (user.companyIds || [])
        .map((id) => MOCK_COMPANIES[id])
        .filter(Boolean);
    } else {
      // Company User sees only their company
      const companyId = user.companyId;
      return companyId ? [MOCK_COMPANIES[companyId]].filter(Boolean) : [];
    }
  }, [user]);

  const selectedCompany = useMemo(() => {
    return (
      availableCompanies.find((c) => c.id === selectedCompanyId) ||
      availableCompanies[0] ||
      null
    );
  }, [availableCompanies, selectedCompanyId]);

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
  };
}
