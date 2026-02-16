"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Users, Plus, ShieldCheck, Star, Award } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const DRIVERS_MOCK_DATA = [
  {
    id: "DRV-101",
    name: "Marcus Thorne",
    license: "CL-90082",
    rating: 4.9,
    experience: "12 Years",
    status: "On Trip",
    compliance: "Certified",
  },
  {
    id: "DRV-102",
    name: "Elena Rodriguez",
    license: "CL-44122",
    rating: 4.8,
    experience: "8 Years",
    status: "Standby",
    compliance: "Certified",
  },
  {
    id: "DRV-103",
    name: "Sam Wilson",
    license: "CL-55821",
    rating: 4.4,
    experience: "3 Years",
    status: "Off Duty",
    compliance: "Review Pending",
  },
];

export default function DriversPage() {
  const [data, setData] = useState(DRIVERS_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Driver Name",
        accessorKey: "name",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
              {row.original.name.charAt(0)}
            </div>
            <span className="font-semibold">{row.original.name}</span>
          </div>
        ),
      },
      {
        header: "License #",
        accessorKey: "license",
      },
      {
        header: "Experience",
        accessorKey: "experience",
      },
      {
        header: "Rating",
        accessorKey: "rating",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1.5 text-yellow-500 font-bold">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-sm">{row.original.rating}</span>
          </div>
        ),
      },
      {
        header: "Compliance",
        accessorKey: "compliance",
        cell: ({ row }: any) => {
          const status = row.original.compliance;
          return (
            <div className="flex items-center gap-1.5">
              {status === "Certified" ? (
                <ShieldCheck className="w-4 h-4 text-green-500" />
              ) : (
                <Award className="w-4 h-4 text-orange-400" />
              )}
              <span className="text-xs font-medium">{status}</span>
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
      id: `DRV-${Math.floor(100 + Math.random() * 900)}`,
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
          <h1 className="text-2xl font-bold tracking-tight">Fleet Drivers</h1>
          <p className="text-sm text-muted-foreground">
            Monitor safety compliance and performance ratings.
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Register Driver
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Personnel Directory"
          description="Certification status and career overview for all active operators."
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
