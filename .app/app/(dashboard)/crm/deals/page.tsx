"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  BadgeDollarSign,
  TrendingUp,
  Calendar,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const DEALS_MOCK_DATA = [
  {
    id: "D-1001",
    title: "Enterprise License Renewal",
    customer: "TechCorp",
    value: 25000,
    stage: "Negotiation",
    probability: 80,
    close_date: "2024-03-15",
  },
  {
    id: "D-1002",
    title: "Global Supply Partnership",
    customer: "Global Inc",
    value: 120000,
    stage: "Proposal",
    probability: 40,
    close_date: "2024-04-01",
  },
  {
    id: "D-1003",
    title: "Q1 Consultant Project",
    customer: "Quantum Systems",
    value: 5000,
    stage: "Qualification",
    probability: 20,
    close_date: "2024-02-28",
  },
];

export default function DealsPage() {
  const [data, setData] = useState(DEALS_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Deal Title",
        accessorKey: "title",
        cell: ({ row }: any) => (
          <span className="font-semibold text-foreground">
            {row.original.title}
          </span>
        ),
      },
      {
        header: "Customer",
        accessorKey: "customer",
      },
      {
        header: "Value",
        accessorKey: "value",
        cell: ({ row }: any) => (
          <span className="text-sm font-bold text-primary">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(row.original.value)}
          </span>
        ),
      },
      {
        header: "Stage",
        accessorKey: "stage",
        cell: ({ row }: any) => {
          const stage = row.original.stage;
          let variant: "default" | "success" | "warning" | "destructive" =
            "default";
          if (stage === "Negotiation") variant = "warning";
          if (stage === "Proposal") variant = "default";
          if (stage === "Qualification") variant = "default";

          return (
            <Badge variant={variant} className="rounded-full">
              {stage}
            </Badge>
          );
        },
      },
      {
        header: "Probability",
        accessorKey: "probability",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${row.original.probability}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {row.original.probability}%
            </span>
          </div>
        ),
      },
      {
        header: "Expected Close",
        accessorKey: "close_date",
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
      id: `D-${Math.floor(Math.random() * 1000)}`,
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Deals
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your sales pipeline and forecasted revenue.
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <BadgeDollarSign className="w-4 h-4" />
          New Deal
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Sales Pipeline"
          description="Active opportunities and their current stages."
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
