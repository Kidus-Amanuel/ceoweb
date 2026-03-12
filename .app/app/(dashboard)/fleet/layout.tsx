import { AuthGuard } from "@/components/auth/AuthGuard";

export default function FleetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requiredModule="fleet">{children}</AuthGuard>;
}
