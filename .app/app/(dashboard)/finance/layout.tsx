import { AuthGuard } from "@/components/auth/AuthGuard";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requiredModule="finance">{children}</AuthGuard>;
}
