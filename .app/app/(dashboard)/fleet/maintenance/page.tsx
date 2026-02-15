"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Wrench,
  CalendarClock,
  ClipboardList,
  AlertOctagon,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const MAINTENANCE_MOCK_DATA = [
  {
    id: "MT-3001",
    vehicle: "V-2003 (Kenworth T680)",
    service: "Engine Overhaul",
    cost: 4500,
    status: "In Progress",
    scheduled_for: "2024-02-14",
    priority: "High",
  },
  {
    id: "MT-3002",
    vehicle: "V-2001 (Freightliner)",
    service: "Oil Change & Inspection",
    cost: 450,
    status: "Completed",
    scheduled_for: "2024-02-10",
    priority: "Routine",
  },
  {
    id: "MT-3003",
    vehicle: "V-2002 (Volvo VNL)",
    service: "Tire Rotation",
    cost: 200,
    status: "Scheduled",
    scheduled_for: "2024-02-20",
    priority: "Routine",
  },
];

export default function MaintenancePage() {
  const [data, setData] = useState(MAINTENANCE_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Service ID",
        accessorKey: "id",
      },
      {
        header: "Vehicle",
        accessorKey: "vehicle",
        cell: ({ row }: any) => (
          <span className="font-semibold">{row.original.vehicle}</span>
        ),
      },
      {
        header: "Service Type",
        accessorKey: "service",
      },
      {
        header: "Est. Cost",
        accessorKey: "cost",
        cell: ({ row }: any) => (
          <span className="font-mono text-sm">${row.original.cost}</span>
        ),
      },
      {
        header: "Priority",
        accessorKey: "priority",
        cell: ({ row }: any) => {
          const p = row.original.priority;
          return (
            <Badge variant={p === "High" ? "destructive" : "default"}>
              {p}
            </Badge>
          );
        },
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => {
          const s = row.original.status;
          return (
            <Badge variant={s === "Completed" ? "success" : "warning"}>
              {s}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  const handleUpdate = (id: string, updatedFields: any) => {
    setData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updatedFields } : item,
      ),
    );
  };

  const handleAdd = (newItem: any) => {
    const itemWithId = {
      ...newItem,
      id: `MT-${Math.floor(3000 + Math.random() * 900)}`,
    };
    setData([...data, itemWithId]);
  };

  const handleDelete = (id: string) => {
    setData(data.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Maintenance Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Keep your assets in peak condition.
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <CalendarClock className="w-4 h-4" /> Schedule Service
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Service Schedule"
          description="Comprehensive log of all maintenance, repairs, and inspections."
          data={data}
          columns={columns}
          onUpdate={handleUpdate}
          onAdd={handleAdd}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
