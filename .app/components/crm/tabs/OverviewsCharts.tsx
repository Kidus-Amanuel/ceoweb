"use client";

import type { RefObject } from "react";
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

type SeriesKey = "customers" | "deals" | "activities";

type SeriesDef = {
  key: SeriesKey;
  label: string;
  color: string;
};

type OverviewsChartsProps = {
  cardClass: string;
  chartCardRef: RefObject<HTMLDivElement | null>;
  pipelineSeries: Array<Record<string, unknown>>;
  customerTypeSeries: { name: string; value: number }[];
  donutColors: string[];
  series: ReadonlyArray<SeriesDef>;
  selectedSeries: SeriesKey | null;
  onSelectSeries: (next: SeriesKey | null) => void;
};

export default function OverviewsCharts({
  cardClass,
  chartCardRef,
  pipelineSeries,
  customerTypeSeries,
  donutColors,
  series,
  selectedSeries,
  onSelectSeries,
}: OverviewsChartsProps) {
  return (
    <>
      <div ref={chartCardRef} className={`${cardClass} lg:col-span-8`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#787774]">
            CRM Trend (6 months)
          </h3>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {series.map((seriesItem) => {
            const active = selectedSeries === seriesItem.key;
            const dimmed = selectedSeries !== null && !active;
            return (
              <button
                key={seriesItem.key}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectSeries(active ? null : seriesItem.key);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                  active
                    ? "border-[#CBD5E1] bg-[#F8FAFC] font-bold text-[#1F2937]"
                    : "border-[#E5E7EB] bg-white text-[#4B5563]"
                } ${dimmed ? "opacity-40" : ""}`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: seriesItem.color }}
                />
                {seriesItem.label}
              </button>
            );
          })}
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={pipelineSeries}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              onClick={() => onSelectSeries(null)}
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
                stroke={series[0]?.color}
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
                stroke={series[1]?.color}
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
                stroke={series[2]?.color}
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

      <div className={`${cardClass} lg:col-span-4`}>
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
                  fill={donutColors[index % donutColors.length]}
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
                    backgroundColor: donutColors[index % donutColors.length],
                  }}
                />
                <span>{entry.name}</span>
              </div>
              <span>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
