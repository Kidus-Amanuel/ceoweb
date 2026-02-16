"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { MapPin, Warehouse, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const WAREHOUSE_MOCK_DATA = [
  {
    id: "WH-001",
    name: "Main Warehouse A",
    location: "Stockholm, Sweden",
    capacity: "85%",
    manager: "Sven Olsen",
    status: "Active",
    type: "Central Distribution",
  },
  {
    id: "WH-002",
    name: "East Hub",
    location: "Helsinki, Finland",
    capacity: "42%",
    manager: "Liisa Korhonen",
    status: "Active",
    type: "Regional Hub",
  },
  {
    id: "WH-003",
    name: "Cold Storage North",
    location: "Kiruna, Sweden",
    capacity: "12%",
    manager: "Erik Berg",
    status: "Under Maintenance",
    type: "Specialized",
  },
];

export default function WarehousesPage() {
  const [data, setData] = useState(WAREHOUSE_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Warehouse Name",
        accessorKey: "name",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <Warehouse className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold">{row.original.name}</span>
          </div>
        ),
      },
      {
        header: "Location",
        accessorKey: "location",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {row.original.location}
          </div>
        ),
      },
      {
        header: "Type",
        accessorKey: "type",
      },
      {
        header: "Capacity",
        accessorKey: "capacity",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: row.original.capacity }}
              />
            </div>
            <span className="text-xs font-bold">{row.original.capacity}</span>
          </div>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => {
          const status = row.original.status;
          return (
            <Badge variant={status === "Active" ? "success" : "warning"}>
              {status}
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
      id: `WH-${Math.floor(100 + Math.random() * 900)}`,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Warehouses
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor capacity and logistics flow across nodes.
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Zap className="w-4 h-4" /> Optimise Flow
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Node Registry"
          description="Management of all physical storage and distribution facilities."
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
