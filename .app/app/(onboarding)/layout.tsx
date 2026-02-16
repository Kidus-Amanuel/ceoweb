import { AuthGuard } from "@/components/auth/AuthGuard";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-4xl">{children}</div>
      </div>
    </AuthGuard>
  );
}
