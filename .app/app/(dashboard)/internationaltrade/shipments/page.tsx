"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Ship, Filter, Download, Plus } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const SHIPMENT_DATA = [
  {
    id: "S1",
    number: "SH-10293",
    customer: "Global Logistics Inc",
    status: "In Transit",
    origin: "Ningbo",
    destination: "London",
    eta: "2024-04-10",
  },
  {
    id: "S2",
    number: "SH-10294",
    customer: "EuroTrans GmbH",
    status: "Delivered",
    origin: "Singapore",
    destination: "Le Havre",
    eta: "2024-03-15",
  },
];

export default function ShipmentsPage() {
  const [data, setData] = useState(SHIPMENT_DATA);
  const columns = useMemo(
    () => [
      { header: "Shipment #", accessorKey: "number" },
      { header: "Customer", accessorKey: "customer" },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => (
          <Badge
            variant={
              row.original.status === "Delivered" ? "success" : "default"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
      { header: "Origin", accessorKey: "origin" },
      { header: "Destination", accessorKey: "destination" },
    ],
    [],
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            <Ship className="w-6 h-6 text-indigo-500" /> International Shipments
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Manage and track all international cargo movements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold"
          >
            <Plus className="w-4 h-4" /> New Shipment
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-3xl border border-border/50 overflow-hidden">
        <EditableTable
          title="Shipment Registry"
          data={data}
          columns={columns}
          onUpdate={() => {}}
        />
      </div>
    </div>
  );
}
