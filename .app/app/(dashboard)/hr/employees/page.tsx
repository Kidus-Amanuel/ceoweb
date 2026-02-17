"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Users, UserPlus, Search, Download, Filter } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const EMPLOYEES_MOCK_DATA = [
  {
    id: "EMP-1001",
    name: "Amanuel Mare",
    email: "amanuel@ceo.com",
    department: "Engineering",
    position: "Software Engineer",
    salary: 85000,
    performance: "Exceeding",
    phone: "+1 555-1001",
  },
  {
    id: "EMP-1002",
    name: "Jane Cooper",
    email: "jane.c@ceo.com",
    department: "Marketing",
    position: "CMO",
    salary: 120000,
    performance: "Solid",
    phone: "+1 555-1002",
  },
  {
    id: "EMP-1003",
    name: "Cody Fisher",
    email: "cody.f@ceo.com",
    department: "Engineering",
    position: "Frontend Dev",
    salary: 75000,
    performance: "Developing",
    phone: "+1 555-1003",
  },
];

export default function EmployeesPage() {
  const [data, setData] = useState(EMPLOYEES_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              {row.original.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">{row.original.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {row.original.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: "Department",
        accessorKey: "department",
      },
      {
        header: "Position",
        accessorKey: "position",
      },
      {
        header: "Salary",
        accessorKey: "salary",
        cell: ({ row }: any) => (
          <span className="font-mono text-sm">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(row.original.salary)}
          </span>
        ),
      },
      {
        header: "Performance",
        accessorKey: "performance",
        cell: ({ row }: any) => {
          const perf = row.original.performance;
          let color = "bg-blue-100 text-blue-700";
          if (perf === "Exceeding") color = "bg-green-100 text-green-700";
          if (perf === "Developing") color = "bg-orange-100 text-orange-700";

          return (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${color}`}
            >
              {perf}
            </span>
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
      id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    setData([...data, itemWithId]);
  };

  const handleDelete = (id: string) => {
    setData(data.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Employees
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" className="gap-2">
            <UserPlus className="w-4 h-4" /> New Employee
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Full Employee List"
          description="Manage compensation, performance reviews, and contact details."
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
