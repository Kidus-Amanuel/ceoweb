import type { TableCounts } from "./crm-workspace.shared";

export function CrmReportsView({ tableCounts }: { tableCounts: TableCounts }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-[#787774]">
          Total Customers
        </p>
        <p className="mt-2 text-2xl font-semibold text-[#37352F]">
          {tableCounts.customers}
        </p>
      </div>
      <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-[#787774]">
          Active Deals
        </p>
        <p className="mt-2 text-2xl font-semibold text-[#37352F]">
          {tableCounts.deals}
        </p>
      </div>
      <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-[#787774]">
          Pending Activities
        </p>
        <p className="mt-2 text-2xl font-semibold text-[#37352F]">
          {tableCounts.activities}
        </p>
      </div>
    </div>
  );
}
