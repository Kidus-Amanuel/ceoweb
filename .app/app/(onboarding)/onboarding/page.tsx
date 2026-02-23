"use client";

import { useState, useEffect } from "react";
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
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useUser } from "@/app/context/UserContext";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useUser();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    brandColor: "#2383e2",
    workspaceUrl: "ceo.et",
  });
  const [modules, setModules] = useState<
    { name: string; display_name: string }[]
  >([]);
  const [invites, setInvites] = useState([
    { email: "", role: "General Manager", name: "" },
  ]);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const supabase = createClient();
        // 1. Get modules allowed for Starter plan
        const { data: plan } = await supabase
          .from("plans")
          .select("modules")
          .eq("name", "Starter")
          .single();

        const allowedModules = plan?.modules || ["hr", "crm"];

        // 2. Fetch display names
        const { data } = await supabase
          .from("modules")
          .select("name, display_name")
          .in("name", allowedModules);

        if (data) setModules(data);
      } catch (err) {
        console.error("Failed to fetch modules:", err);
      }
    };
    fetchModules();
  }, []);

  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, router]);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const steps = [
    { id: 1, name: "Basics", icon: Building2 },
    { id: 2, name: "Branding", icon: Palette },
    { id: 3, name: "Team", icon: UsersIcon },
  ];

  const handleFinishOnboarding = async () => {
    setIsLoading(true);
    try {
      // 1. Create Company and finalize Profile
      const response = await axios.post("/api/company/onboarding", {
        ...formData,
        slug: formData.companyName.toLowerCase().replace(/\s+/g, "-"),
      });

      if (response.data.success) {
        // 2. Send Invites
        const validInvites = invites.filter((i) => i.email.trim() !== "");
        if (validInvites.length > 0) {
          // Sequential invites for simplicity in MVP
          for (const invite of validInvites) {
            try {
              await axios.post("/api/auth/invite", {
                email: invite.email,
                role: invite.role,
                name: invite.name,
              });
            } catch (inviteErr) {
              console.error(`Failed to invite ${invite.email}:`, inviteErr);
            }
          }
        }

        // 2. Refresh local user state to get new company-linked role
        await refreshUser();

        // 3. Move to success step
        setStep(4);
      }
    } catch (error) {
      console.error("Onboarding failed:", error);
      alert("Failed to complete onboarding. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
              <Button
                onClick={nextStep}
                className="w-full gap-2"
                disabled={!formData.companyName}
              >
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
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
                  {["#2383e2"].map((color) => (
                    <button
                      key={color}
                      type="button"
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
                  ))}
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
                    className="rounded-l-none bg-slate-50 cursor-not-allowed"
                    value={formData.workspaceUrl}
                    readOnly
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Workspace URL is automatically set to default.
                </p>
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

        {step === 3 && (
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
                {invites.map((invite, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Full Name"
                      value={invite.name}
                      onChange={(e) => {
                        const newInvites = [...invites];
                        newInvites[index].name = e.target.value;
                        setInvites(newInvites);
                      }}
                    />
                    <Input
                      className="flex-[1.5]"
                      placeholder="colleague@company.com"
                      value={invite.email}
                      onChange={(e) => {
                        const newInvites = [...invites];
                        newInvites[index].email = e.target.value;
                        setInvites(newInvites);
                      }}
                    />
                    <select
                      className="w-40 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={invite.role}
                      onChange={(e) => {
                        const newInvites = [...invites];
                        newInvites[index].role = e.target.value;
                        setInvites(newInvites);
                      }}
                    >
                      <option value="General Manager">General Manager</option>
                      {modules.map((m) => (
                        <option
                          key={m.name}
                          value={`${m.display_name} Manager`}
                        >
                          {m.display_name} Manager
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                type="button"
                className="w-full border-2 border-dashed border-border py-6 h-auto text-muted-foreground hover:text-primary hover:border-primary/50"
                onClick={() =>
                  setInvites([
                    ...invites,
                    { email: "", role: "General Manager", name: "" },
                  ])
                }
              >
                + Add Another Member
              </Button>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleFinishOnboarding}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? "Setting up..." : "Finish Setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
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
