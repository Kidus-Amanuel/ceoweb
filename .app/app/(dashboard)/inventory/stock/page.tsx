"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Plus, ArrowUpDown, History, ClipboardList } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const STOCK_MOCK_DATA = [
  {
    id: "S-101",
    sku: "SKU-1001",
    item: "Industrial Power Drill",
    warehouse: "Main Warehouse A",
    on_hand: 45,
    reserved: 10,
    available: 35,
    last_count: "2024-02-14",
  },
  {
    id: "S-102",
    sku: "SKU-1002",
    item: "Safety Helmet",
    warehouse: "East Hub",
    on_hand: 12,
    reserved: 0,
    available: 12,
    last_count: "2024-02-12",
  },
];

export default function StockPage() {
  const [data, setData] = useState(STOCK_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "SKU",
        accessorKey: "sku",
        cell: ({ row }: any) => (
          <span className="font-mono text-xs">{row.original.sku}</span>
        ),
      },
      {
        header: "Item Name",
        accessorKey: "item",
        cell: ({ row }: any) => (
          <span className="font-semibold">{row.original.item}</span>
        ),
      },
      {
        header: "Location",
        accessorKey: "warehouse",
      },
      {
        header: "On Hand",
        accessorKey: "on_hand",
      },
      {
        header: "Reserved",
        accessorKey: "reserved",
      },
      {
        header: "Available",
        accessorKey: "available",
        cell: ({ row }: any) => (
          <span className="font-bold text-primary">
            {row.original.available}
          </span>
        ),
      },
      {
        header: "Last Sync",
        accessorKey: "last_count",
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
      id: `S-${Math.floor(Math.random() * 1000)}`,
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
          <h1 className="text-2xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-sm text-muted-foreground">
            Manage precise quantities and location transfers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <History className="w-4 h-4" /> History
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add entry
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Stock Audit"
          description="Real-time availability tracking across all nodes."
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
