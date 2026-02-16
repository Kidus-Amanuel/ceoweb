"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Package,
  Boxes,
  Truck,
  AlertOctagon,
  ArrowDownToLine,
  TrendingUp,
  Scale,
  Warehouse,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const INVENTORY_MOCK_DATA = [
  {
    id: "SKU-1001",
    name: "Industrial Power Drill",
    category: "Hardware",
    stock: 45,
    min_stock: 20,
    price: 129.99,
    status: "In Stock",
  },
  {
    id: "SKU-1002",
    name: "Standard Safety Helmet",
    category: "Safety Gear",
    stock: 12,
    min_stock: 50,
    price: 35.0,
    status: "Low Stock",
  },
  {
    id: "SKU-1003",
    name: "Hydraulic Jack 5T",
    category: "Machinery",
    stock: 0,
    min_stock: 5,
    price: 210.0,
    status: "Out of Stock",
  },
  {
    id: "SKU-1004",
    name: "Electric Saw Kit",
    category: "Hardware",
    stock: 82,
    min_stock: 15,
    price: 185.0,
    status: "In Stock",
  },
];

export default function InventoryPage() {
  const [data, setData] = useState(INVENTORY_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Product Detail",
        accessorKey: "name",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground">
                {row.original.name}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {row.original.id}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Category",
        accessorKey: "category",
        cell: ({ row }: any) => (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {row.original.category}
          </span>
        ),
      },
      {
        header: "Stock Level",
        accessorKey: "stock",
        cell: ({ row }: any) => {
          const stock = row.original.stock;
          const min = row.original.min_stock;
          const isLow = stock <= min && stock > 0;
          const isOut = stock === 0;

          return (
            <div className="flex flex-col gap-1.5 min-w-[100px]">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span
                  className={
                    isOut
                      ? "text-red-500"
                      : isLow
                        ? "text-orange-500"
                        : "text-emerald-600"
                  }
                >
                  {stock} Units
                </span>
                <span className="text-muted-foreground opacity-50">
                  Min: {min}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isOut
                      ? "bg-red-500"
                      : isLow
                        ? "bg-orange-500"
                        : "bg-emerald-500",
                  )}
                  style={{
                    width: `${Math.min((stock / (min * 2)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        },
      },
      {
        header: "Unit Price",
        accessorKey: "price",
        cell: ({ row }: any) => (
          <span className="font-mono text-sm font-bold text-foreground">
            ${row.original.price.toFixed(2)}
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
          if (status === "In Stock") variant = "success";
          if (status === "Low Stock") variant = "warning";
          if (status === "Out of Stock") variant = "destructive";

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
      id: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      status:
        newItem.stock > newItem.min_stock
          ? "In Stock"
          : newItem.stock > 0
            ? "Low Stock"
            : "Out of Stock",
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
            <Boxes className="w-8 h-8 text-purple-600" />
            Inventory Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time stock monitoring and warehouse logistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20"
          >
            <ArrowDownToLine className="w-4 h-4" /> Import Stock
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Warehouse className="w-4 h-4" /> Nodes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
        {[
          {
            label: "Total Items",
            value: "1,240",
            sub: "24 Categories",
            icon: Package,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Stock Value",
            value: "$42.5k",
            sub: "Estimated",
            icon: Scale,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Low Stock",
            value: "12",
            sub: "Requires Action",
            icon: AlertOctagon,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "Incoming",
            value: "3",
            sub: "Purchase Orders",
            icon: Truck,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-5 rounded-3xl bg-white border border-border/50 shadow-sm flex items-center gap-5 transition-all hover:shadow-md"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase opacity-40 tracking-[0.2em]">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-foreground leading-tight mt-0.5">
                {stat.value}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5 opacity-60">
                {stat.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[32px] overflow-hidden shadow-2xl p-1">
        <div className="bg-white rounded-[31px]">
          <EditableTable
            title="Master Inventory"
            description="Complete registry of all items across all connected warehouse nodes."
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

import { cn } from "@/lib/utils";
