"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Users,
  UserPlus,
  Briefcase,
  Clock,
  BadgeDollarSign,
  TrendingUp,
  MoreHorizontal,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const HR_MOCK_DATA = [
  {
    id: "EMP-1001",
    name: "Amanuel Mare",
    email: "amanuel@ceo.com",
    department: "Engineering",
    position: "Software Engineer",
    hire_date: "2023-01-15",
    status: "Active",
    type: "Full-time",
  },
  {
    id: "EMP-1002",
    name: "Sarah Jenkins",
    email: "s.jenkins@ceo.com",
    department: "Design",
    position: "Product Designer",
    hire_date: "2023-03-20",
    status: "On Leave",
    type: "Full-time",
  },
  {
    id: "EMP-1003",
    name: "David Smith",
    email: "d.smith@ceo.com",
    department: "Marketing",
    position: "Growth Lead",
    hire_date: "2023-06-10",
    status: "Active",
    type: "Contract",
  },
  {
    id: "EMP-1004",
    name: "Lisa Wong",
    email: "l.wong@ceo.com",
    department: "Human Resources",
    position: "HR Manager",
    hire_date: "2022-11-05",
    status: "Active",
    type: "Full-time",
  },
];

export default function HRPage() {
  const [data, setData] = useState(HR_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Employee",
        accessorKey: "name",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs border border-orange-200">
              {row.original.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">
                {row.original.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {row.original.id}
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
        header: "Type",
        accessorKey: "type",
        cell: ({ row }: any) => (
          <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
            {row.original.type}
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
          if (status === "Active") variant = "success";
          if (status === "On Leave") variant = "warning";

          return (
            <Badge
              variant={variant}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            >
              {status}
            </Badge>
          );
        },
      },
      {
        header: "Hire Date",
        accessorKey: "hire_date",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="text-sm">{row.original.hire_date}</span>
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
      id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newItem.name || "New Employee",
      department: newItem.department || "General",
      position: newItem.position || "Staff",
      status: newItem.status || "Active",
      hire_date: new Date().toISOString().split("T")[0],
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
            <Users className="w-8 h-8 text-orange-500" />
            HR Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your workforce, payroll, and performance.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button
            size="sm"
            className="gap-2 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Onboard Employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
        {[
          {
            label: "Total Employees",
            value: "42",
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-50",
          },
          {
            label: "On Leave",
            value: "3",
            icon: Clock,
            color: "text-orange-500",
            bg: "bg-orange-50",
          },
          {
            label: "Open Positions",
            value: "5",
            icon: Briefcase,
            color: "text-green-500",
            bg: "bg-green-50",
          },
          {
            label: "Monthly Payroll",
            value: "$245.5k",
            icon: BadgeDollarSign,
            color: "text-purple-500",
            bg: "bg-purple-50",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-border/50 shadow-sm flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/50 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-xl">
        <EditableTable
          title="Staff Directory"
          description="View and manage all active, on-leave, and former employees."
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
