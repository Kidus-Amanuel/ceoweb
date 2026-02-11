import { ShieldCheck, Zap, BarChart3, Globe } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      {/* Visual Side - Hidden on Mobile */}
      <div className="relative hidden w-1/2 flex-col bg-slate-950 p-10 lg:flex">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-primary/10" />
          <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <div className="relative z-10 flex items-center gap-2 text-2xl font-bold text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          CEO PORTAL
        </div>

        <div className="relative z-10 mt-auto">
          <blockquote className="space-y-4">
            <p className="text-3xl font-medium leading-tight text-white/90">
              &quot;The most powerful enterprise management suite for modern
              CEOs and fleet operators.&quot;
            </p>
            <footer className="text-lg text-white/60">
              Transforming businesses with AI-driven insights.
            </footer>
          </blockquote>

          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
            <div className="flex items-center gap-3 text-white/70">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                Real-time Fleet Tracking
              </span>
            </div>
            <div className="flex items-center gap-3 text-white/70">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Predictive Analytics</span>
            </div>
            <div className="flex items-center gap-3 text-white/70">
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Global CRM Access</span>
            </div>
            <div className="flex items-center gap-3 text-white/70">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Enterprise Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex w-full flex-col justify-center p-8 lg:w-1/2 lg:p-12 xl:p-16">
        <div className="mx-auto w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Logo variant for mobile */}
          <div className="mb-8 flex items-center gap-2 text-xl font-bold lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            CEO PORTAL
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
