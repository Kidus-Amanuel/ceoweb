import { ShieldCheck, Zap, BarChart3, Globe, Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F7F7F7] text-foreground overflow-hidden font-sans">
      {/* Visual Side - Hidden on Mobile */}
      <div className="relative hidden w-1/2 flex-col bg-black p-8 lg:flex overflow-hidden">
        {/* Animated Background Mesh - Subtle and Premium */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/10" />
          <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[100px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3 text-2xl font-bold text-white">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
            <span className="text-black font-bold text-[10px]">CEO</span>
          </div>
          <span className="tracking-tight">CEO AI</span>
        </div>

        <div className="relative z-10 mt-40 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3 text-blue-400" />
            Empowering Modern Enterprises
          </div>
          <blockquote className="space-y-3">
            <p className="text-3xl font-semibold leading-tight text-white/90">
              The Next Evolution of Enterprise Management.
            </p>
            <footer className="text-base text-white/50 font-medium">
              Join 500+ global operators scaling with AI-driven insights.
            </footer>
          </blockquote>

          <div className="mt-8 grid grid-cols-2 gap-y-4 gap-x-8 border-t border-white/10 pt-8">
            <div className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-xs">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Zap className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="font-medium">Real-time Fleet</span>
            </div>
            <div className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-xs">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="font-medium">Predictive AI</span>
            </div>
            <div className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-xs">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="font-medium">Global CRM</span>
            </div>
            <div className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-xs">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="font-medium">Secure Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex w-full flex-col justify-center p-6 lg:w-1/2 lg:p-8 xl:p-12">
        <div className="mx-auto w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="mb-6 flex items-center gap-3 text-xl font-bold lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-lg shadow-black/20">
              <span className="text-white font-bold text-[10px]">CEO</span>
            </div>
            CEO AI
          </div>

          <div className="bg-white/50 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none p-0 rounded-2xl">
            {children}
          </div>

          {/* Footer Navigation (Optional, added based on typical auth pages) */}
          <div className="mt-8 pt-6 border-t border-border/50 text-center text-[10px] text-muted-foreground uppercase tracking-widest opacity-60">
            &copy; 2025 CEO AI Technologies Inc.
          </div>
        </div>
      </div>
    </div>
  );
}
