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
  permissions?: string[]; // e.g., ['view', 'edit']
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
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
    href: "/dashboard",
    roles: ["super_admin", "company_user"],
  },
  {
    id: "admin",
    label: "Platform Admin",
    icon: Building2,
    href: "/admin",
    roles: ["super_admin"],
  },
  {
    id: "fleet",
    label: "Fleet Management",
    icon: Truck,
    href: "/fleet",
    module: "Fleet",
    roles: ["super_admin", "company_user"],
    subItems: [
      { id: "fleet-overview", label: "Overview", href: "/fleet" },
      { id: "fleet-shipments", label: "Shipments", href: "/fleet/shipments" },
      { id: "fleet-vehicles", label: "Vehicles", href: "/fleet/vehicles" },
      { id: "fleet-drivers", label: "Drivers", href: "/fleet/drivers" },
      {
        id: "fleet-maintenance",
        label: "Maintenance",
        href: "/fleet/maintenance",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: Users,
    href: "/crm",
    module: "CRM",
    roles: ["super_admin", "company_user"],
    subItems: [
      { id: "crm-contacts", label: "Contacts", href: "/crm/contacts" },
      { id: "crm-deals", label: "Deals", href: "/crm/deals" },
      { id: "crm-tasks", label: "Tasks", href: "/crm/tasks" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    href: "/inventory",
    module: "Inventory",
    roles: ["super_admin", "company_user"],
    subItems: [
      { id: "inv-stock", label: "Stock Level", href: "/inventory/stock" },
      {
        id: "inv-warehouses",
        label: "Warehouses",
        href: "/inventory/warehouses",
      },
      { id: "inv-suppliers", label: "Suppliers", href: "/inventory/suppliers" },
    ],
  },
  {
    id: "hr",
    label: "HR Module",
    icon: UserCircle,
    href: "/hr",
    module: "HR",
    roles: ["super_admin", "company_user"],
    subItems: [
      { id: "hr-employees", label: "Employees", href: "/hr/employees" },
      { id: "hr-payroll", label: "Payroll", href: "/hr/payroll" },
      { id: "hr-attendance", label: "Attendance", href: "/hr/attendance" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    href: "/finance",
    module: "Finance",
    roles: ["super_admin", "company_user"],
    subItems: [
      { id: "fin-invoices", label: "Invoices", href: "/finance/invoices" },
      { id: "fin-expenses", label: "Expenses", href: "/finance/expenses" },
      {
        id: "fin-reports",
        label: "Financial Reports",
        href: "/finance/reports",
      },
    ],
  },
  {
    id: "trade",
    label: "International Trade",
    icon: Ship,
    href: "/internationaltrade",
    module: "trade",
    roles: ["super_admin", "company_user"],
    subItems: [
      {
        id: "trade-shipments",
        label: "Shipments",
        href: "/internationaltrade/shipments",
      },
      {
        id: "trade-containers",
        label: "Containers",
        href: "/internationaltrade/containers",
      },
      { id: "trade-ports", label: "Ports", href: "/internationaltrade/ports" },
      {
        id: "trade-vessels",
        label: "Vessels",
        href: "/internationaltrade/vessels",
      },
      {
        id: "trade-clearance",
        label: "Customs Clearance",
        href: "/internationaltrade/clearance",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/settings",
    roles: ["super_admin", "company_user"],
  },
];
