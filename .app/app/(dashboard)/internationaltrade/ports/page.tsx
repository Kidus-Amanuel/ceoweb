"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Anchor, MapPin } from "lucide-react";

export default function PortsPage() {
  const [data] = useState([
    {
      id: "P1",
      code: "CNSHG",
      name: "Shanghai Port",
      country: "China",
      type: "Sea",
    },
    {
      id: "P2",
      code: "SGSIN",
      name: "Singapore Port",
      country: "Singapore",
      type: "Sea",
    },
    {
      id: "P3",
      code: "NLRTM",
      name: "Port of Rotterdam",
      country: "Netherlands",
      type: "Sea",
    },
  ]);
  const columns = useMemo(
    () => [
      { header: "LOCODE", accessorKey: "code" },
      { header: "Port Name", accessorKey: "name" },
      { header: "Country", accessorKey: "country" },
      { header: "Type", accessorKey: "type" },
    ],
    [],
  );

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
        <Anchor className="w-6 h-6 text-indigo-500" /> Port Directory
      </h1>
      <div className="bg-white rounded-3xl border border-border/50 overflow-hidden">
        <EditableTable
          title="Global Port Registry"
          data={data}
          columns={columns}
          onUpdate={() => {}}
        />
      </div>
    </div>
  );
}
