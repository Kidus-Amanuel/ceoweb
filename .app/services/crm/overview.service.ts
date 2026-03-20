import { SupabaseClient } from "@supabase/supabase-js";

type ServiceResult<T> = {
  data?: T;
  error?: string;
};

type MonthlyTrendPoint = {
  month: string;
  key: string;
  customers: number;
  deals: number;
  activities: number;
};

const shortMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short" });

export const overviewService = {
  async getTableCounts({
    supabase,
    companyId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
  }): Promise<
    ServiceResult<{ customers: number; deals: number; activities: number }>
  > {
    const [customersResult, dealsResult, activitiesResult] = await Promise.all([
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("deleted_at", null),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("deleted_at", null),
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("activity_type", "task")
        .is("completed_at", null)
        .is("deleted_at", null),
    ]);

    if (customersResult.error) return { error: customersResult.error.message };
    if (dealsResult.error) return { error: dealsResult.error.message };
    if (activitiesResult.error)
      return { error: activitiesResult.error.message };

    return {
      data: {
        customers: customersResult.count ?? 0,
        deals: dealsResult.count ?? 0,
        activities: activitiesResult.count ?? 0,
      },
    };
  },

  async getMonthlyTrend({
    supabase,
    companyId,
    months = 6,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    months?: number;
  }): Promise<ServiceResult<MonthlyTrendPoint[]>> {
    const safeMonths = Number.isFinite(months)
      ? Math.max(1, Math.min(24, Math.trunc(months)))
      : 6;
    const now = new Date();
    const monthBuckets = Array.from({ length: safeMonths }, (_, i) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (safeMonths - 1 - i),
        1,
      );
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        month: shortMonthLabel(date),
        key,
        customers: 0,
        deals: 0,
        activities: 0,
      };
    });
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - (safeMonths - 1),
      1,
      0,
      0,
      0,
      0,
    ).toISOString();
    const seed = new Map(monthBuckets.map((point) => [point.key, point]));

    const [customersRes, dealsRes, activitiesRes] = await Promise.all([
      supabase
        .from("customers")
        .select("created_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .gte("created_at", start),
      supabase
        .from("deals")
        .select("created_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .gte("created_at", start),
      supabase
        .from("activities")
        .select("created_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .gte("created_at", start),
    ]);

    if (customersRes.error) return { error: customersRes.error.message };
    if (dealsRes.error) return { error: dealsRes.error.message };
    if (activitiesRes.error) return { error: activitiesRes.error.message };

    for (const row of customersRes.data ?? []) {
      const createdAt = new Date(String(row.created_at ?? ""));
      if (Number.isNaN(createdAt.getTime())) continue;
      const bucket = seed.get(
        `${createdAt.getFullYear()}-${createdAt.getMonth()}`,
      );
      if (bucket) bucket.customers += 1;
    }
    for (const row of dealsRes.data ?? []) {
      const createdAt = new Date(String(row.created_at ?? ""));
      if (Number.isNaN(createdAt.getTime())) continue;
      const bucket = seed.get(
        `${createdAt.getFullYear()}-${createdAt.getMonth()}`,
      );
      if (bucket) bucket.deals += 1;
    }
    for (const row of activitiesRes.data ?? []) {
      const createdAt = new Date(String(row.created_at ?? ""));
      if (Number.isNaN(createdAt.getTime())) continue;
      const bucket = seed.get(
        `${createdAt.getFullYear()}-${createdAt.getMonth()}`,
      );
      if (bucket) bucket.activities += 1;
    }

    return { data: monthBuckets };
  },

  async getOverviewDashboard({
    supabase,
    companyId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
  }): Promise<
    ServiceResult<{
      counts: { customers: number; deals: number; activities: number };
      trend: MonthlyTrendPoint[];
      topActivities: Record<string, unknown>[];
      recentDeals: Record<string, unknown>[];
      customerMix: { company: number; person: number };
    }>
  > {
    const [
      countsResult,
      trendResult,
      activitiesResult,
      dealsResult,
      companyCountResult,
      personCountResult,
    ] = await Promise.all([
      this.getTableCounts({ supabase, companyId }),
      this.getMonthlyTrend({ supabase, companyId, months: 6 }),
      supabase
        .from("activities")
        .select("id,subject,due_date,activity_type")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .is("completed_at", null)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(6),
      supabase
        .from("deals")
        .select("id,title,value,stage,updated_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .in("stage", ["closed_won", "closed_lost"])
        .order("updated_at", { ascending: false })
        .limit(6),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("type", "company")
        .is("deleted_at", null),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("type", "person")
        .is("deleted_at", null),
    ]);

    if (countsResult.error) return { error: countsResult.error };
    if (trendResult.error) return { error: trendResult.error };
    if (activitiesResult.error)
      return { error: activitiesResult.error.message };
    if (dealsResult.error) return { error: dealsResult.error.message };
    if (companyCountResult.error)
      return { error: companyCountResult.error.message };
    if (personCountResult.error)
      return { error: personCountResult.error.message };

    return {
      data: {
        counts: countsResult.data!,
        trend: trendResult.data ?? [],
        topActivities: activitiesResult.data ?? [],
        recentDeals: dealsResult.data ?? [],
        customerMix: {
          company: companyCountResult.count ?? 0,
          person: personCountResult.count ?? 0,
        },
      },
    };
  },
};
