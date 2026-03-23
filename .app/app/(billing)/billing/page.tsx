"use client";

import { useCompanies } from "@/hooks/use-companies";
import { useUser } from "@/app/context/UserContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import {
  Check,
  Rocket,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils/cn";

const PLANS = [
  {
    id: "050e9763-fb4a-4794-9af7-b08cc89682a1",
    name: "Starter",
    price: "29",
    description: "Perfect for small teams getting started.",
    features: [
      "Human Resources (HR)",
      "CRM",
      "International Trade",
      "Up to 5 users",
      "Basic Reporting",
    ],
    modules: ["hr", "crm", "trade"],
    variant: "default" as const,
    icon: Zap,
  },
  {
    id: "6c444c61-199f-4ab6-bbce-bd42cb23be9a",
    name: "Business",
    price: "99",
    description: "Expanded modules for growing companies.",
    features: [
      "Everything in Starter",
      "Inventory Management",
      "Finance & Accounting",
      "Up to 20 users",
      "Advanced Permissions",
    ],
    modules: ["hr", "crm", "inventory", "finance", "trade"],
    variant: "primary" as const,
    popular: true,
    icon: Rocket,
  },
  {
    id: "c3e2be9c-aa31-4758-8041-42d8011f0560",
    name: "Enterprise",
    price: "499",
    description: "The complete package for large organizations.",
    features: [
      "Everything in Business",
      "Fleet Management",
      "Project Management",
      "1000 users capacity",
      "Priority Support",
      "Custom Fields Support",
    ],
    modules: [
      "hr",
      "crm",
      "inventory",
      "finance",
      "trade",
      "fleet",
      "projects",
    ],
    variant: "secondary" as const,
    icon: ShieldCheck,
  },
];

export default function BillingPage() {
  const { selectedCompany } = useCompanies();
  const { roleInfo, refreshUser } = useUser();
  const router = useRouter();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const currentPlanId =
    roleInfo?.plan_id || "050e9763-fb4a-4794-9af7-b08cc89682a1"; // Default to Starter if not set
  const currentPlanName = roleInfo?.plan_name || "Starter";

  const handleUpgrade = async (planId: string, planName: string) => {
    if (!selectedCompany?.id) {
      toast.error("No company selected");
      return;
    }

    if (planId === currentPlanId) {
      toast.info("You're already on this plan!");
      return;
    }

    setLoadingPlanId(planId);
    try {
      const response = await axios.post("/api/billing/upgrade", {
        companyId: selectedCompany.id,
        planId: planId,
      });

      if (response.data.success) {
        toast.success(`Succesfully upgraded to ${planName} plan!`);
        // Refresh local user state so modules update immediately
        await refreshUser();
        // Redirect to dashboard
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Upgrade failed:", error);
      toast.error(
        error.response?.data?.error || "Upgrade failed. Check console.",
      );
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 min-h-screen">
      <div className="mb-10 text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest border border-indigo-100 mb-2">
          <Sparkles className="w-3 h-3" /> Billing & Subscriptions
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
          Choose your path <span className="text-indigo-600">to growth</span>
        </h1>
        <p className="text-slate-500 font-medium">
          Manage your workspace capabilities and scale as your organization
          grows. Each upgrade unlocks new specialized modules and departments.
        </p>
      </div>

      {/* Current Plan Summary (Banner) */}
      <div className="mb-12 max-w-5xl mx-auto p-8 rounded-3xl bg-slate-950 text-white relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="success"
                className="bg-emerald-500/20 text-emerald-300 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest"
              >
                Active Subscription
              </Badge>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight">
                {currentPlanName} Plan
              </h2>
              <p className="text-slate-400 font-medium max-w-md">
                Your current plan includes access to{" "}
                {roleInfo?.plan_modules?.length || 3} core modules and global
                management features.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {(roleInfo?.plan_modules || ["hr", "crm", "trade"]).map((mod) => (
                <Badge
                  key={mod}
                  variant="secondary"
                  className="bg-white/5 border-white/10 text-slate-300 text-[9px] uppercase font-black hover:bg-white/10 transition-colors"
                >
                  {mod}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[200px]">
            <Layers className="w-10 h-10 text-indigo-400 mb-2" />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Company Context
              </p>
              <p className="text-sm font-bold text-white">
                {selectedCompany?.name || "Global"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Selection */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isUpgrade = !isCurrent; // Simplified, assuming higher index = higher plan

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col transition-all duration-300 border-2 rounded-3xl overflow-hidden",
                isCurrent
                  ? "border-emerald-500 bg-emerald-50/10 shadow-emerald-500/5"
                  : "border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5",
                plan.popular && !isCurrent
                  ? "border-indigo-100 ring-2 ring-indigo-500/10"
                  : "",
              )}
            >
              {plan.popular && !isCurrent && (
                <div className="absolute top-0 right-0 p-4">
                  <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none py-1 px-3 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-indigo-600/20">
                    Recommended
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-8 px-8">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm border",
                    plan.name === "Business"
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-50 border-slate-100 text-slate-900",
                  )}
                >
                  <plan.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium leading-relaxed min-h-[48px]">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 px-8 space-y-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter text-slate-900">
                    ${plan.price}
                  </span>
                  <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
                    / month
                  </span>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    What&apos;s included:
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-slate-600 group"
                      >
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                          <Check className="w-3 h-3 text-indigo-600" />
                        </div>
                        <span className="font-semibold">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pb-8 px-8">
                <Button
                  className={cn(
                    "w-full h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300",
                    isCurrent
                      ? "bg-slate-100 text-slate-400 cursor-default hover:bg-slate-100"
                      : plan.name === "Business"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                        : "bg-slate-900 text-white hover:bg-slate-950",
                  )}
                  onClick={() => handleUpgrade(plan.id, plan.name)}
                  disabled={loadingPlanId !== null || isCurrent}
                  loading={loadingPlanId === plan.id}
                >
                  {isCurrent
                    ? "Current Plan"
                    : isUpgrade
                      ? `Upgrade to ${plan.name}`
                      : "Select Plan"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-20 text-center max-w-xl mx-auto p-12 rounded-3xl bg-slate-50 border border-slate-100 border-dashed">
        <p className="text-sm font-medium text-slate-500 mb-4">
          Need something more custom for your organization?
        </p>
        <Button
          variant="outline"
          className="rounded-full border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[11px] gap-2 px-6"
        >
          Contact Sales <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
