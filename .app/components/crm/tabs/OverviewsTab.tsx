"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCompanies } from "@/hooks/use-companies";
import { useCrmOverviewQuery } from "../workspace/queries/crm-workspace.queries";

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

const NOW_TS = Date.now();

const OverviewsCharts = dynamic(() => import("./OverviewsCharts"), {
  ssr: false,
  loading: () => (
    <>
      <div
        className={`${CARD_CLASS} lg:col-span-8 animate-pulse`}
        aria-hidden="true"
      >
        <div className="mb-4 h-4 w-40 rounded bg-[#EFEFED]" />
        <div className="mb-3 flex gap-2">
          <div className="h-7 w-28 rounded-full bg-[#F3F3F2]" />
          <div className="h-7 w-24 rounded-full bg-[#F3F3F2]" />
          <div className="h-7 w-28 rounded-full bg-[#F3F3F2]" />
        </div>
        <div className="h-[280px] rounded-lg bg-[#F8F8F7]" />
      </div>
      <div
        className={`${CARD_CLASS} lg:col-span-4 animate-pulse`}
        aria-hidden="true"
      >
        <div className="mb-4 h-4 w-28 rounded bg-[#EFEFED]" />
        <div className="mx-auto h-[220px] w-[220px] rounded-full bg-[#F8F8F7]" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-36 rounded bg-[#F3F3F2]" />
          <div className="h-4 w-28 rounded bg-[#F3F3F2]" />
        </div>
      </div>
    </>
  ),
});

export function OverviewsTab({
  refreshNonce = 0,
  onRefreshStateChange,
}: OverviewsTabProps) {
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id ?? null;

  // Single aggregated query replaces 5 separate queries
  const overviewQuery = useCrmOverviewQuery(companyId, true);

  const isPending = overviewQuery.isPending;
  const error =
    (overviewQuery.error instanceof Error && overviewQuery.error.message) ||
    null;

  // Refresh handler - simplified to single query
  useEffect(() => {
    if (!refreshNonce) return;
    onRefreshStateChange?.(true);
    void overviewQuery.refetch().finally(() => onRefreshStateChange?.(false));
  }, [overviewQuery, onRefreshStateChange, refreshNonce]);

  // Extract data from aggregated response
  const tableCounts = overviewQuery.data?.counts;
  const activities = useMemo(
    () => overviewQuery.data?.topActivities ?? [],
    [overviewQuery.data?.topActivities],
  );
  const deals = useMemo(
    () => overviewQuery.data?.recentDeals ?? [],
    [overviewQuery.data?.recentDeals],
  );
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

  const now = useMemo(() => new Date(NOW_TS), []);
  const pipelineSeries = useMemo(
    () => overviewQuery.data?.trend ?? [],
    [overviewQuery.data?.trend],
  );

  // Customer mix comes pre-calculated from server
  const customerTypeSeries = useMemo(() => {
    const mix = overviewQuery.data?.customerMix ?? { company: 0, person: 0 };
    return [
      { name: "Company", value: mix.company },
      { name: "Person", value: mix.person },
    ];
  }, [overviewQuery.data?.customerMix]);

  // Activities are already sorted by due_date from server (top 8)
  // Split into overdue vs upcoming based on current time
  const overdueActivities = useMemo(
    () =>
      activities.filter((row) => {
        const due = new Date(String(row.due_date ?? ""));
        return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
      }),
    [activities, now],
  );

  const upcomingActivities = useMemo(
    () =>
      activities.filter((row) => {
        const due = new Date(String(row.due_date ?? ""));
        return !Number.isNaN(due.getTime()) && due.getTime() >= now.getTime();
      }),
    [activities, now],
  );

  // Deals are already filtered and sorted server-side (top 6 closed deals)
  const recentlyClosedDeals = deals;

  const totalCustomers = tableCounts?.customers ?? 0;
  const totalDeals = tableCounts?.deals ?? 0;
  const newCustomersCount = useMemo(
    () =>
      pipelineSeries.length
        ? pipelineSeries[pipelineSeries.length - 1].customers
        : 0,
    [pipelineSeries],
  );
  const newCustomersPercent =
    totalCustomers > 0 ? (newCustomersCount / totalCustomers) * 100 : 0;

  // Calculate win rate from recently closed deals
  const wonDeals = useMemo(
    () =>
      recentlyClosedDeals.filter(
        (row) => String(row.stage ?? "").toLowerCase() === "closed_won",
      ).length,
    [recentlyClosedDeals],
  );

  const closedDeals = recentlyClosedDeals.length;
  const winRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;

  const kpis = [
    {
      label: "Total Active Deals",
      value: String(totalDeals),
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
        <OverviewsCharts
          cardClass={CARD_CLASS}
          chartCardRef={chartCardRef}
          pipelineSeries={pipelineSeries}
          customerTypeSeries={customerTypeSeries}
          donutColors={DONUT_COLORS}
          series={SERIES}
          selectedSeries={selectedSeries}
          onSelectSeries={setSelectedSeries}
        />
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
