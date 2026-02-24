"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Navigation, ShieldCheck } from "lucide-react";

export default function VesselsPage() {
  const [data] = useState([
    {
      id: "V1",
      name: "Ever Grace",
      imo: "9832717",
      type: "Container Ship",
      flag: "Panama",
    },
    {
      id: "V2",
      name: "Maersk Atlantic",
      imo: "9731632",
      type: "Cargo",
      flag: "Denmark",
    },
  ]);
  const columns = useMemo(
    () => [
      { header: "Vessel Name", accessorKey: "name" },
      { header: "IMO Number", accessorKey: "imo" },
      { header: "Type", accessorKey: "type" },
      { header: "Flag", accessorKey: "flag" },
    ],
    [],
  );

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
        <Navigation className="w-6 h-6 text-indigo-500" /> Vessel Management
      </h1>
      <div className="bg-white rounded-3xl border border-border/50 overflow-hidden">
        <EditableTable
          title="Active Vessels"
          data={data}
          columns={columns}
          onUpdate={() => {}}
        />
      </div>
    </div>
  );
}
