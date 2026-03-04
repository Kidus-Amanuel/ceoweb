import { AuthGuard } from "@/components/auth/AuthGuard";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requiredModule="inventory">{children}</AuthGuard>;
}
