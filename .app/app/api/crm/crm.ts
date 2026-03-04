"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { crmService } from "@/services/crm.service";
import {
  crmCompanyScopeSchema,
  crmCreateCustomFieldInputSchema,
  crmCreateRowInputSchema,
  crmDeleteCustomFieldInputSchema,
  crmDeleteRowInputSchema,
  crmEntityTypeSchema,
  crmTableViewInputSchema,
  crmUpdateCustomFieldInputSchema,
  crmUpdateRowInputSchema,
} from "@/validators/crm";
import { NAV_CONFIG } from "@/lib/constants/nav-config";

type ActionResult<T> = {
  success: boolean;
  error?: string;
  data?: T;
};

const dealStageValues = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

const normalizeSearchToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const getMatchingDealStages = (searchTerm: string) => {
  const token = normalizeSearchToken(searchTerm);
  if (!token) return [] as string[];
  return dealStageValues.filter((stage) => {
    const stageToken = stage.replace(/_/g, "");
    return stageToken.includes(token) || token.includes(stageToken);
  });
};

type AuthContext = {
  companyId: string;
  userId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

const zodErrorToText = (error: z.ZodError) =>
  error.issues
    .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
    .join(" | ");

async function getAuthContext(
  companyId: string,
): Promise<ActionResult<AuthContext>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const metadata = user.user_metadata || {};
  const isSuperAdmin =
    (metadata.user_type || metadata.userType) === "super_admin";

  const tenantContext = await crmService.resolveTenantContext({
    supabase,
    companyId,
    userId: user.id,
    isSuperAdmin,
  });

  if (tenantContext.error || !tenantContext.data) {
    return {
      success: false,
      error: tenantContext.error || "Company context unavailable",
    };
  }

  return {
    success: true,
    data: {
      companyId: tenantContext.data.companyId,
      userId: user.id,
      supabase,
    },
  };
}

export async function getCrmTablesAction(
  input: unknown,
): Promise<
  ActionResult<{ customers: number; deals: number; activities: number }>
> {
  const parsed = crmCompanyScopeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await crmService.getTableCounts({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
  });

  if (response.error || !response.data) {
    return {
      success: false,
      error: response.error || "Failed to load table counters",
    };
  }

  return { success: true, data: response.data };
}

export async function getCrmTableViewAction(input: unknown): Promise<
  ActionResult<{
    rows: Record<string, unknown>[];
    totalRows: number;
    users: { label: string; value: string }[];
    customers: { label: string; value: string }[];
    deals: { label: string; value: string }[];
    columnDefinitions: Record<string, unknown>[];
  }>
> {
  const parsed = crmTableViewInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const entityType =
    parsed.data.table === "customers"
      ? "customers"
      : parsed.data.table === "deals"
        ? "deals"
        : "activities";
  const needsUsers =
    parsed.data.table === "customers" || parsed.data.table === "deals";
  const needsCustomers =
    parsed.data.table === "deals" || parsed.data.table === "activities";
  const needsDeals = parsed.data.table === "activities";
  const effectivePageSize = 50;
  const emptySelectResult = {
    data: [] as { label: string; value: string }[],
    error: undefined as string | undefined,
  };
  const [rowsResult, columnsResult, usersResult, customersResult, dealsResult] =
    await Promise.all([
      crmService.listRows({
        supabase: auth.data.supabase,
        table: parsed.data.table,
        companyId: auth.data.companyId,
        page: parsed.data.page,
        pageSize: effectivePageSize,
        search: parsed.data.search,
      }),
      crmService.getColumnDefinitions({
        supabase: auth.data.supabase,
        companyId: auth.data.companyId,
        entityType,
      }),
      needsUsers
        ? crmService.listUsersForSelect({
            supabase: auth.data.supabase,
            companyId: auth.data.companyId,
            page: 1,
            pageSize: 500,
          })
        : Promise.resolve(emptySelectResult),
      needsCustomers
        ? crmService.listCustomersForSelect({
            supabase: auth.data.supabase,
            companyId: auth.data.companyId,
            page: 1,
            pageSize: 500,
          })
        : Promise.resolve(emptySelectResult),
      needsDeals
        ? crmService.listDealsForSelect({
            supabase: auth.data.supabase,
            companyId: auth.data.companyId,
            page: 1,
            pageSize: 500,
          })
        : Promise.resolve(emptySelectResult),
    ]);

  if (rowsResult.error) {
    return { success: false, error: rowsResult.error };
  }
  if (columnsResult.error) {
    return { success: false, error: columnsResult.error };
  }
  return {
    success: true,
    data: {
      rows: rowsResult.data?.data ?? [],
      totalRows: rowsResult.data?.count ?? 0,
      users: usersResult.error ? [] : (usersResult.data ?? []),
      customers: customersResult.error ? [] : (customersResult.data ?? []),
      deals: dealsResult.error ? [] : (dealsResult.data ?? []),
      columnDefinitions: (columnsResult.data ?? []) as Record<
        string,
        unknown
      >[],
    },
  };
}

export async function getCrmCustomFieldsAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>[]>> {
  const parsed = crmCompanyScopeSchema
    .extend({ entityType: crmEntityTypeSchema })
    .safeParse(input);

  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await crmService.listCustomFields({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    entityType: parsed.data.entityType,
  });

  if (response.error) {
    return { success: false, error: response.error };
  }

  return { success: true, data: response.data ?? [] };
}

export async function createCrmCustomFieldAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = crmCreateCustomFieldInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await crmService.createCustomField({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    payload: {
      entityType: parsed.data.entityType,
      fieldLabel: parsed.data.fieldLabel,
      fieldName: parsed.data.fieldName ?? "",
      fieldType: parsed.data.fieldType,
      fieldOptions: parsed.data.fieldOptions,
      isRequired: parsed.data.isRequired,
    },
  });

  if (response.error || !response.data) {
    return {
      success: false,
      error: response.error || "Failed to create custom field",
    };
  }

  return { success: true, data: response.data };
}

export async function updateCrmCustomFieldAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = crmUpdateCustomFieldInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await crmService.updateCustomField({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    fieldId: parsed.data.fieldId,
    payload: {
      entityType: parsed.data.entityType,
      fieldLabel: parsed.data.fieldLabel,
      fieldName: parsed.data.fieldName ?? "",
      fieldType: parsed.data.fieldType,
      fieldOptions: parsed.data.fieldOptions,
      isRequired: parsed.data.isRequired,
    },
  });

  if (response.error || !response.data) {
    return {
      success: false,
      error: response.error || "Failed to update custom field",
    };
  }

  return { success: true, data: response.data };
}

export async function deleteCrmCustomFieldAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = crmDeleteCustomFieldInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await crmService.deleteCustomField({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    fieldId: parsed.data.fieldId,
  });

  if (response.error) {
    return { success: false, error: response.error };
  }

  return { success: true, data: null };
}

export async function createCrmRowAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = crmCreateRowInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await crmService.createRow({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    userId: auth.data.userId,
    payload: parsed.data,
  });

  if (response.error || !response.data) {
    return { success: false, error: response.error || "Failed to create row" };
  }

  return { success: true, data: response.data };
}

export async function updateCrmRowAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = crmUpdateRowInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await crmService.updateRow({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    userId: auth.data.userId,
    payload: parsed.data,
    rowId: parsed.data.rowId,
  });

  if (response.error || !response.data) {
    return { success: false, error: response.error || "Failed to update row" };
  }

  return { success: true, data: response.data };
}

export async function deleteCrmRowAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = crmDeleteRowInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await crmService.deleteRow({
    supabase: auth.data.supabase,
    table: parsed.data.table,
    rowId: parsed.data.rowId,
    companyId: auth.data.companyId,
  });

  if (response.error) {
    return { success: false, error: response.error };
  }

  return { success: true, data: null };
}

export async function getGlobalSearchResultsAction(input: unknown): Promise<
  ActionResult<
    {
      id: string;
      title: string;
      subtitle?: string;
      href: string;
      category: string;
    }[]
  >
> {
  const parsed = z
    .object({
      query: z.string().trim().min(1),
      companyId: z.string().trim().optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const query = parsed.data.query.trim();
  const encodedQuery = encodeURIComponent(query);
  const q = `%${query}%`;

  const navHits = NAV_CONFIG.flatMap((item) => {
    const itemMatch = item.label.toLowerCase().includes(query.toLowerCase())
      ? [
          {
            id: `nav:${item.id}`,
            title: item.label,
            subtitle: "Module",
            href: item.href,
            category: "Navigation",
          },
        ]
      : [];
    const subMatches =
      item.subItems
        ?.filter((sub) => sub.label.toLowerCase().includes(query.toLowerCase()))
        .map((sub) => ({
          id: `nav:${sub.id}`,
          title: sub.label,
          subtitle: item.label,
          href: sub.href,
          category: "Navigation",
        })) ?? [];
    return [...itemMatch, ...subMatches];
  });

  if (!parsed.data.companyId) {
    return { success: true, data: navHits.slice(0, 20) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: true, data: navHits.slice(0, 20) };
  }

  const { supabase, companyId } = auth.data;
  const customersRes = await supabase
    .from("customers")
    .select("id,name,email")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
    .limit(12);

  const customerRows = customersRes.data ?? [];
  const matchedCustomerIds = customerRows.map((row) => row.id);
  const stageMatches = getMatchingDealStages(query);
  const dealTextOr = [`title.ilike.${q}`, `description.ilike.${q}`];
  stageMatches.forEach((stage) => dealTextOr.push(`stage.eq.${stage}`));
  const dealsTextRes = await supabase
    .from("deals")
    .select("id,title,stage,customer_id")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .or(dealTextOr.join(","))
    .limit(12);
  const dealsByCustomerRes = matchedCustomerIds.length
    ? await supabase
        .from("deals")
        .select("id,title,stage,customer_id")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .in("customer_id", matchedCustomerIds)
        .limit(12)
    : { data: [] as any[], error: null };

  const dealsMap = new Map<string, any>();
  [...(dealsTextRes.data ?? []), ...(dealsByCustomerRes.data ?? [])].forEach(
    (row) => dealsMap.set(row.id, row),
  );
  const dealsRows = Array.from(dealsMap.values());
  const matchedDealIds = dealsRows.map((row) => row.id);

  const [activitiesTextRes, activitiesByCustomerRes, activitiesByDealRes] =
    await Promise.all([
      supabase
        .from("activities")
        .select("id,subject,activity_type,status,related_type,related_id")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .or(`subject.ilike.${q},notes.ilike.${q},activity_type.ilike.${q}`)
        .limit(12),
      matchedCustomerIds.length
        ? supabase
            .from("activities")
            .select("id,subject,activity_type,status,related_type,related_id")
            .eq("company_id", companyId)
            .is("deleted_at", null)
            .eq("related_type", "customer")
            .in("related_id", matchedCustomerIds)
            .limit(12)
        : Promise.resolve({ data: [] as any[], error: null }),
      matchedDealIds.length
        ? supabase
            .from("activities")
            .select("id,subject,activity_type,status,related_type,related_id")
            .eq("company_id", companyId)
            .is("deleted_at", null)
            .eq("related_type", "deal")
            .in("related_id", matchedDealIds)
            .limit(12)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

  const customerLabelById = new Map(
    customerRows.map((row) => [row.id, row.name || "Unnamed Customer"]),
  );
  const dealLabelById = new Map(
    dealsRows.map((row) => [row.id, row.title || "Untitled Deal"]),
  );
  const activitiesMap = new Map<string, any>();
  [
    ...(activitiesTextRes.data ?? []),
    ...(activitiesByCustomerRes.data ?? []),
    ...(activitiesByDealRes.data ?? []),
  ].forEach((row) => activitiesMap.set(row.id, row));
  const activitiesRows = Array.from(activitiesMap.values());

  const crmHits = [
    ...customerRows.map((row) => ({
      id: `customer:${row.id}`,
      title: row.name || "Unnamed Customer",
      subtitle: row.email || "Customer",
      href: `/crm/customers?q=${encodedQuery}&rowId=${row.id}`,
      category: "Customers",
    })),
    ...dealsRows.map((row) => ({
      id: `deal:${row.id}`,
      title: row.title || "Untitled Deal",
      subtitle: customerLabelById.get(row.customer_id) || row.stage || "Deal",
      href: `/crm/deals?q=${encodedQuery}&rowId=${row.id}`,
      category: "Deals",
    })),
    ...activitiesRows.map((row) => {
      const relatedLabel =
        row.related_type === "customer"
          ? customerLabelById.get(row.related_id)
          : row.related_type === "deal"
            ? dealLabelById.get(row.related_id)
            : undefined;
      return {
        id: `activity:${row.id}`,
        title: row.subject || relatedLabel || "Untitled Activity",
        subtitle: `${row.activity_type || "activity"} • ${row.status || "pending"}`,
        href: `/crm/activities?q=${encodedQuery}&rowId=${row.id}`,
        category: "Activities",
      };
    }),
    {
      id: "report:crm",
      title: "CRM Reports",
      subtitle: "Summary and analytics",
      href: "/crm/reports",
      category: "Reports",
    },
  ];

  return { success: true, data: [...crmHits, ...navHits].slice(0, 60) };
}
