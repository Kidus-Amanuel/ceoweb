import {
  LayoutDashboard,
  Truck,
  Users,
  Package,
  Settings,
  UserCircle,
  Building2,
  BarChart3,
  ClipboardList,
  Wallet,
  Clock,
  UserPlus,
  Compass,
  Ship,
  Anchor,
  Globe,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface Company {
  id: string;
  name: string;
  type: string;
}

export const MOCK_COMPANIES: Record<string, Company> = {
  comp_1023: { id: "comp_1023", name: "ABC PLC", type: "Manufacturing" },
  comp_8891: { id: "comp_8891", name: "XYZ Trading", type: "Retail" },
};

export interface NavSubItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  iconClassName?: string;
  permissions?: string[]; // e.g., ['view', 'edit']
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
  href: string;
  badge?: number;
  roles?: ("super_admin" | "company_user")[];
  module?: string;
  subItems?: NavSubItem[];
}

export const NAV_CONFIG: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    iconClassName: "text-sky-500",
    href: "/dashboard",
    roles: ["super_admin", "company_user"],
  },
  {
    id: "admin",
    label: "Platform Admin",
    icon: Building2,
    iconClassName: "text-violet-500",
    href: "/admin",
    roles: ["super_admin"],
  },
  {
    id: "fleet",
    label: "Fleet Management",
    icon: Truck,
    iconClassName: "text-emerald-500",
    href: "/fleet",
    module: "Fleet",
    roles: ["super_admin", "company_user"],
    subItems: [
      {
        id: "fleet-overview",
        label: "Overview",
        href: "/fleet",
        icon: Compass,
        iconClassName: "text-cyan-500",
      },
      {
        id: "fleet-shipments",
        label: "Shipments",
        href: "/fleet/shipments",
        icon: Ship,
        iconClassName: "text-blue-500",
      },
      {
        id: "fleet-vehicles",
        label: "Vehicles",
        href: "/fleet/vehicles",
        icon: Truck,
        iconClassName: "text-emerald-500",
      },
      {
        id: "fleet-drivers",
        label: "Drivers",
        href: "/fleet/drivers",
        icon: UserPlus,
        iconClassName: "text-indigo-500",
      },
      {
        id: "fleet-maintenance",
        label: "Maintenance",
        href: "/fleet/maintenance",
        icon: Anchor,
        iconClassName: "text-amber-500",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: Users,
    iconClassName: "text-blue-500",
    href: "/crm/reports",
    module: "CRM",
    roles: ["super_admin", "company_user"],
    subItems: [
      {
        id: "reports",
        label: "Overview",
        href: "/crm/reports",
        icon: BarChart3,
        iconClassName: "text-purple-500",
      },
      {
        id: "customers",
        label: "Customers",
        href: "/crm/customers",
        icon: Users,
        iconClassName: "text-blue-500",
      },
      {
        id: "deals",
        label: "Deals",
        href: "/crm/deals",
        icon: ClipboardList,
        iconClassName: "text-green-500",
      },
      {
        id: "activities",
        label: "Activities",
        href: "/crm/activities",
        icon: Clock,
        iconClassName: "text-amber-500",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    iconClassName: "text-orange-500",
    href: "/inventory",
    module: "Inventory",
    roles: ["super_admin", "company_user"],
    subItems: [
      {
        id: "inv-stock",
        label: "Stock Level",
        href: "/inventory/stock",
        icon: Package,
        iconClassName: "text-orange-500",
      },
      {
        id: "inv-warehouses",
        label: "Warehouses",
        href: "/inventory/warehouses",
        icon: Building2,
        iconClassName: "text-slate-500",
      },
      {
        id: "inv-suppliers",
        label: "Suppliers",
        href: "/inventory/suppliers",
        icon: Globe,
        iconClassName: "text-lime-500",
      },
    ],
  },
  {
    id: "hr",
    label: "HR Module",
    icon: UserCircle,
    iconClassName: "text-pink-500",
    href: "/hr",
    module: "HR",
    roles: ["super_admin", "company_user"],
    subItems: [
      {
        id: "hr-employees",
        label: "Employees",
        href: "/hr/employees",
        icon: Users,
        iconClassName: "text-pink-500",
      },
      {
        id: "hr-payroll",
        label: "Payroll",
        href: "/hr/payroll",
        icon: Wallet,
        iconClassName: "text-emerald-500",
      },
      {
        id: "hr-attendance",
        label: "Attendance",
        href: "/hr/attendance",
        icon: Clock,
        iconClassName: "text-amber-500",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    iconClassName: "text-emerald-500",
    href: "/finance",
    module: "Finance",
    roles: ["super_admin", "company_user"],
    subItems: [
      {
        id: "fin-invoices",
        label: "Invoices",
        href: "/finance/invoices",
        icon: ClipboardList,
        iconClassName: "text-sky-500",
      },
      {
        id: "fin-expenses",
        label: "Expenses",
        href: "/finance/expenses",
        icon: Wallet,
        iconClassName: "text-rose-500",
      },
      {
        id: "fin-reports",
        label: "Financial Reports",
        href: "/finance/reports",
        icon: BarChart3,
        iconClassName: "text-purple-500",
      },
    ],
  },
  {
    id: "trade",
    label: "International Trade",
    icon: Ship,
    iconClassName: "text-cyan-500",
    href: "/internationaltrade",
    module: "trade",
    roles: ["super_admin", "company_user"],
    subItems: [
      {
        id: "trade-shipments",
        label: "Shipments",
        href: "/internationaltrade/shipments",
        icon: Ship,
        iconClassName: "text-blue-500",
      },
      {
        id: "trade-containers",
        label: "Containers",
        href: "/internationaltrade/containers",
        icon: Package,
        iconClassName: "text-orange-500",
      },
      {
        id: "trade-ports",
        label: "Ports",
        href: "/internationaltrade/ports",
        icon: Anchor,
        iconClassName: "text-teal-500",
      },
      {
        id: "trade-vessels",
        label: "Vessels",
        href: "/internationaltrade/vessels",
        icon: Ship,
        iconClassName: "text-cyan-500",
      },
      {
        id: "trade-clearance",
        label: "Customs Clearance",
        href: "/internationaltrade/clearance",
        icon: Compass,
        iconClassName: "text-violet-500",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    iconClassName: "text-slate-500",
    href: "/settings",
    roles: ["super_admin", "company_user"],
  },
];
