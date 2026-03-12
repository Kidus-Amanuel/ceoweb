import { AuthGuard } from "@/components/auth/AuthGuard";

export default function InternationalTradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requiredModule="trade">{children}</AuthGuard>;
}
