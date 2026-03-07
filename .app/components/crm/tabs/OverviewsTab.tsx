"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCompanies } from "@/hooks/use-companies";
import {
  useCrmCountsQuery,
  useCrmTrendQuery,
  getCrmFiltersHash,
  useCrmRowsQuery,
} from "../workspace/queries/crm-workspace.queries";

type OverviewsTabProps = {
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
};

const CARD_CLASS = "rounded-xl border border-[#E9E9E7] bg-white p-5";
const PIPELINE_COLORS = ["#3b82f6", "#076c44", "#EA6113"];
const DONUT_COLORS = ["#94a3b8", "#475569"];
const SERIES = [
  { key: "customers", label: "Customers", color: PIPELINE_COLORS[0] },
  { key: "deals", label: "Deals", color: PIPELINE_COLORS[1] },
  { key: "activities", label: "Activities", color: PIPELINE_COLORS[2] },
] as const;

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function OverviewsTab({
  refreshNonce = 0,
  onRefreshStateChange,
}: OverviewsTabProps) {
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id ?? null;
  const filtersHash = useMemo(() => getCrmFiltersHash({ search: "" }), []);

  const countsQuery = useCrmCountsQuery(companyId, true);
  const trendQuery = useCrmTrendQuery(companyId, true);
  const customersQuery = useCrmRowsQuery(
    companyId
      ? {
          companyId,
          table: "customers",
          page: 1,
          pageSize: 50,
          search: "",
          filtersHash,
        }
      : null,
  );
  const dealsQuery = useCrmRowsQuery(
    companyId
      ? {
          companyId,
          table: "deals",
          page: 1,
          pageSize: 50,
          search: "",
          filtersHash,
        }
      : null,
  );
  const activitiesQuery = useCrmRowsQuery(
    companyId
      ? {
          companyId,
          table: "activities",
          page: 1,
          pageSize: 50,
          search: "",
          filtersHash,
        }
      : null,
  );

  const isPending =
    countsQuery.isPending ||
    trendQuery.isPending ||
    customersQuery.isPending ||
    dealsQuery.isPending ||
    activitiesQuery.isPending;

  const error =
    (countsQuery.error instanceof Error && countsQuery.error.message) ||
    (trendQuery.error instanceof Error && trendQuery.error.message) ||
    (customersQuery.error instanceof Error && customersQuery.error.message) ||
    (dealsQuery.error instanceof Error && dealsQuery.error.message) ||
    (activitiesQuery.error instanceof Error && activitiesQuery.error.message) ||
    null;

  useEffect(() => {
    if (!refreshNonce) return;
    onRefreshStateChange?.(true);
    void Promise.all([
      countsQuery.refetch(),
      trendQuery.refetch(),
      customersQuery.refetch(),
      dealsQuery.refetch(),
      activitiesQuery.refetch(),
    ]).finally(() => onRefreshStateChange?.(false));
  }, [
    activitiesQuery,
    countsQuery,
    trendQuery,
    customersQuery,
    dealsQuery,
    onRefreshStateChange,
    refreshNonce,
  ]);

  const customers = useMemo(
    () => customersQuery.data?.rows ?? [],
    [customersQuery.data?.rows],
  );
  const deals = useMemo(
    () => dealsQuery.data?.rows ?? [],
    [dealsQuery.data?.rows],
  );
  const activities = useMemo(
    () => activitiesQuery.data?.rows ?? [],
    [activitiesQuery.data?.rows],
  );
  const tableCounts = countsQuery.data;
  const chartCardRef = useRef<HTMLDivElement | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<
    "customers" | "deals" | "activities" | null
  >(null);

  useEffect(() => {
    if (!selectedSeries) return;
    const onDocumentPointerDown = (event: MouseEvent) => {
      if (!chartCardRef.current) return;
      if (chartCardRef.current.contains(event.target as Node)) return;
      setSelectedSeries(null);
    };
    document.addEventListener("mousedown", onDocumentPointerDown);
    return () =>
      document.removeEventListener("mousedown", onDocumentPointerDown);
  }, [selectedSeries]);

  const now = useMemo(() => new Date(), []);
  const pipelineSeries = useMemo(
    () => trendQuery.data ?? [],
    [trendQuery.data],
  );

  const customerTypeSeries = useMemo(() => {
    let company = 0;
    let person = 0;
    for (const row of customers) {
      const type = String(row.type ?? "").toLowerCase();
      if (type === "company") company += 1;
      else person += 1;
    }
    return [
      { name: "Company", value: company },
      { name: "Person", value: person },
    ];
  }, [customers]);

  const overdueActivities = useMemo(
    () =>
      activities
        .filter((row) => {
          if (row.completed_at) return false;
          const due = new Date(String(row.due_date ?? ""));
          return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
        })
        .slice(0, 6),
    [activities, now],
  );

  const upcomingActivities = useMemo(
    () =>
      activities
        .filter((row) => {
          if (row.completed_at) return false;
          const due = new Date(String(row.due_date ?? ""));
          return !Number.isNaN(due.getTime()) && due.getTime() >= now.getTime();
        })
        .sort(
          (a, b) =>
            new Date(String(a.due_date ?? "")).getTime() -
            new Date(String(b.due_date ?? "")).getTime(),
        )
        .slice(0, 6),
    [activities, now],
  );

  const recentlyClosedDeals = useMemo(
    () =>
      deals
        .filter((row) => {
          const stage = String(row.stage ?? "").toLowerCase();
          return stage === "closed_won" || stage === "closed_lost";
        })
        .sort(
          (a, b) =>
            new Date(String(b.updated_at ?? b.created_at ?? "")).getTime() -
            new Date(String(a.updated_at ?? a.created_at ?? "")).getTime(),
        )
        .slice(0, 6),
    [deals],
  );

  const totalCustomers = tableCounts?.customers ?? customers.length;
  const newCustomersCount = useMemo(
    () =>
      pipelineSeries.length
        ? pipelineSeries[pipelineSeries.length - 1].customers
        : 0,
    [pipelineSeries],
  );
  const newCustomersPercent =
    totalCustomers > 0 ? (newCustomersCount / totalCustomers) * 100 : 0;

  const wonDeals = useMemo(
    () =>
      deals.filter(
        (row) => String(row.stage ?? "").toLowerCase() === "closed_won",
      ).length,
    [deals],
  );

  const closedDeals = useMemo(
    () =>
      deals.filter((row) => {
        const stage = String(row.stage ?? "").toLowerCase();
        return stage === "closed_won" || stage === "closed_lost";
      }).length,
    [deals],
  );

  const winRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;

  const kpis = [
    {
      label: "Total Active Deals",
      value: String(tableCounts?.deals ?? deals.length),
      delta: "+8% vs last month",
      deltaTone: "text-emerald-600",
    },
    {
      label: "New Customers",
      value: `${newCustomersCount}`,
      delta: `of ${totalCustomers} customers  (+${newCustomersPercent.toFixed(1)}%)`,
      deltaTone: "text-emerald-600",
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      delta: winRate >= 50 ? "+3.4% vs last month" : "-2.1% vs last month",
      deltaTone: winRate >= 50 ? "text-emerald-600" : "text-red-600",
    },
    {
      label: "Overdue Activities",
      value: String(overdueActivities.length),
      delta: overdueActivities.length > 0 ? "Needs attention" : "All clear",
      deltaTone:
        overdueActivities.length > 0 ? "text-red-600" : "text-emerald-600",
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-6 overflow-y-auto pr-1">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={CARD_CLASS}>
            <p className="text-xs uppercase tracking-widest text-[#787774]">
              {kpi.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-[#37352F]">
              {isPending ? "..." : kpi.value}
            </p>
            <p className={`mt-2 text-xs font-semibold ${kpi.deltaTone}`}>
              {kpi.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div ref={chartCardRef} className={`${CARD_CLASS} lg:col-span-8`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#787774]">
              CRM Trend (6 months)
            </h3>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            {SERIES.map((series) => {
              const active = selectedSeries === series.key;
              const dimmed = selectedSeries !== null && !active;
              return (
                <button
                  key={series.key}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedSeries(active ? null : series.key);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                    active
                      ? "border-[#CBD5E1] bg-[#F8FAFC] font-bold text-[#1F2937]"
                      : "border-[#E5E7EB] bg-white text-[#4B5563]"
                  } ${dimmed ? "opacity-40" : ""}`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  {series.label}
                </button>
              );
            })}
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={pipelineSeries}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                onClick={() => setSelectedSeries(null)}
              >
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Line
                  type="monotone"
                  dataKey="customers"
                  name="Customers"
                  stroke={PIPELINE_COLORS[0]}
                  strokeWidth={selectedSeries === "customers" ? 3.5 : 2.5}
                  strokeOpacity={
                    selectedSeries && selectedSeries !== "customers" ? 0.2 : 1
                  }
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="deals"
                  name="Deals"
                  stroke={PIPELINE_COLORS[1]}
                  strokeWidth={selectedSeries === "deals" ? 3.5 : 2.5}
                  strokeOpacity={
                    selectedSeries && selectedSeries !== "deals" ? 0.2 : 1
                  }
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="activities"
                  name="Activities"
                  stroke={PIPELINE_COLORS[2]}
                  strokeWidth={selectedSeries === "activities" ? 3.5 : 2.5}
                  strokeOpacity={
                    selectedSeries && selectedSeries !== "activities" ? 0.2 : 1
                  }
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${CARD_CLASS} lg:col-span-4`}>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#787774]">
            Customer Mix
          </h3>
          <div className="flex h-[220px] items-center justify-center">
            <PieChart width={220} height={220}>
              <Pie
                data={customerTypeSeries}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={2}
              >
                {customerTypeSeries.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>
          <div className="mt-2 space-y-2">
            {customerTypeSeries.map((entry, index) => (
              <div
                key={entry.name}
                className="flex items-center justify-between text-xs font-semibold text-[#37352F]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        DONUT_COLORS[index % DONUT_COLORS.length],
                    }}
                  />
                  <span>{entry.name}</span>
                </div>
                <span>{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${CARD_CLASS} flex min-h-0 flex-col`}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#787774]">
            Overdue & Upcoming Activities
          </h3>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {[...overdueActivities, ...upcomingActivities]
              .slice(0, 8)
              .map((row) => {
                const dueLabel = row.due_date
                  ? new Date(String(row.due_date)).toLocaleString("en-US", {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "No due date";
                const type = String(row.activity_type ?? "task");
                const overdue =
                  !!row.due_date &&
                  new Date(String(row.due_date)).getTime() < now.getTime();
                return (
                  <Link
                    key={String(row.id)}
                    href={`/crm/activities?rowId=${encodeURIComponent(String(row.id))}`}
                    className="flex items-center justify-between rounded-lg border border-[#EFEFED] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#37352F]">
                        {String(row.subject ?? "Untitled activity")}
                      </p>
                      <p className="text-xs text-[#787774]">{dueLabel}</p>
                    </div>
                    <span
                      className={`ml-3 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${overdue ? "border-red-200 bg-red-50 text-red-600" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                    >
                      {type}
                    </span>
                  </Link>
                );
              })}
            {activities.length === 0 ? (
              <p className="text-sm text-[#787774]">No activity data yet.</p>
            ) : null}
          </div>
        </div>

        <div className={`${CARD_CLASS} flex min-h-0 flex-col`}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#787774]">
            Recently Closed Deals
          </h3>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {recentlyClosedDeals.map((row) => {
              const stage = String(row.stage ?? "").toLowerCase();
              const won = stage === "closed_won";
              return (
                <Link
                  key={String(row.id)}
                  href={`/crm/deals?rowId=${encodeURIComponent(String(row.id))}`}
                  className="flex items-center justify-between rounded-lg border border-[#EFEFED] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#37352F]">
                      {String(row.title ?? "Untitled deal")}
                    </p>
                    <p className="text-xs text-[#787774]">
                      {toNumber(row.value).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <span
                    className={`ml-3 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${won ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
                  >
                    {won ? "Closed Won" : "Closed Lost"}
                  </span>
                </Link>
              );
            })}
            {recentlyClosedDeals.length === 0 ? (
              <p className="text-sm text-[#787774]">No closed deals yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
