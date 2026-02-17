"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Package,
  MapPin,
  Navigation,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
  Box,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const SHIPMENTS_MOCK_DATA = [
  {
    id: "SHP-9001",
    cargo: "Industrial Turbines",
    origin: "Stockholm, SE",
    destination: "Hamburg, DE",
    eta: "2024-02-18",
    status: "In Transit",
    priority: "High",
    vehicle: "V-2001",
  },
  {
    id: "SHP-9002",
    cargo: "Precision Sensors",
    origin: "Munich, DE",
    destination: "Oslo, NO",
    eta: "2024-02-20",
    status: "Pending",
    priority: "Normal",
    vehicle: "V-2002",
  },
  {
    id: "SHP-9003",
    cargo: "Raw Steel Sheets",
    origin: "Genoa, IT",
    destination: "Berlin, DE",
    eta: "2024-02-15",
    status: "Delivered",
    priority: "Normal",
    vehicle: "V-2004",
  },
  {
    id: "SHP-9004",
    cargo: "Hazardous Chemicals",
    origin: "Antwerp, BE",
    destination: "Lyon, FR",
    eta: "2024-02-16",
    status: "Delayed",
    priority: "Critical",
    vehicle: "V-2003",
  },
];

export default function ShipmentsPage() {
  const [data, setData] = useState(SHIPMENTS_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Shipment ID",
        accessorKey: "id",
        cell: ({ row }: any) => (
          <span className="font-mono text-xs font-bold">{row.original.id}</span>
        ),
      },
      {
        header: "Cargo Type",
        accessorKey: "cargo",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <Box className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold">{row.original.cargo}</span>
          </div>
        ),
      },
      {
        header: "Origin/Dest",
        accessorKey: "route",
        cell: ({ row }: any) => (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest">
              <MapPin className="w-3 h-3" /> {row.original.origin}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Navigation className="w-3 h-3 text-primary" />{" "}
              {row.original.destination}
            </div>
          </div>
        ),
      },
      {
        header: "ETA",
        accessorKey: "eta",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">{row.original.eta}</span>
          </div>
        ),
      },
      {
        header: "Priority",
        accessorKey: "priority",
        cell: ({ row }: any) => {
          const p = row.original.priority;
          let variant: "default" | "success" | "warning" | "destructive" =
            "default";
          if (p === "High") variant = "warning";
          if (p === "Critical") variant = "destructive";

          return (
            <Badge
              variant={variant}
              className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase"
            >
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
          let variant: "default" | "success" | "warning" | "destructive" =
            "default";
          if (s === "In Transit") variant = "success";
          if (s === "Delivered") variant = "success";
          if (s === "Delayed") variant = "destructive";

          return (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  s === "In Transit"
                    ? "bg-emerald-500"
                    : s === "Delayed"
                      ? "bg-red-500"
                      : "bg-slate-300",
                )}
              />
              <span className="text-xs font-bold uppercase tracking-wide">
                {s}
              </span>
            </div>
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
      id: `SHP-${Math.floor(9000 + Math.random() * 900)}`,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            Cargo Shipments
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage active freight across the network.
          </p>
        </div>
        <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Shipment
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Live Shipment Log"
          description="Detailed tracking of all active and completed freight cycles."
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

import { cn } from "@/lib/utils";
