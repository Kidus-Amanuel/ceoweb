"use client";

import { useMemo, useState } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Building2,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";

const CONTACTS_MOCK_DATA = [
  {
    id: "C-101",
    name: "John Doe",
    email: "john@techcorp.com",
    phone: "+1 555-0101",
    company: "TechCorp",
    role: "CTO",
    status: "Active",
  },
  {
    id: "C-102",
    name: "Alice Johnson",
    email: "alice@quantum.io",
    phone: "+1 555-0102",
    company: "Quantum Systems",
    role: "CEO",
    status: "Lead",
  },
  {
    id: "C-103",
    name: "Bob Wilson",
    email: "bob@global.net",
    phone: "+1 555-0103",
    company: "Global Inc",
    role: "HR Manager",
    status: "Active",
  },
];

export default function ContactsPage() {
  const [data, setData] = useState(CONTACTS_MOCK_DATA);

  const columns = useMemo(
    () => [
      {
        header: "Contact Name",
        accessorKey: "name",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
              {row.original.name.charAt(0)}
            </div>
            <span className="font-semibold text-foreground">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        header: "Job Title",
        accessorKey: "role",
      },
      {
        header: "Email",
        accessorKey: "email",
      },
      {
        header: "Company",
        accessorKey: "company",
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => {
          const status = row.original.status;
          return (
            <Badge
              variant={status === "Active" ? "success" : "default"}
              className="rounded-full"
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
      id: `C-${Math.floor(Math.random() * 1000)}`,
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
            <Users className="w-6 h-6 text-primary" />
            Contacts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your individual connections and leads.
          </p>
        </div>
        <Button size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          New Contact
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <EditableTable
          title="Contact Directory"
          description="A centralized list of all individuals in your CRM."
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
