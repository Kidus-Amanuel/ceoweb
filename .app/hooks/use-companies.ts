import { useUser } from "@/app/context/UserContext";
import { Company } from "@/lib/constants/nav-config";
import { useLayoutStore } from "@/store/layout-store";
import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type FetchCompaniesParams = {
  userId: string;
  userType: string;
  companyId?: string;
};

/**
 * Fetches companies for the authenticated user
 * - Super Admin: All companies they own
 * - Regular User: Only their assigned company
 */
async function fetchUserCompanies(
  params: FetchCompaniesParams,
): Promise<Company[]> {
  const supabase = createClient();
  let companies: any[] = [];

  if (params.userType === "super_admin") {
    // Super Admin: Fetch all companies where they are the owner
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, plan_id, plans(name)")
      .eq("owner_id", params.userId);

    if (error) throw error;
    companies = data || [];
  } else {
    // Regular User: Fetch only their assigned company from metadata
    if (params.companyId) {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, plan_id, plans(name)")
        .eq("id", params.companyId);

      if (error) throw error;
      companies = data || [];
    }
  }

  return companies.map((c: any) => ({
    id: c.id,
    name: c.name,
    type: (c.plans as any)?.name || "Starter",
  }));
}

export function useCompanies() {
  const { user, roleInfo, refreshUser } = useUser();
  const { selectedCompanyId, setSelectedCompanyId } = useLayoutStore();
  const queryClient = useQueryClient();

  // Extract user metadata
  const meta = user?.user_metadata || {};
  const userType = meta.user_type || meta.userType || "company_user";
  const metaCompanyId = meta.company_id || meta.companyId;

  // Fetch companies with React Query
  const companiesQuery = useQuery<Company[]>({
    queryKey: ["companies", user?.id, userType, metaCompanyId],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    queryFn: () =>
      fetchUserCompanies({
        userId: user!.id,
        userType,
        companyId: metaCompanyId,
      }),
  });

  const availableCompanies = companiesQuery.data ?? [];

  // Determine selected company
  const selectedCompany = useMemo(
    () =>
      availableCompanies.find((c) => c.id === selectedCompanyId) ||
      availableCompanies.find((c) => c.id === roleInfo?.company_id) ||
      availableCompanies[0] ||
      null,
    [availableCompanies, selectedCompanyId, roleInfo?.company_id],
  );

  // Sync selectedCompanyId if not set
  useEffect(() => {
    if (!selectedCompanyId && selectedCompany) {
      setSelectedCompanyId(selectedCompany.id);
    }
  }, [selectedCompany, selectedCompanyId, setSelectedCompanyId]);

  // Company switching mutation
  const switchCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      if (!user) throw new Error("User not authenticated");

      console.log(`[useCompanies] Switching to company: ${companyId}`);
      const supabase = createClient();

      // Update profile with new company context
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
      return companyId;
    },
    onMutate: async (companyId) => {
      // Optimistic update: immediately update local store
      setSelectedCompanyId(companyId);
    },
    onSuccess: async (companyId) => {
      // Refresh user context to get new roleInfo (plans, permissions, etc.)
      console.log("[useCompanies] Refreshing user context...");
      await refreshUser();

      // Invalidate companies query to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: ["companies"] });

      console.log("[useCompanies] User context refreshed.");
    },
    onError: (err, companyId, context) => {
      console.error("Error switching company:", err);
      // Note: Could rollback optimistic update here if needed
    },
  });

  const switchCompany = async (companyId: string) => {
    if (!user || switchCompanyMutation.isPending) return;
    await switchCompanyMutation.mutateAsync(companyId);
  };

  return {
    availableCompanies,
    selectedCompany,
    setSelectedCompany: switchCompany,
    isLoading: companiesQuery.isLoading || switchCompanyMutation.isPending,
    isSwitching: switchCompanyMutation.isPending,
  };
}
