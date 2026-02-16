"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Truck, Plus, Phone, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const SUPPLIERS_MOCK_DATA = [
  {
    id: "SUP-101",
    name: "Industrial Tools Co.",
    contact: "Sven Andersson",
    email: "sven@indtools.se",
    category: "Hardware",
    rating: "Platinum",
    lead_time: "3-5 Days",
  },
  {
    id: "SUP-102",
    name: "Safety First AB",
    contact: "Karin Nilsson",
    email: "karin@safetyfirst.fi",
    category: "Safety Gear",
    rating: "Gold",
    lead_time: "7 Days",
  },
];

export default function SuppliersPage() {
  const [data, setData] = useState(SUPPLIERS_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Supplier Name",
        accessorKey: "name",
        cell: ({ row }: any) => (
          <span className="font-bold">{row.original.name}</span>
        ),
      },
      {
        header: "Category",
        accessorKey: "category",
      },
      {
        header: "Contact",
        accessorKey: "contact",
      },
      {
        header: "Email",
        accessorKey: "email",
      },
      {
        header: "Rating",
        accessorKey: "rating",
        cell: ({ row }: any) => {
          const rating = row.original.rating;
          return (
            <Badge variant={rating === "Platinum" ? "success" : "default"}>
              {rating}
            </Badge>
          );
        },
      },
      {
        header: "Lead Time",
        accessorKey: "lead_time",
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
      id: `SUP-${Math.floor(100 + Math.random() * 900)}`,
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
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor relationships and procurement efficiency.
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Vendor Directory"
          description="Complete list of verified suppliers and their performance metrics."
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
