"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Truck, Plus, ArrowUpDown, LifeBuoy } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const VEHICLES_MOCK_DATA = [
  {
    id: "V-2101",
    model: "Ford Transporter",
    plate: "BT-990-XC",
    type: "Light Truck",
    year: 2022,
    odometer: "12,400 km",
    condition: "Excellent",
  },
  {
    id: "V-2102",
    model: "Mercedes Sprinter",
    plate: "MS-112-ZZ",
    type: "Van",
    year: 2021,
    odometer: "45,000 km",
    condition: "Good",
  },
  {
    id: "V-2103",
    model: "Tesla Semi",
    plate: "EL-550-EV",
    type: "Heavy Truck",
    year: 2023,
    odometer: "2,100 km",
    condition: "Like New",
  },
];

export default function VehiclesPage() {
  const [data, setData] = useState(VEHICLES_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Vehicle ID",
        accessorKey: "id",
        cell: ({ row }: any) => (
          <span className="font-mono text-xs font-bold">{row.original.id}</span>
        ),
      },
      {
        header: "Model",
        accessorKey: "model",
      },
      {
        header: "Plate",
        accessorKey: "plate",
      },
      {
        header: "Year",
        accessorKey: "year",
      },
      {
        header: "Odometer",
        accessorKey: "odometer",
      },
      {
        header: "Condition",
        accessorKey: "condition",
        cell: ({ row }: any) => {
          const cond = row.original.condition;
          return (
            <Badge
              variant={
                cond === "Excellent" || cond === "Like New"
                  ? "success"
                  : "default"
              }
            >
              {cond}
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
      id: `V-${Math.floor(2100 + Math.random() * 100)}`,
    };
    setData([...data, itemWithId]);
  };

  const handleDelete = (id: string) => {
    setData(data.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Vehicle Management
        </h1>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Vehicle
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Asset Registry"
          description="Detailed information for all physical assets in the fleet."
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
