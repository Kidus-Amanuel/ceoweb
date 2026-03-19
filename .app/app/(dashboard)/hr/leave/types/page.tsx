"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeaveTypesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the consolidated Employees hub
    router.replace("/hr/employees");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">
        Relocating to Centralized HR Hub...
      </p>
    </div>
  );
}
