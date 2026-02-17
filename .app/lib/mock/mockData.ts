export interface Company {
  id: string;
  name: string;
  industry: string;
  size: "1-10" | "10-50" | "50-100" | "100-500" | "500+";
  status: "Active" | "Pending" | "Inactive";
  createdAt: string;
}

export interface VirtualColumn {
  id: string;
  label: string;
  key: string;
  type: "text" | "number" | "select" | "boolean" | "json";
  options?: { label: string; value: string | number }[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  team: string;
  role: string;
  active: boolean;
  costimize: Record<string, any>; // JSONB field for custom/virtual data
  companyId: string;
  joinDate: string;
  performance: number;
}

export const mockCompanies: Company[] = [
  {
    id: "company_a",
    name: "Acme Health",
    industry: "Healthcare",
    size: "50-100",
    status: "Active",
    createdAt: "2023-01-15",
  },
  {
    id: "company_b",
    name: "Global Logistics",
    industry: "Transport",
    size: "500+",
    status: "Active",
    createdAt: "2023-03-22",
  },
];

// Virtual Column Definitions per Company
export const mockVirtualColumns: Record<string, VirtualColumn[]> = {
  company_a: [
    {
      id: "vc1",
      label: "Blood Type",
      key: "blood_type",
      type: "select",
      options: [
        { label: "A+", value: "A+" },
        { label: "O-", value: "O-" },
        { label: "B+", value: "B+" },
      ],
    },
    {
      id: "vc2",
      label: "Emergency Contact",
      key: "emergency_phone",
      type: "text",
    },
  ],
  company_b: [
    {
      id: "vc3",
      label: "Marital Status",
      key: "marital_status",
      type: "select",
      options: [
        { label: "Single", value: "single" },
        { label: "Married", value: "married" },
      ],
    },
    {
      id: "vc4",
      label: "Work From Home",
      key: "wfh_eligible",
      type: "boolean",
    },
  ],
};

export const mockEmployees: Employee[] = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@acme.com",
    team: "Engineering",
    role: "Senior Developer",
    active: true,
    costimize: { blood_type: "A+", emergency_phone: "555-0123" },
    companyId: "company_a",
    joinDate: "2023-05-20",
    performance: 92,
  },
  {
    id: "2",
    name: "Sarah Miller",
    email: "sarah@global.com",
    team: "Product",
    role: "Product Manager",
    active: true,
    costimize: { marital_status: "married", wfh_eligible: true },
    companyId: "company_b",
    joinDate: "2023-06-15",
    performance: 88,
  },
];
