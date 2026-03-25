"use client";
import { createClient } from "@/lib/supabase/client";
import { FilePreviewCard } from "@/components/shared/FilePreviewCard";

import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  useEmployee,
  useLeaveTypes,
  useHrColumnDefs,
  useUpdateEmployee,
} from "@/hooks/use-hr";
import FilesEditor from "@/components/shared/table/editable-table/FilesEditor";
import { useCompanies } from "@/hooks/use-companies";
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Paperclip,
  Download,
  ShieldCheck,
  UserCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { motion } from "framer-motion";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/ui/tabs/Tabs";
import { calculateDays } from "@/utils/table-utils";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  const { data: employee, isLoading } = useEmployee(companyId, id as string);
  const supabase = createClient();
  const { data: leaveTypes = [] } = useLeaveTypes(companyId);
  const { data: rawCustomColumns = [] } = useHrColumnDefs(
    "employees",
    companyId,
  );
  const customColumns = (rawCustomColumns as any[]).map((def) => ({
    id: def.id,
    header: def.field_label,
    accessorKey: def.field_name,
    meta: { type: def.field_type },
  }));
  const updateMutation = useUpdateEmployee(companyId);

  const handleDownload = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("erp-files")
        .createSignedUrl(path, 3600);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast.error(`Error downloading file: ${error.message}`);
    }
  };

  const getResolvedUrl = (file: any) => {
    const path = file.path || file.storage_path;
    if (path) {
      return supabase.storage.from("erp-files").getPublicUrl(path).data
        .publicUrl;
    }
    return file.url || file.file_url;
  };

  const [filesEditorOpen, setFilesEditorOpen] = useState(false);
  const [activeFilesField, setActiveFilesField] = useState<string | null>(null);
  const [currentFiles, setCurrentFiles] = useState<any[]>([]);

  if (isLoading) {
    return (
      <div className="p-8">
        <FleetTableSkeleton rows={10} cols={4} />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <XCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">
          Employee Not Found
        </h2>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const initials =
    `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="rounded-2xl hover:bg-white border border-slate-200 h-10 px-4 group shadow-sm bg-white/50 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 mr-2 group-hover:translate-x-[-2px] transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Back to Directory
          </span>
        </Button>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase tracking-widest px-3 py-1"
          >
            {employee.status || "Active"}
          </Badge>
          <div className="w-px h-6 bg-slate-200" />
          <span className="text-[10px] font-mono text-slate-400 font-bold">
            ID: {employee.id.substring(0, 8)}
          </span>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-indigo-900/5 p-8 flex flex-col items-center text-center sticky top-6"
          >
            <div className="relative group">
              <div className="w-32 h-32 rounded-[3.5rem] bg-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl border-4 border-white transform group-hover:scale-105 transition-all duration-500">
                {initials}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-10 h-10 rounded-3xl border-4 border-white flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-black text-slate-900 leading-none tracking-tight">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-indigo-600 font-black uppercase tracking-[0.2em] text-[10px] mt-2 opacity-80">
              {employee.employee_code}
            </p>

            <div className="w-full h-px bg-slate-100 my-8" />

            <div className="space-y-4 w-full">
              <div className="flex items-center gap-4 text-left p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    Email Address
                  </p>
                  <p className="text-sm font-bold text-slate-700 truncate">
                    {employee.email || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-left p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    Phone Number
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {employee.phone || "Not Provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-left p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    Position
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {employee.position?.title || employee.job_title || "Staff"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-indigo-900/5 overflow-hidden"
          >
            <Tabs defaultValue="info" className="w-full">
              <div className="px-8 pt-8 pb-4 border-b border-slate-100 flex items-center justify-between">
                <TabsList className="bg-slate-100/50 p-1 rounded-2xl gap-2 h-12">
                  <TabsTrigger
                    value="info"
                    className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm outline-none"
                  >
                    <UserCircle2 className="w-3.5 h-3.5 mr-2 opacity-60" />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Overview
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="leaves"
                    className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm outline-none"
                  >
                    <Clock className="w-3.5 h-3.5 mr-2 opacity-60" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                      Leave History
                    </span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  {/* Quick actions if needed */}
                </div>
              </div>

              <div className="p-8 min-h-[500px]">
                {/* 1. Overview Tab */}
                <TabsContent
                  value="info"
                  className="mt-0 space-y-8 focus-visible:outline-none outline-none"
                >
                  <div className="grid grid-cols-2 gap-8 outline-none">
                    <section className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-500 border-b pb-2 flex items-center gap-2 outline-none">
                        <Building2 className="w-3 h-3" /> Core Organization
                      </h3>
                      <dl className="space-y-3">
                        <div className="flex justify-between">
                          <dt className="text-xs font-bold text-slate-400">
                            Department
                          </dt>
                          <dd className="text-xs font-black text-slate-700">
                            {employee.department?.name || "Unassigned"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-xs font-bold text-slate-400">
                            Join Date
                          </dt>
                          <dd className="text-xs font-black text-slate-700">
                            {employee.hire_date
                              ? new Date(
                                  employee.hire_date,
                                ).toLocaleDateString()
                              : "-"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-xs font-bold text-slate-400">
                            Employment Type
                          </dt>
                          <dd className="text-xs font-black text-slate-700">
                            Full Time
                          </dd>
                        </div>
                      </dl>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-emerald-500 border-b pb-2 flex items-center gap-2">
                        <Wallet className="w-3 h-3" /> Financial Meta
                      </h3>
                      <dl className="space-y-3">
                        <div className="flex justify-between">
                          <dt className="text-xs font-bold text-slate-400">
                            Base Salary
                          </dt>
                          <dd className="text-xs font-black text-slate-700">
                            ${(employee.basic_salary || 0).toLocaleString()}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-xs font-bold text-slate-400">
                            Hourly Rate
                          </dt>
                          <dd className="text-xs font-black text-slate-700">
                            ${(employee.hourly_rate || 0).toLocaleString()}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-xs font-bold text-slate-400">
                            Currency
                          </dt>
                          <dd className="text-xs font-black text-slate-700">
                            USD
                          </dd>
                        </div>
                      </dl>
                    </section>
                  </div>

                  <section className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" /> Extended
                      Attributes
                    </h3>
                    <div className="grid grid-cols-3 gap-6">
                      {customColumns.map((col: any) => {
                        const val = employee.custom_fields?.[col.accessorKey];
                        const isFile = col.meta?.type === "files";

                        if (
                          !isFile &&
                          (val === undefined ||
                            val === null ||
                            val === "" ||
                            (Array.isArray(val) && val.length === 0))
                        )
                          return null;

                        return (
                          <div
                            key={col.id}
                            className="col-span-3 space-y-2 group"
                          >
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1 group-hover:text-indigo-500">
                              {col.header}
                            </p>
                            <div className="flex flex-wrap gap-4">
                              {(() => {
                                const items = Array.isArray(val) ? val : [val];
                                const isFileList =
                                  items.length > 0 &&
                                  typeof items[0] === "object" &&
                                  (items[0].url ||
                                    items[0].file_url ||
                                    items[0].path ||
                                    items[0].storage_path);

                                if (isFileList) {
                                  return items.map((file: any, i: number) => (
                                    <FilePreviewCard key={i} file={file} />
                                  ));
                                }

                                return (
                                  <p className="text-sm font-black text-slate-700">
                                    {typeof val === "object"
                                      ? JSON.stringify(val)
                                      : String(val)}
                                  </p>
                                );
                              })()}
                            </div>
                            {col.meta?.type === "files" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white text-[10px] font-black uppercase px-4 h-8 transition-all"
                                onClick={() => {
                                  setActiveFilesField(col.accessorKey);
                                  setCurrentFiles(
                                    Array.isArray(val) ? val : [],
                                  );
                                  setFilesEditorOpen(true);
                                }}
                              >
                                <Paperclip className="w-3 h-3 mr-2" /> Manage
                                Files
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      {(!employee.custom_fields ||
                        Object.keys(employee.custom_fields).length === 0) && (
                        <p className="text-xs italic text-slate-400 col-span-3">
                          No custom metadata defined for this employee.
                        </p>
                      )}
                    </div>
                  </section>
                </TabsContent>

                {/* 2. Leaves Tab */}
                <TabsContent value="leaves" className="mt-0 outline-none">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                        Request History
                      </h3>
                    </div>

                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                          <tr>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Period</th>
                            <th className="px-6 py-4 text-center">Days</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(employee.leaves || []).map((leave: any) => (
                            <tr
                              key={leave.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <span className="text-xs font-black text-slate-700">
                                  {leave.leave_type?.name || "General"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-600">
                                    {new Date(
                                      leave.start_date,
                                    ).toLocaleDateString()}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    to{" "}
                                    {new Date(
                                      leave.end_date,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Badge
                                  variant="outline"
                                  className="bg-white border-slate-200 text-slate-600 font-bold px-3"
                                >
                                  {calculateDays(
                                    leave.start_date,
                                    leave.end_date,
                                  )}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <Badge
                                  variant="outline"
                                  className={`capitalize font-black text-[9px] px-2.5 ${
                                    leave.status === "approved"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                      : leave.status === "pending"
                                        ? "bg-amber-50 text-amber-700 border-amber-100"
                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                  }`}
                                >
                                  {leave.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                          {(!employee.leaves ||
                            employee.leaves.length === 0) && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-6 py-12 text-center"
                              >
                                <div className="flex flex-col items-center opacity-30 grayscale scale-90">
                                  <Calendar className="w-8 h-8 mb-2" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">
                                    No tenure history found
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </div>
      </div>

      {/* Floating Audit Footer */}
      <div className="flex items-center justify-center py-8">
        <div className="bg-slate-900/5 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200 flex items-center gap-6">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Secure
            Personnel Record
          </span>
          <div className="w-px h-3 bg-slate-300" />
          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest italic">
            CEO-ERP v4.0.2 / NODE_{employee.id.substring(0, 4)}
          </span>
        </div>
      </div>

      {filesEditorOpen && (
        <FilesEditor
          open={filesEditorOpen}
          onClose={() => setFilesEditorOpen(false)}
          title={`Managing ${customColumns.find((c: any) => c.accessorKey === activeFilesField)?.header || "Files"}`}
          initialFiles={currentFiles}
          tableName="employees"
          recordId={id as string}
          onSave={(files) => {
            if (!activeFilesField) return;
            const newCustomFields = {
              ...(employee.custom_fields || {}),
              [activeFilesField]: files,
            };
            updateMutation.mutate(
              {
                id: employee.id,
                custom_fields: newCustomFields,
              },
              {
                onSuccess: () => {
                  toast.success("Files synchronized successfully");
                  setFilesEditorOpen(false);
                },
                onError: (err: any) => {
                  toast.error(`Update failed: ${err.message}`);
                },
              },
            );
          }}
        />
      )}
    </div>
  );
}
