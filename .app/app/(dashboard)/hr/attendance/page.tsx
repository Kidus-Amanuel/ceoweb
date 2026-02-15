"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Clock,
  MapPin,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const ATTENDANCE_MOCK_DATA = [
  {
    id: "ATT-001",
    employee: "Amanuel Mare",
    date: "2024-02-15",
    clock_in: "08:30 AM",
    clock_out: "05:30 PM",
    total_hours: "9h 00m",
    status: "On Time",
    location: "Main Office",
  },
  {
    id: "ATT-002",
    employee: "Jane Cooper",
    date: "2024-02-15",
    clock_in: "09:15 AM",
    clock_out: "06:15 PM",
    total_hours: "9h 00m",
    status: "Late",
    location: "Remote",
  },
  {
    id: "ATT-003",
    employee: "Cody Fisher",
    date: "2024-02-15",
    clock_in: "08:45 AM",
    clock_out: "05:45 PM",
    total_hours: "9h 00m",
    status: "On Time",
    location: "Main Office",
  },
];

export default function AttendancePage() {
  const [data, setData] = useState(ATTENDANCE_MOCK_DATA);

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
        header: "Date",
        accessorKey: "date",
      },
      {
        header: "Clock In",
        accessorKey: "clock_in",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <Clock className="w-3 h-3" />
            {row.original.clock_in}
          </div>
        ),
      },
      {
        header: "Clock Out",
        accessorKey: "clock_out",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 text-red-500 font-medium">
            <Clock className="w-3 h-3" />
            {row.original.clock_out}
          </div>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => {
          const isLate = row.original.status === "Late";
          return (
            <div className="flex items-center gap-1.5">
              {isLate ? (
                <XCircle className="w-3.5 h-3.5 text-orange-500" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              )}
              <Badge
                variant={isLate ? "warning" : "success"}
                className="text-[10px]"
              >
                {row.original.status}
              </Badge>
            </div>
          );
        },
      },
      {
        header: "Location",
        accessorKey: "location",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm">{row.original.location}</span>
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
      id: `ATT-${Math.floor(Math.random() * 1000)}`,
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
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Monitor daily clock-in/out records and location data.
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <CalendarDays className="w-4 h-4" /> Export Report
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Daily Attendance Log"
          description="Real-time employee presence and punctuality tracking."
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
