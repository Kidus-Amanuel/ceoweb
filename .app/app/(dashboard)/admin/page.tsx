"use client";

import React, { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Activity,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Plus,
  ArrowUpRight,
  Search,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useAuthStore } from "@/store/authStore";

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  // Redirect non-super_admins
  useEffect(() => {
    if (!isLoading && (!user || user.userType !== "super_admin")) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Authenticating platform admin...
          </p>
        </div>
      </div>
    );
  }

  // Prevent flash before redirect
  if (!user || user.userType !== "super_admin") return null;

  // Mock data for the dashboard
  const metrics = [
    {
      label: "Total Companies",
      value: "24",
      icon: Building2,
      change: "+3 this month",
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Total Users",
      value: "1,284",
      icon: Users,
      change: "+12% vs last month",
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      label: "Platform Uptime",
      value: "99.98%",
      icon: Activity,
      change: "Solid performance",
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      label: "Monthly Revenue",
      value: "$42,500",
      icon: TrendingUp,
      change: "+8% growth",
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
  ];

  const recentCompanies = [
    {
      id: 1,
      name: "ABC Manufacturing",
      owner: "John Doe",
      size: "Mid-level",
      status: "active",
      industry: "Manufacturing",
    },
    {
      id: 2,
      name: "XYZ Retail Corp",
      owner: "Jane Smith",
      size: "Enterprise",
      status: "active",
      industry: "Retail",
    },
    {
      id: 3,
      name: "Global Logistics",
      owner: "Mike Johnson",
      size: "Startup",
      status: "trial",
      industry: "Fleet",
    },
    {
      id: 4,
      name: "Nexus Innovations",
      owner: "Sarah Williams",
      size: "Mid-level",
      status: "suspended",
      industry: "IT",
    },
  ];

  return (
    <div className="flex-1 space-y-6 animate-in fade-in duration-500 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Platform Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Monitor and manage all tenant organizations across the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="hidden sm:flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Global Search
          </Button>
          <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4" />
            Register Company
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card
              key={idx}
              className="border-none shadow-sm hover:shadow-md transition-shadow group"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-xl ${metric.bg} ${metric.color} transition-colors group-hover:scale-110 duration-200`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium opacity-70"
                  >
                    Metric
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {metric.value}
                  </h3>
                  <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    {metric.change}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Companies List */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <div>
              <CardTitle className="text-xl font-bold">
                Manage Companies
              </CardTitle>
              <CardDescription>
                Visual overview of current tenants
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold p-0 h-auto"
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="p-0 border-t border-slate-100 dark:border-slate-800">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-50/50 dark:bg-slate-900/50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Company</th>
                    <th className="px-6 py-4 font-semibold">Owner</th>
                    <th className="px-6 py-4 font-semibold">Industry</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentCompanies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex flex-col">
                          <span className="font-semibold">{company.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {company.size}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {company.owner}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {company.industry}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={`
                            px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                            ${
                              company.status === "active"
                                ? "bg-green-100 text-green-700"
                                : company.status === "trial"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-700"
                            }
                          `}
                        >
                          {company.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-indigo-200" />
                <Badge className="bg-white/20 text-white border-none text-[10px]">
                  Active
                </Badge>
              </div>
              <CardTitle className="text-xl">System Protection</CardTitle>
              <CardDescription className="text-indigo-100/70">
                Security monitoring is online.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black/10 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-70">Threat Level</span>
                  <span className="font-bold text-green-300">LOW</span>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full">
                  <div
                    className="bg-green-400 h-full rounded-full"
                    style={{ width: "15%" }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Database Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">Supabase API</span>
                </div>
                <span className="text-xs text-slate-400">Stable</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">Auth Service</span>
                </div>
                <span className="text-xs text-slate-400">Stable</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                  <span className="text-sm font-medium">Analytics Engine</span>
                </div>
                <span className="text-xs text-slate-400">High Load</span>
              </div>
              <Button variant="outline" className="w-full text-xs mt-4">
                Run Diagnostics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
