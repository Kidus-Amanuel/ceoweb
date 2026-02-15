"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Truck,
  Map,
  Settings,
  Activity,
  AlertTriangle,
  TrendingUp,
  Fuel,
  Wrench,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const FLEET_MOCK_DATA = [
  {
    id: "V-2001",
    model: "Freightliner Cascadia",
    plate: "ABC-1234",
    driver: "Marcus Thorne",
    status: "In Transit",
    fuel_level: 65,
    location: "En Route to Chicago",
  },
  {
    id: "V-2002",
    model: "Volvo VNL 860",
    plate: "XYZ-9876",
    driver: "Elena Rodriguez",
    status: "Idle",
    fuel_level: 42,
    location: "Dallas Logistics Center",
  },
  {
    id: "V-2003",
    model: "Kenworth T680",
    plate: "KWH-4567",
    driver: "Sam Wilson",
    status: "Maintenance",
    fuel_level: 15,
    location: "Service Bay 4",
  },
  {
    id: "V-2004",
    model: "Mack Anthem",
    plate: "MCK-0012",
    driver: "Unassigned",
    status: "Offline",
    fuel_level: 80,
    location: "Main Terminal",
  },
];

export default function FleetPage() {
  const [data, setData] = useState(FLEET_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Vehicle Info",
        accessorKey: "model",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground">
                {row.original.model}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {row.original.plate}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Assigned Driver",
        accessorKey: "driver",
        cell: ({ row }: any) => (
          <span
            className={
              row.original.driver === "Unassigned"
                ? "text-muted-foreground italic"
                : "font-medium"
            }
          >
            {row.original.driver}
          </span>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => {
          const status = row.original.status;
          let variant: "default" | "success" | "warning" | "destructive" =
            "default";
          if (status === "In Transit") variant = "success";
          if (status === "Maintenance") variant = "warning";
          if (status === "Offline") variant = "destructive";

          return (
            <Badge
              variant={variant}
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
            >
              {status}
            </Badge>
          );
        },
      },
      {
        header: "Fuel level",
        accessorKey: "fuel_level",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 w-16 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  row.original.fuel_level < 20 ? "bg-red-500" : "bg-blue-500",
                )}
                style={{ width: `${row.original.fuel_level}%` }}
              />
            </div>
            <span className="text-[10px] font-mono">
              {row.original.fuel_level}%
            </span>
          </div>
        ),
      },
      {
        header: "Current Location",
        accessorKey: "location",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Navigation className="w-3 h-3" />
            <span className="text-xs truncate max-w-[150px]">
              {row.original.location}
            </span>
          </div>
        ),
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
      id: `V-${Math.floor(2000 + Math.random() * 1000)}`,
      model: newItem.model || "New Truck",
      status: newItem.status || "Offline",
      fuel_level: newItem.fuel_level || 100,
    };
    setData([...data, itemWithId]);
  };

  const handleDelete = (id: string) => {
    setData(data.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-500" />
            Fleet Operations
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time status and logistics management of your global fleet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
          >
            <TrendingUp className="w-4 h-4" /> Optimization
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Map className="w-4 h-4" /> Live Map
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
        {[
          {
            label: "Active Vehicles",
            value: "24",
            sub: "8 In-transit",
            icon: Activity,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Fuel Consumption",
            value: "842L",
            sub: "Last 24h",
            icon: Fuel,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Service Alert",
            value: "3",
            sub: "Critical Issues",
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "Maintenance",
            value: "2",
            sub: "Scheduled",
            icon: Wrench,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-5 rounded-3xl bg-white border border-border/50 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] flex items-center gap-5 transition-transform hover:scale-[1.02]"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase opacity-60 tracking-widest">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-foreground leading-tight mt-0.5">
                {stat.value}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                {stat.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[32px] overflow-hidden shadow-2xl p-1">
        <div className="bg-white rounded-[31px]">
          <EditableTable
            title="Operational Fleet"
            description="Manage all vehicles, assignments, and real-time efficiency metrics."
            data={data}
            columns={columns}
            onUpdate={handleUpdate}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}

// Helper for class names
import { cn } from "@/lib/utils";
