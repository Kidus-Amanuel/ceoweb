"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Users,
  UserPlus,
  Download,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const CRM_MOCK_DATA = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@techcorp.com",
    phone: "+1 (555) 123-4567",
    company: "TechCorp Solutions",
    status: "Active",
    assigned_to: "Sarah Miller",
    last_contact: "2024-02-10",
    value: 12500,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@quantum.io",
    phone: "+1 (555) 987-6543",
    company: "Quantum Systems",
    status: "Lead",
    assigned_to: "Michael Chen",
    last_contact: "2024-02-12",
    value: 5000,
  },
  {
    id: "3",
    name: "Robert Brown",
    email: "r.brown@globaltrade.net",
    phone: "+1 (555) 456-7890",
    company: "Global Trade Inc",
    status: "Prospect",
    assigned_to: "Sarah Miller",
    last_contact: "2024-02-08",
    value: 25000,
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily.d@starlight.co",
    phone: "+1 (555) 234-5678",
    company: "Starlight Media",
    status: "Churned",
    assigned_to: "David Wilson",
    last_contact: "2024-01-20",
    value: 0,
  },
  {
    id: "5",
    name: "Michael Ross",
    email: "m.ross@pearsonspecter.law",
    phone: "+1 (555) 321-4567",
    company: "Pearson Specter",
    status: "Active",
    assigned_to: "Michael Chen",
    last_contact: "2024-02-14",
    value: 45000,
  },
];

export default function CRMPage() {
  const [data, setData] = useState(CRM_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Contact Name",
        accessorKey: "name",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
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
        header: "Email",
        accessorKey: "email",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-3 h-3" />
            <span className="text-sm">{row.original.email}</span>
          </div>
        ),
      },
      {
        header: "Company",
        accessorKey: "company",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <Building2 className="w-3 h-3 text-muted-foreground" />
            <span className="text-sm font-medium">{row.original.company}</span>
          </div>
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
          if (status === "Lead") variant = "warning";
          if (status === "Churned") variant = "destructive";

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
        header: "Assigned To",
        accessorKey: "assigned_to",
        cell: ({ row }: any) => (
          <span className="text-sm font-medium text-foreground">
            {row.original.assigned_to}
          </span>
        ),
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
        header: "Last Contact",
        accessorKey: "last_contact",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="text-sm">{row.original.last_contact}</span>
          </div>
        ),
      },
      {
        id: "actions",
        cell: () => (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
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
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name || "New Contact",
      email: newItem.email || "new@example.com",
      status: newItem.status || "Lead",
      value: newItem.value || 0,
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
            <Users className="w-8 h-8 text-primary" />
            CRM Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer relationships and sales pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button size="sm" className="gap-2 shadow-lg shadow-primary/20">
            <UserPlus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="bg-white/50 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-xl">
        <EditableTable
          title="Customer Relationship Management"
          description="View and manage all customer interactions, leads, and active accounts."
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
