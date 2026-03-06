import { AuthGuard } from "@/components/auth/AuthGuard";

export default function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requiredModule="hr">{children}</AuthGuard>;
}
