"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/shared/ui/card";
import {
  Check,
  Building2,
  Palette,
  Users as UsersIcon,
  ChevronRight,
  ChevronLeft,
  Upload,
  PackagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    brandColor: "#2383e2",
    workspaceUrl: "",
    plan: "professional",
  });

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const steps = [
    { id: 1, name: "Basics", icon: Building2 },
    { id: 2, name: "Plan", icon: PackagePlus },
    { id: 3, name: "Branding", icon: Palette },
    { id: 4, name: "Team", icon: UsersIcon },
  ];

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: "$49",
      features: ["Up to 5 vehicles", "Basic CRM", "1 Admin account"],
    },
    {
      id: "professional",
      name: "Professional",
      price: "$149",
      features: [
        "Up to 50 vehicles",
        "Full CRM & HR",
        "5 Admin accounts",
        "AI Assistant",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      features: [
        "Unlimited vehicles",
        "Dedicated support",
        "Custom integrations",
        "Full API access",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4 py-12">
      {/* Progress Indicator */}
      <div className="w-full max-w-lg mb-12">
        <div className="flex justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((s) => (
            <div
              key={s.id}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                  step === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : step > s.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {step > s.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  step >= s.id ? "text-primary" : "text-muted-foreground",
                )}
              >
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-4xl">
        {step === 1 && (
          <Card className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <CardHeader>
              <CardTitle className="text-section-title">
                Company Basics
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Let&apos;s set up your organization profile.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <label className="text-label text-foreground">
                  Company Name
                </label>
                <Input
                  placeholder="Acme Inc."
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-label text-foreground">Industry</label>
                  <Input
                    placeholder="Technology"
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label text-foreground">
                    Company Size
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.companySize}
                    onChange={(e) =>
                      setFormData({ ...formData, companySize: e.target.value })
                    }
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201+">201+ employees</option>
                  </select>
                </div>
              </div>
              <Button onClick={nextStep} className="w-full gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-10">
              <h2 className="text-section-title text-foreground">
                Choose your subscription
              </h2>
              <p className="text-muted-foreground mt-2">
                Pick a plan that grows with your business.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative cursor-pointer transition-all hover:border-primary/50",
                    formData.plan === plan.id
                      ? "border-primary ring-1 ring-primary"
                      : "border-border",
                  )}
                  onClick={() => setFormData({ ...formData, plan: plan.id })}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-card-title">
                      {plan.name}
                    </CardTitle>
                    <div className="mt-2 text-2xl font-bold">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="h-4 w-4 text-primary" /> {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex gap-3 mt-10 max-w-md mx-auto">
              <Button variant="outline" onClick={prevStep} className="flex-1">
                Back
              </Button>
              <Button onClick={nextStep} className="flex-1 gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <Card className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <CardHeader>
              <CardTitle className="text-section-title">
                Brand your workspace
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize how your portal looks.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6 p-4 border border-dashed border-border rounded-lg bg-accent/30">
                <div className="h-16 w-16 rounded-lg bg-background flex flex-col items-center justify-center border border-border cursor-pointer hover:bg-accent transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">
                    Logo
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Upload Company Logo</p>
                  <p className="text-xs text-muted-foreground">
                    PNG or SVG up to 5MB
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label text-foreground">
                  Brand Color
                </label>
                <div className="flex gap-2">
                  {["#2383e2", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"].map(
                    (color) => (
                      <button
                        key={color}
                        onClick={() =>
                          setFormData({ ...formData, brandColor: color })
                        }
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-transform",
                          formData.brandColor === color
                            ? "border-foreground scale-110"
                            : "border-transparent",
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ),
                  )}
                  <input
                    type="color"
                    className="h-8 w-8 rounded-full bg-transparent overflow-hidden cursor-pointer"
                    value={formData.brandColor}
                    onChange={(e) =>
                      setFormData({ ...formData, brandColor: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label text-foreground">
                  Workspace URL
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-accent text-muted-foreground text-sm border border-r-0 border-input rounded-l-md">
                    app.ceo/
                  </span>
                  <Input
                    className="rounded-l-none"
                    placeholder="my-company"
                    value={formData.workspaceUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, workspaceUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  Back
                </Button>
                <Button onClick={nextStep} className="flex-1 gap-2">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <CardHeader>
              <CardTitle className="text-section-title">
                Invite your team
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Start collaborating with your managers.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="colleague@company.com"
                    />
                    <select className="w-32 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option>Admin</option>
                      <option>Member</option>
                    </select>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full border-2 border-dashed border-border py-6 h-auto text-muted-foreground hover:text-primary hover:border-primary/50"
              >
                + Add Another Member
              </Button>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  Back
                </Button>
                <Button onClick={nextStep} className="flex-1">
                  Finish Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card className="max-w-2xl mx-auto animate-in zoom-in duration-500 text-center">
            <CardContent className="pt-12 pb-12 space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-10 w-10 text-primary" />
              </div>
              <div>
                <CardTitle className="text-page-title">All set!</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Your workspace is ready. Redirecting to dashboard...
                </p>
              </div>
              <Button
                onClick={() => router.push("/dashboard")}
                className="min-w-[200px]"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
