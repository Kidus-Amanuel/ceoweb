import { SupabaseClient } from "@supabase/supabase-js";
import {
  CRM_SEARCH_MATCH_LIMIT,
  CRM_TABLE_PAGE_SIZE_MAX,
} from "@/lib/constants/crm-pagination";
import type { CrmCreateRowInput, CrmUpdateRowInput } from "@/validators/crm";

type ServiceResult<T> = {
  data?: T;
  error?: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phonePattern = /^\+?[0-9 ()-]{7,}$/;
const digitsOnly = (value: string) => value.replace(/\D/g, "");
const isValidEmailAddress = (value: string) => emailPattern.test(value.trim());
const isValidPhoneNumber = (value: string) => {
  if (!phonePattern.test(value.trim())) return false;
  const digits = digitsOnly(value);
  return digits.length >= 7 && digits.length <= 15;
};

const buildPagedRange = (
  page: number,
  pageSize: number,
  maxPageSize: number,
) => {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(maxPageSize, Math.max(1, Math.trunc(pageSize)))
    : maxPageSize;
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  return { from, to };
};

const withoutUndefined = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildContactDisplay = (
  email: string | null | undefined,
  phone: string | null | undefined,
) => {
  const safeEmail = String(email ?? "").trim();
  const safePhone = String(phone ?? "").trim();
  if (safeEmail && safePhone) return `${safeEmail} - ${safePhone}`;
  return safeEmail || safePhone || "";
};

const resolveAndValidateDealContact = async ({
  supabase,
  companyId,
  standardData,
}: {
  supabase: SupabaseClient;
  companyId: string;
  standardData: Record<string, unknown>;
}): Promise<ServiceResult<Record<string, unknown>>> => {
  const rawContact = standardData.contact_id;
  if (rawContact === undefined || rawContact === null || rawContact === "") {
    return { data: standardData };
  }

  let contactId = String(rawContact).trim();
  if (!uuidPattern.test(contactId)) {
    if (!isValidEmailAddress(contactId) && !isValidPhoneNumber(contactId)) {
      return {
        error: "Contact must be a valid contact id, email, or phone number.",
      };
    }
    const byEmail = isValidEmailAddress(contactId);
    const contactLookup = byEmail
      ? await supabase
          .from("customer_contacts")
          .select("id")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .ilike("email", contactId)
          .maybeSingle()
      : await supabase
          .from("customer_contacts")
          .select("id")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .or(`phone.eq.${contactId},mobile.eq.${contactId}`)
          .maybeSingle();
    if (contactLookup.error) return { error: contactLookup.error.message };
    if (!contactLookup.data?.id) {
      return { error: "No contact found with the provided email or phone." };
    }
    contactId = contactLookup.data.id;
  }

  const { data: contact, error: contactError } = await supabase
    .from("customer_contacts")
    .select("id,customer_id,email,phone,mobile")
    .eq("company_id", companyId)
    .eq("id", contactId)
    .is("deleted_at", null)
    .maybeSingle();
  if (contactError) return { error: contactError.message };
  if (!contact) return { error: "Selected contact was not found." };

  const customerId = String(standardData.customer_id ?? "").trim();
  if (customerId && String(contact.customer_id) !== customerId) {
    return {
      error: "Selected contact does not belong to the selected customer.",
    };
  }

  const hasValidEmail =
    !!contact.email && isValidEmailAddress(String(contact.email));
  const hasValidPhone =
    (!!contact.phone && isValidPhoneNumber(String(contact.phone))) ||
    (!!contact.mobile && isValidPhoneNumber(String(contact.mobile)));
  if (!hasValidEmail && !hasValidPhone) {
    return { error: "Contact must have a valid email or phone number." };
  }

  return { data: { ...standardData, contact_id: contactId } };
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

export const mapDealStandard = (input: Record<string, unknown>) => ({
  customer_id: input.customerId ?? input.customer_id,
  contact_id: input.contactId ?? input.contact_id,
  title: input.title,
  description: input.description,
  value: input.value,
  stage: input.stage,
  probability: input.probability,
  expected_close_date: input.expectedCloseDate ?? input.expected_close_date,
  assigned_to: input.assignedTo ?? input.assigned_to,
});

export const enrichDealsContactDisplay = async ({
  supabase,
  companyId,
  rows,
}: {
  supabase: SupabaseClient;
  companyId: string;
  rows: Record<string, unknown>[];
}): Promise<ServiceResult<Record<string, unknown>[]>> => {
  const contactIds = Array.from(
    new Set(
      rows
        .map((row) => String(row.contact_id ?? ""))
        .filter((value) => !!value && uuidPattern.test(value)),
    ),
  );
  const customerIds = Array.from(
    new Set(
      rows
        .map((row) => String(row.customer_id ?? ""))
        .filter((value) => !!value && uuidPattern.test(value)),
    ),
  );

  const [contactsRes, customersRes] = await Promise.all([
    contactIds.length
      ? supabase
          .from("customer_contacts")
          .select("id,email,phone,mobile")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .in("id", contactIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            email: string | null;
            phone: string | null;
            mobile: string | null;
          }>,
          error: null,
        }),
    customerIds.length
      ? supabase
          .from("customers")
          .select("id,email,phone")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .in("id", customerIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            email: string | null;
            phone: string | null;
          }>,
          error: null,
        }),
  ]);

  if (contactsRes.error) return { error: contactsRes.error.message };
  if (customersRes.error) return { error: customersRes.error.message };

  const contactMap = new Map(
    (contactsRes.data ?? []).map((row) => [
      row.id,
      buildContactDisplay(row.email, row.mobile || row.phone),
    ]),
  );
  const customerMap = new Map(
    (customersRes.data ?? []).map((row) => [
      row.id,
      buildContactDisplay(row.email, row.phone),
    ]),
  );

  return {
    data: rows.map((row) => {
      const contactId = String(row.contact_id ?? "");
      const customerId = String(row.customer_id ?? "");
      const contactDisplay =
        (contactId ? contactMap.get(contactId) : "") ||
        (customerId ? customerMap.get(customerId) : "") ||
        "";
      return { ...row, contact_display: contactDisplay };
    }),
  };
};

export const dealService = {
  async listRows({
    supabase,
    companyId,
    page,
    pageSize,
    search,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<
    ServiceResult<{ data: Record<string, unknown>[]; count: number }>
  > {
    const { from, to } = buildPagedRange(
      page,
      pageSize,
      CRM_TABLE_PAGE_SIZE_MAX,
    );
    const searchTerm = search?.trim();

    if (!searchTerm) {
      const { data, error, count } = await supabase
        .from("deals")
        .select(
          "*, customer:customer_id(name), assigned_user:assigned_to(full_name,email)",
          { count: "exact" },
        )
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) return { error: error.message };
      const enriched = await enrichDealsContactDisplay({
        supabase,
        companyId,
        rows: (data ?? []) as Record<string, unknown>[],
      });
      if (enriched.error) return { error: enriched.error };
      return { data: { data: enriched.data ?? [], count: count ?? 0 } };
    }

    const q = `%${searchTerm}%`;
    const { data: matchedCustomers, error: matchedCustomersError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
        .limit(CRM_SEARCH_MATCH_LIMIT);

    if (matchedCustomersError) return { error: matchedCustomersError.message };

    const customerIds = (matchedCustomers ?? []).map((row) => row.id);
    const stageMatches = getMatchingDealStages(searchTerm);
    const orParts = [`title.ilike.${q}`, `description.ilike.${q}`];
    if (customerIds.length) {
      orParts.push(`customer_id.in.(${customerIds.join(",")})`);
    }
    stageMatches.forEach((stage) => orParts.push(`stage.eq.${stage}`));

    const { data, error, count } = await supabase
      .from("deals")
      .select(
        "*, customer:customer_id(name), assigned_user:assigned_to(full_name,email)",
        { count: "exact" },
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .or(orParts.join(","))
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return { error: error.message };
    const enriched = await enrichDealsContactDisplay({
      supabase,
      companyId,
      rows: (data ?? []) as Record<string, unknown>[],
    });
    if (enriched.error) return { error: enriched.error };
    return { data: { data: enriched.data ?? [], count: count ?? 0 } };
  },

  async createRow({
    supabase,
    companyId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    payload: Extract<CrmCreateRowInput, { table: "deals" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    let standardData = withoutUndefined(
      mapDealStandard(payload.standardData as Record<string, unknown>),
    );
    const resolved = await resolveAndValidateDealContact({
      supabase,
      companyId,
      standardData,
    });
    if (resolved.error) return { error: resolved.error };
    standardData = withoutUndefined(resolved.data ?? standardData);

    const { data, error } = await supabase
      .from("deals")
      .insert({
        company_id: companyId,
        ...standardData,
        ...(payload.customData !== undefined
          ? { custom_fields: payload.customData }
          : {}),
      })
      .select(
        "*, customer:customer_id(name), assigned_user:assigned_to(full_name,email)",
      )
      .single();

    if (error) return { error: error.message };
    const enriched = await enrichDealsContactDisplay({
      supabase,
      companyId,
      rows: [data as Record<string, unknown>],
    });
    if (enriched.error) return { error: enriched.error };
    return { data: enriched.data?.[0] };
  },

  async updateRow({
    supabase,
    companyId,
    rowId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    rowId: string;
    payload: Extract<CrmUpdateRowInput, { table: "deals" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    let standardData = withoutUndefined(
      mapDealStandard(payload.standardData as Record<string, unknown>),
    );
    const resolved = await resolveAndValidateDealContact({
      supabase,
      companyId,
      standardData,
    });
    if (resolved.error) return { error: resolved.error };
    standardData = withoutUndefined(resolved.data ?? standardData);

    let mergedCustomFields: Record<string, unknown> | undefined;
    if (payload.customData !== undefined) {
      const { data: existingRow, error: existingRowError } = await supabase
        .from("deals")
        .select(
          "*, customer:customer_id(name), assigned_user:assigned_to(full_name,email)",
        )
        .eq("id", rowId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (existingRowError) return { error: existingRowError.message };
      if (
        existingRow &&
        Object.prototype.hasOwnProperty.call(existingRow, "custom_fields")
      ) {
        mergedCustomFields = {
          ...asRecord((existingRow as Record<string, unknown>).custom_fields),
          ...asRecord(payload.customData),
        };
      }
    }

    let updatePayload = withoutUndefined({
      ...standardData,
      ...(mergedCustomFields !== undefined
        ? { custom_fields: mergedCustomFields }
        : {}),
    });

    if (Object.keys(updatePayload).length === 0) {
      updatePayload = { updated_at: new Date().toISOString() };
    }

    const expectedUpdatedAt =
      typeof payload.expectedUpdatedAt === "string"
        ? payload.expectedUpdatedAt
        : undefined;

    let query = supabase
      .from("deals")
      .update(updatePayload)
      .eq("id", rowId)
      .eq("company_id", companyId);

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data, error } = await query.select(
      "*, customer:customer_id(name), assigned_user:assigned_to(full_name,email)",
    );

    if (error) return { error: error.message };
    if (!data || data.length === 0) {
      return expectedUpdatedAt
        ? {
            error:
              "This row was updated by someone else. Refresh and retry your change.",
          }
        : { error: "Row not found." };
    }

    const enriched = await enrichDealsContactDisplay({
      supabase,
      companyId,
      rows: [data[0] as Record<string, unknown>],
    });
    if (enriched.error) return { error: enriched.error };
    return { data: enriched.data?.[0] };
  },

  async deleteRow({
    supabase,
    companyId,
    rowId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    rowId: string;
  }): Promise<ServiceResult<null>> {
    const relatedChecks = [
      {
        label: "quotes",
        run: () =>
          supabase
            .from("quotes")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("deal_id", rowId)
            .is("deleted_at", null),
      },
      {
        label: "activities",
        run: () =>
          supabase
            .from("activities")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("related_type", "deal")
            .eq("related_id", rowId)
            .is("deleted_at", null),
      },
    ];

    const relatedResults = await Promise.all(
      relatedChecks.map((check) => check.run()),
    );
    const dependencyError = relatedResults.find((result) => result.error);
    if (dependencyError?.error) return { error: dependencyError.error.message };

    const dependencies = relatedResults
      .map((result, index) => ({
        label: relatedChecks[index].label,
        count: result.count ?? 0,
      }))
      .filter((entry) => entry.count > 0);

    if (dependencies.length > 0) {
      return {
        error: `Cannot delete deal. Remove related data first: ${dependencies.map((entry) => `${entry.label} (${entry.count})`).join(", ")}.`,
      };
    }

    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", rowId)
      .eq("company_id", companyId);

    if (error) return { error: error.message };
    return { data: null };
  },

  async searchDealIds({
    supabase,
    companyId,
    search,
    customerIds,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    search: string;
    customerIds?: string[];
  }): Promise<ServiceResult<string[]>> {
    const q = `%${search}%`;
    const stageMatches = getMatchingDealStages(search);
    const orParts = [`title.ilike.${q}`, `description.ilike.${q}`];
    if (customerIds?.length) {
      orParts.push(`customer_id.in.(${customerIds.join(",")})`);
    }
    stageMatches.forEach((stage) => orParts.push(`stage.eq.${stage}`));

    const { data, error } = await supabase
      .from("deals")
      .select("id")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .or(orParts.join(","))
      .limit(CRM_SEARCH_MATCH_LIMIT);

    if (error) return { error: error.message };
    return { data: (data ?? []).map((row) => row.id) };
  },
};
