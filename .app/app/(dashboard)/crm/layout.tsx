import { AuthGuard } from "@/components/auth/AuthGuard";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredModule="crm">{children}</AuthGuard>;
}
