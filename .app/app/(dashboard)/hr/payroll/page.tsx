"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  BadgeDollarSign,
  ArrowDownToLine,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const PAYROLL_MOCK_DATA = [
  {
    id: "PAY-001",
    employee: "Amanuel Mare",
    month: "February 2024",
    base_salary: 7083,
    bonus: 500,
    deductions: 1200,
    net_pay: 6383,
    status: "Processed",
  },
  {
    id: "PAY-002",
    employee: "Jane Cooper",
    month: "February 2024",
    base_salary: 10000,
    bonus: 2000,
    deductions: 2500,
    net_pay: 9500,
    status: "Processed",
  },
  {
    id: "PAY-003",
    employee: "Cody Fisher",
    month: "February 2024",
    base_salary: 6250,
    bonus: 0,
    deductions: 1000,
    net_pay: 5250,
    status: "Pending",
  },
];

export default function PayrollPage() {
  const [data, setData] = useState(PAYROLL_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Employee",
        accessorKey: "employee",
        cell: ({ row }: any) => (
          <span className="font-semibold">{row.original.employee}</span>
        ),
      },
      {
        header: "Period",
        accessorKey: "month",
      },
      {
        header: "Base Salary",
        accessorKey: "base_salary",
        cell: ({ row }: any) => `$${row.original.base_salary.toLocaleString()}`,
      },
      {
        header: "Net Pay",
        accessorKey: "net_pay",
        cell: ({ row }: any) => (
          <span className="font-bold text-green-600">
            ${row.original.net_pay.toLocaleString()}
          </span>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => {
          const status = row.original.status;
          return (
            <Badge variant={status === "Processed" ? "success" : "warning"}>
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
      id: `PAY-${Math.floor(Math.random() * 1000)}`,
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
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Process and view historical payroll records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-2">
            <CheckCircle2 className="w-4 h-4" /> Process Payroll
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Payroll History"
          description="Monthly breakdown of base pay, bonuses, and deductions."
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
