"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Ship,
  Globe,
  Anchor,
  Activity,
  AlertCircle,
  TrendingUp,
  MapPin,
  Clock,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { cn } from "@/lib/utils";

const TRADE_MOCK_DATA = [
  {
    id: "SHP-7701",
    shipment_number: "SHP-7701",
    vessel: "Ever Grace",
    origin: "Shanghai Port (CNSHG)",
    destination: "Los Angeles (USLAX)",
    status: "In Transit",
    eta: "2024-03-25",
    progress: 65,
  },
  {
    id: "SHP-8802",
    shipment_number: "SHP-8802",
    vessel: "Maersk Atlantic",
    origin: "Rotterdam (NLRTM)",
    destination: "Dubai (AEJEA)",
    status: "Port Arrival",
    eta: "2024-03-20",
    progress: 100,
  },
  {
    id: "SHP-9903",
    shipment_number: "SHP-9903",
    vessel: "CMA CGM Marco Polo",
    origin: "Singapore (SGSIN)",
    destination: "Hamburg (DEHAM)",
    status: "Customs Hold",
    eta: "2024-04-02",
    progress: 85,
  },
  {
    id: "SHP-4404",
    shipment_number: "SHP-4404",
    vessel: "HMM Algeciras",
    origin: "Busan (KRPUS)",
    destination: "Savannah (USSAV)",
    status: "Planned",
    eta: "2024-04-15",
    progress: 5,
  },
];

export default function InternationalTradePage() {
  const [data, setData] = useState(TRADE_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Shipment Details",
        accessorKey: "shipment_number",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
              <Ship className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground">
                {row.original.shipment_number}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {row.original.vessel}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Route (Origin -> Dest)",
        accessorKey: "origin",
        cell: ({ row }: any) => (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">{row.original.origin}</span>
            <div className="flex items-center gap-1">
              <div className="h-0.5 w-4 bg-muted-foreground/30" />
              <Navigation className="w-2.5 h-2.5 text-indigo-400 rotate-90" />
            </div>
            <span className="text-xs text-muted-foreground">
              {row.original.destination}
            </span>
          </div>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => {
          const status = row.original.status;
          let variant: "default" | "success" | "warning" | "destructive" =
            "default";
          if (status === "Port Arrival") variant = "success";
          if (status === "Customs Hold") variant = "destructive";
          if (status === "In Transit") variant = "default";
          if (status === "Planned") variant = "warning";

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
        header: "Voyage Progress",
        accessorKey: "progress",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 w-16 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full bg-indigo-500",
                  row.original.status === "Customs Hold" && "bg-red-500",
                )}
                style={{ width: `${row.original.progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono">
              {row.original.progress}%
            </span>
          </div>
        ),
      },
      {
        header: "ETA",
        accessorKey: "eta",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{row.original.eta}</span>
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
      id: `SHP-${Math.floor(7000 + Math.random() * 1000)}`,
      shipment_number: newItem.shipment_number || "SHP-NEW",
      status: newItem.status || "Planned",
      progress: newItem.progress || 0,
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
            <Globe className="w-8 h-8 text-indigo-500" />
            Global Trade Operations
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor international shipments, vessels, and customs status in
            real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
          >
            <TrendingUp className="w-4 h-4" /> Market Analytics
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Anchor className="w-4 h-4" /> Port Map
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
        {[
          {
            label: "Total Shipments",
            value: "142",
            sub: "24 New this week",
            icon: Ship,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "Port Statistics",
            value: "18",
            sub: "Active Hubs",
            icon: MapPin,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Customs Alerts",
            value: "2",
            sub: "Requires Attention",
            icon: AlertCircle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "Live Vessels",
            value: "45",
            sub: "En Route",
            icon: Activity,
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
            title="Active Global Logistics"
            description="End-to-end tracking of international cargo and vessel movements."
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
