"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { FileText, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/shared/ui/badge/Badge";

export default function CustomsPage() {
  const [data] = useState([
    {
      id: "CL1",
      shipment: "SH-10293",
      declaration: "DEC-99812",
      status: "Cleared",
      duty: "$1,200",
    },
    {
      id: "CL2",
      shipment: "SH-10294",
      declaration: "DEC-99813",
      status: "In Inspection",
      duty: "$2,450",
    },
  ]);
  const columns = useMemo(
    () => [
      { header: "Shipment", accessorKey: "shipment" },
      { header: "Declaration #", accessorKey: "declaration" },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => (
          <Badge
            variant={row.original.status === "Cleared" ? "success" : "warning"}
          >
            {row.original.status}
          </Badge>
        ),
      },
      { header: "Duty Amount", accessorKey: "duty" },
    ],
    [],
  );

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
        <FileText className="w-6 h-6 text-indigo-500" /> Customs & Compliance
      </h1>
      <div className="bg-white rounded-3xl border border-border/50 overflow-hidden">
        <EditableTable
          title="Customs Declarations"
          data={data}
          columns={columns}
          onUpdate={() => {}}
        />
      </div>
    </div>
  );
}
