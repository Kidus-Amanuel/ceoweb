"use client";
import { createClient } from "@/lib/supabase/client";
import { FilePreviewCard } from "@/components/shared/FilePreviewCard";

import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  useDriver,
  useFleetColumnDefs,
  useUpdateDriver,
} from "@/hooks/use-fleet";
import FilesEditor from "@/components/shared/table/editable-table/FilesEditor";
import { useCompanies } from "@/hooks/use-companies";
import {
  ArrowLeft,
  Car,
  MapPin,
  Calendar,
  Clock,
  Navigation,
  ShieldCheck,
  UserCircle2,
  AlertCircle,
  TrendingUp,
  History as HistoryIcon,
  Info,
  ExternalLink,
  Milestone,
  Mail,
  Briefcase,
  Fingerprint,
  Fuel,
  Paperclip,
  FileText,
  Download,
  Image as ImageIcon,
  Video,
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

export default function DriverDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  const { data: assignment, isLoading } = useDriver(companyId, id as string);
  const supabase = createClient();
  const { data: rawCustomColumns = [] } = useFleetColumnDefs(
    "drivers",
    companyId,
  );
  const customColumns = (rawCustomColumns as any[]).map((def) => ({
    id: def.id,
    header: def.field_label,
    accessorKey: def.field_name,
    meta: { type: def.field_type },
  }));
  const updateMutation = useUpdateDriver(companyId);

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

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">
          Driver Assignment Not Found
        </h2>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </Button>
      </div>
    );
  }

  const driver = assignment.employee;
  const vehicle = assignment.vehicle;
  const trips = assignment.trips || [];

  const initials =
    `${driver?.first_name?.[0] || ""}${driver?.last_name?.[0] || ""}`.toUpperCase();
  const isActive =
    !assignment.end_date || new Date(assignment.end_date) >= new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="rounded-2xl hover:bg-white border border-slate-200 h-10 px-4 group shadow-sm bg-white/50 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 mr-2 group-hover:translate-x-[-2px] transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            Back to Drivers
          </span>
        </Button>

        <div className="flex items-center gap-3">
          <Badge
            variant={isActive ? "success" : "default"}
            className="font-bold uppercase tracking-widest px-3 py-1"
          >
            {isActive ? "Active Duty" : "Assignment Ended"}
          </Badge>
          <div className="w-px h-6 bg-slate-200" />
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
            REF: {assignment.id.substring(0, 8)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-900/5 p-8 flex flex-col items-center text-center sticky top-6"
          >
            <div className="relative">
              <div className="w-32 h-32 rounded-[3.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 text-4xl font-black shadow-xl shadow-indigo-200/20 border-4 border-white">
                {initials}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white w-10 h-10 rounded-3xl border border-indigo-100 flex items-center justify-center shadow-lg">
                <Navigation className="w-5 h-5 text-indigo-500" />
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-black text-slate-900 leading-none tracking-tight">
              {driver?.first_name} {driver?.last_name}
            </h1>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[9px] mt-2">
              Personnel ID: {driver?.employee_code || "N/A"}
            </p>

            <div className="w-full grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Position
                </p>
                <span className="text-xs font-black text-slate-700 uppercase truncate w-full text-center">
                  {driver?.job_title || "Driver"}
                </span>
              </div>
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Status
                </p>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
                  />
                  <span className="text-xs font-black text-slate-700 uppercase">
                    {isActive ? "Active" : "Ended"}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 my-8" />

            <div className="space-y-3 w-full">
              <SectionItem
                icon={<Mail className="w-4 h-4" />}
                title="Official Email"
                value={driver?.email || "—"}
              />
              <SectionItem
                icon={<Calendar className="w-4 h-4" />}
                title="Assigned On"
                value={new Date(assignment.start_date).toLocaleDateString()}
              />
              <SectionItem
                icon={<Clock className="w-4 h-4" />}
                title="Total Trips"
                value={trips.length.toString()}
              />
            </div>
          </motion.div>
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[40px] border border-slate-200/60 shadow-xl overflow-hidden min-h-[600px]"
          >
            <Tabs defaultValue="vehicle" className="w-full">
              <div className="px-8 pt-8 pb-4 border-b border-slate-100 font-black uppercase text-[10px] tracking-widest">
                <TabsList className="bg-slate-100/50 p-1 rounded-2xl gap-2 h-12 border border-slate-200/50">
                  <TabsTrigger
                    value="vehicle"
                    className="rounded-xl px-6 data-[state=active]:bg-white outline-none data-[state=active]:shadow-sm"
                  >
                    <Car className="w-3.5 h-3.5 mr-2" />
                    Asset Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="trips"
                    className="rounded-xl px-6 data-[state=active]:bg-white outline-none data-[state=active]:shadow-sm"
                  >
                    <HistoryIcon className="w-3.5 h-3.5 mr-2" />
                    Trip Ledger
                  </TabsTrigger>
                  <TabsTrigger
                    value="meta"
                    className="rounded-xl px-6 data-[state=active]:bg-white outline-none data-[state=active]:shadow-sm"
                  >
                    <Info className="w-3.5 h-3.5 mr-2" />
                    Configuration
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-8">
                {/* 1. Vehicle Tab */}
                <TabsContent value="vehicle" className="mt-0 outline-none">
                  {vehicle ? (
                    <div className="space-y-8">
                      <div className="flex items-center gap-8 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100">
                        <div className="w-24 h-24 rounded-[2rem] bg-white shadow-xl shadow-indigo-900/5 flex items-center justify-center text-indigo-600 border border-slate-100">
                          <Car className="w-10 h-10" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 leading-tight">
                            {vehicle.make} {vehicle.model}
                          </h2>
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-2">
                            VIN: {vehicle.vehicle_number || "N/A"}
                          </p>
                          <div className="mt-4 flex gap-2">
                            <Badge
                              variant="outline"
                              className="bg-white border-slate-200 text-[10px] font-black px-3 py-1"
                            >
                              {vehicle.license_plate}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-white border-slate-200 text-[10px] font-black px-3 py-1 uppercase"
                            >
                              {vehicle.vehicle_type || "Commercial"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        <StatusCard
                          icon={<Milestone className="w-4 h-4" />}
                          label="Odometer"
                          value={`${vehicle.current_odometer || 0} km`}
                          color="blue"
                        />
                        <StatusCard
                          icon={<Fuel className="w-4 h-4" />}
                          label="Fuel Source"
                          value={vehicle.fuel_type || "Petrol"}
                          color="amber"
                        />
                        <StatusCard
                          icon={<ShieldCheck className="w-4 h-4" />}
                          label="Compliance"
                          value={vehicle.status || "Active"}
                          color="emerald"
                        />
                      </div>

                      <section className="bg-indigo-50/50 p-8 rounded-[2.5rem] flex items-center justify-between border border-indigo-100/60 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <MapPin className="w-24 h-24 text-indigo-300" />
                        </div>
                        <div className="flex items-center gap-5 relative z-10">
                          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-2">
                              Operational Assignment
                            </p>
                            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">
                              Main Hub • Region 142
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-2xl text-[9px] font-black uppercase px-6 bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          Track Asset
                        </Button>
                      </section>
                    </div>
                  ) : (
                    <div className="py-20 flex flex-col items-center text-center">
                      <HelpCircle className="w-12 h-12 text-slate-200 mb-4" />
                      <h3 className="text-sm font-black text-slate-400 uppercase">
                        No asset currently linked
                      </h3>
                      <p className="text-xs text-slate-300 mt-2">
                        Assign a vehicle to this contract to monitor logistics.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* 2. Trips Ledger Tab */}
                <TabsContent value="trips" className="mt-0 outline-none">
                  <div className="space-y-4">
                    <div className="border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-5">Objective</th>
                            <th className="px-8 py-5">Logistics</th>
                            <th className="px-8 py-5 text-right">Sequence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {trips.map((trip: any) => (
                            <tr
                              key={trip.id}
                              className="hover:bg-slate-50/50 transition-colors group"
                            >
                              <td className="px-8 py-5">
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-800 uppercase leading-none mb-1.5">
                                    {trip.purpose || "Cargo Mission"}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                                      {trip.status || "Completed"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-600">
                                    <Navigation className="w-3 h-3 text-indigo-400" />
                                    <span>
                                      Distance: {trip.distance || 0} KM
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      Recorded:{" "}
                                      {new Date(
                                        trip.start_time,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <Button
                                  variant="ghost"
                                  className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100"
                                >
                                  <ExternalLink className="w-4 h-4 text-slate-300" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {trips.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-24 text-center opacity-30 grayscale italic text-[10px] uppercase font-black tracking-widest"
                              >
                                Initial Voyage Pending Records
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* 3. Meta Tab */}
                <TabsContent value="meta" className="mt-0 outline-none">
                  <section className="space-y-6">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                      <Fingerprint className="w-4 h-4 text-indigo-600" />{" "}
                      Contract Customization
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {customColumns.map((col: any) => {
                        const val = assignment.custom_fields?.[col.accessorKey];
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
                            className="col-span-2 space-y-2 group"
                          >
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 group-hover:text-indigo-400">
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
                                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors group w-full">
                                    <p className="text-sm font-black text-slate-700">
                                      {typeof val === "object"
                                        ? JSON.stringify(val)
                                        : String(val)}
                                    </p>
                                  </div>
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
                      {(customColumns.length === 0 ||
                        !assignment.custom_fields ||
                        Object.keys(assignment.custom_fields).length === 0) && (
                        <div className="col-span-2 py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center">
                          <AlertCircle className="w-10 h-10 text-slate-200 mb-4" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                            No extended attributes defined
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </div>
      </div>

      {filesEditorOpen && (
        <FilesEditor
          open={filesEditorOpen}
          onClose={() => setFilesEditorOpen(false)}
          title={`Managing ${customColumns.find((c: any) => c.accessorKey === activeFilesField)?.header || "Files"}`}
          initialFiles={currentFiles}
          tableName="drivers"
          recordId={id as string}
          onSave={(files) => {
            if (!activeFilesField) return;
            const newCustomFields = {
              ...(assignment.custom_fields || {}),
              [activeFilesField]: files,
            };
            updateMutation.mutate(
              {
                id: assignment.id,
                custom_fields: newCustomFields,
              },
              {
                onSuccess: () => {
                  toast.success("Files updated successfully");
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

function SectionItem({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 text-left p-4 rounded-3xl hover:bg-slate-50 transition-all group">
      <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-900/20 transition-all">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">
          {title}
        </p>
        <p className="text-[13px] font-black text-slate-700 leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50/50 text-blue-600 border-blue-100 shadow-blue-900/5",
    emerald:
      "bg-emerald-50/50 text-emerald-600 border-emerald-100 shadow-emerald-900/5",
    amber: "bg-amber-50/50 text-amber-600 border-amber-100 shadow-amber-900/5",
  };

  return (
    <div
      className={`p-6 rounded-[2.5rem] border shadow-xl ${colors[color]} group hover:scale-[1.02] transition-transform`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-black/5 group-hover:shadow-md transition-shadow">
          {icon}
        </div>
        <div className="text-[8px] font-black uppercase tracking-tighter opacity-30 font-mono">
          SENSOR_SYS
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">
          {label}
        </p>
        <p className="text-lg font-black tracking-tighter leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

function HelpCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
