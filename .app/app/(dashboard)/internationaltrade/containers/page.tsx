"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Box, Package, Archive } from "lucide-react";
import { Badge } from "@/components/shared/ui/badge/Badge";

export default function ContainersPage() {
  const [data] = useState([
    {
      id: "C1",
      number: "MSKU 192837",
      type: "40ft High Cube",
      shipment: "SH-10293",
      status: "Loaded",
    },
    {
      id: "C2",
      number: "CMAU 882711",
      type: "20ft Standard",
      shipment: "SH-10294",
      status: "Empty",
    },
  ]);
  const columns = useMemo(
    () => [
      { header: "Container ID", accessorKey: "number" },
      { header: "Type", accessorKey: "type" },
      { header: "Shipment", accessorKey: "shipment" },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => (
          <Badge
            variant={row.original.status === "Loaded" ? "success" : "default"}
          >
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
        <Box className="w-6 h-6 text-indigo-500" /> Container Tracking
      </h1>
      <div className="bg-white rounded-3xl border border-border/50 overflow-hidden">
        <EditableTable
          title="Container List"
          data={data}
          columns={columns}
          onUpdate={() => {}}
        />
      </div>
    </div>
  );
}
