"use client";
import { createClient } from "@/lib/supabase/client";
import { FilePreviewCard } from "@/components/shared/FilePreviewCard";

import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  useVehicle,
  useFleetColumnDefs,
  useUpdateVehicle,
} from "@/hooks/use-fleet";
import FilesEditor from "@/components/shared/table/editable-table/FilesEditor";
import { useCompanies } from "@/hooks/use-companies";
import {
  ArrowLeft,
  Car,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  UserCircle2,
  AlertCircle,
  TrendingUp,
  History as HistoryIcon,
  Info,
  ExternalLink,
  Milestone,
  Wrench,
  Navigation,
  Fuel,
  Activity,
  User,
  Truck,
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

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  const { data: vehicle, isLoading } = useVehicle(companyId, id as string);
  const supabase = createClient();
  const { data: rawCustomColumns = [] } = useFleetColumnDefs(
    "vehicles",
    companyId,
  );
  const customColumns = (rawCustomColumns as any[]).map((def) => ({
    id: def.id,
    header: def.field_label,
    accessorKey: def.field_name,
    meta: { type: def.field_type },
  }));
  const updateMutation = useUpdateVehicle(companyId);

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

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">
          Asset Not Found
        </h2>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Fleet
        </Button>
      </div>
    );
  }

  const currentAssignment = vehicle.assignments?.find(
    (a: any) => !a.end_date || new Date(a.end_date) >= new Date(),
  );
  const driver = currentAssignment?.employee;
  const maintenance = vehicle.maintenance || [];
  const trips = vehicle.trips || [];

  const isOnline = vehicle.traccar_status === "online";
  const lastLocation =
    vehicle.last_known_lat && vehicle.last_known_lng
      ? `${Number(vehicle.last_known_lat).toFixed(5)}, ${Number(vehicle.last_known_lng).toFixed(5)}`
      : null;

  const handleDownload = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("erp-files")
        .createSignedUrl(path, 3600); // 1 hour expiry, no force download

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
            Back to Fleet
          </span>
        </Button>

        <div className="flex items-center gap-3">
          <Badge
            variant={vehicle.status === "active" ? "success" : "default"}
            className="font-bold uppercase tracking-widest px-3 py-1"
          >
            {vehicle.status || "Operational"}
          </Badge>
          <div className="w-px h-6 bg-slate-200" />
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
            VIN: {vehicle.vin || "ID_PENDING"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-indigo-900/5 p-8 flex flex-col items-center text-center sticky top-6"
          >
            <div className="relative">
              <div className="w-32 h-32 rounded-[3.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 text-4xl shadow-xl shadow-indigo-100/50 border-4 border-white">
                <Truck className="w-12 h-12" />
              </div>
              <div
                className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-3xl border-4 border-white flex items-center justify-center shadow-lg ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-black text-slate-900 leading-none tracking-tight">
              {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[9px] mt-2">
              Plate: {vehicle.license_plate}
            </p>

            <div className="w-full grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Odometer
                </p>
                <span className="text-xs font-black text-slate-700 uppercase">
                  {vehicle.current_odometer || 0} KM
                </span>
              </div>
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Fuel Type
                </p>
                <span className="text-xs font-black text-amber-600 uppercase">
                  {vehicle.fuel_type || "Petrol"}
                </span>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 my-8" />

            <div className="space-y-3 w-full">
              <SectionItem
                icon={<User className="w-4 h-4" />}
                title="Active Driver"
                value={
                  driver
                    ? `${driver.first_name} ${driver.last_name}`
                    : "Unassigned"
                }
              />
              <SectionItem
                icon={<Wrench className="w-4 h-4" />}
                title="Last Service"
                value={
                  maintenance[0]
                    ? new Date(maintenance[0].service_date).toLocaleDateString()
                    : "No Records"
                }
              />
              <SectionItem
                icon={<Milestone className="w-4 h-4" />}
                title="Year"
                value={vehicle.year?.toString() || "2024"}
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
            <Tabs defaultValue="overview" className="w-full">
              <div className="px-8 pt-8 pb-4 border-b border-slate-100 font-black uppercase text-[10px] tracking-widest">
                <TabsList className="bg-slate-100/50 p-1 rounded-2xl gap-2 h-12 border border-slate-200/50">
                  <TabsTrigger
                    value="overview"
                    className="rounded-xl px-6 data-[state=active]:bg-white outline-none data-[state=active]:shadow-sm text-slate-500 data-[state=active]:text-indigo-600"
                  >
                    <HistoryIcon className="w-3.5 h-3.5 mr-2" />
                    Trip Ledger
                  </TabsTrigger>
                  <TabsTrigger
                    value="maintenance"
                    className="rounded-xl px-6 data-[state=active]:bg-white outline-none data-[state=active]:shadow-sm text-slate-500 data-[state=active]:text-indigo-600"
                  >
                    <Wrench className="w-3.5 h-3.5 mr-2" />
                    Maintenance
                  </TabsTrigger>
                  <TabsTrigger
                    value="specs"
                    className="rounded-xl px-6 data-[state=active]:bg-white outline-none data-[state=active]:shadow-sm text-slate-500 data-[state=active]:text-indigo-600"
                  >
                    <Info className="w-3.5 h-3.5 mr-2" />
                    Specifications
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-8">
                {/* 1. Trip Ledger Tab */}
                <TabsContent value="overview" className="mt-0 outline-none">
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-6">
                      <StatusCard
                        icon={<Navigation className="w-4 h-4" />}
                        label="Live Track"
                        value={
                          isOnline
                            ? "Streaming"
                            : vehicle.last_location_at
                              ? new Date(
                                  vehicle.last_location_at,
                                ).toLocaleString()
                              : "Offline"
                        }
                        color={isOnline ? "emerald" : "amber"}
                      />
                      <StatusCard
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Total Distance"
                        value={`${trips.reduce((acc: number, t: any) => acc + (t.distance || 0), 0)} KM`}
                        color="blue"
                      />
                      <StatusCard
                        icon={<MapPin className="w-4 h-4" />}
                        label="Last Position"
                        value={lastLocation || "No Signal"}
                        color="blue"
                      />
                    </div>

                    <div className="border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b">
                          <tr>
                            <th className="px-8 py-5">Objective</th>
                            <th className="px-8 py-5">Logistics</th>
                            <th className="px-8 py-5">Sequence</th>
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
                                  <Badge
                                    variant="outline"
                                    className="w-fit text-[8px] font-black px-1.5 bg-white uppercase"
                                  >
                                    {trip.status}
                                  </Badge>
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
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <span className="text-[10px] font-black text-slate-400 uppercase">
                                  {new Date(
                                    trip.start_time,
                                  ).toLocaleDateString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {trips.length === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="py-24 text-center opacity-30 grayscale italic text-[10px] uppercase font-black tracking-widest"
                              >
                                No voyage records detected
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* 2. Maintenance Tab */}
                <TabsContent value="maintenance" className="mt-0 outline-none">
                  <div className="space-y-4">
                    {maintenance.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-500">
                            <Wrench className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase leading-none mb-2">
                              {m.service_type || "Routine Maintenance"}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {new Date(m.service_date).toLocaleDateString()}
                              </span>
                              <div className="w-1 h-1 rounded-full bg-slate-200" />
                              <span className="text-[10px] font-black text-indigo-500 uppercase">
                                {m.cost ? `$${m.cost}` : "Internal Service"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-white border-slate-100 text-[10px] font-black uppercase text-slate-600 shadow-sm">
                          {m.status || "Completed"}
                        </Badge>
                      </div>
                    ))}
                    {maintenance.length === 0 && (
                      <div className="py-24 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center">
                        <Wrench className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          No maintenance history recorded
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* 3. Specifications Tab */}
                <TabsContent value="specs" className="mt-0 outline-none">
                  <section className="space-y-6">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                      <Fuel className="w-4 h-4 text-indigo-600" /> Technical
                      Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Internal Ref
                        </p>
                        <p className="text-sm font-black text-slate-700">
                          {vehicle.vehicle_number || "N/A"}
                        </p>
                      </div>
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Type Profile
                        </p>
                        <p className="text-sm font-black text-slate-700 uppercase">
                          {vehicle.vehicle_types?.name || "Standard Asset"}
                        </p>
                      </div>
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          GPS Identifier
                        </p>
                        <p className="text-sm font-black text-indigo-600 font-mono">
                          {vehicle.custom_fields?.gps_id || "NOT_CONFIGURED"}
                        </p>
                      </div>
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Last Coordinates
                        </p>
                        <p className="text-sm font-black text-slate-700 font-mono">
                          {lastLocation || "WAITING_FOR_SIGNAL"}
                        </p>
                      </div>
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Assignment Status
                        </p>
                        <Badge
                          variant={
                            vehicle.assigned_driver_id ? "success" : "default"
                          }
                          className="font-bold uppercase tracking-widest text-[10px]"
                        >
                          {vehicle.custom_fields?.assignment_status ||
                            (vehicle.assigned_driver_id
                              ? "Assigned"
                              : "Unassigned")}
                        </Badge>
                      </div>
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 col-span-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          VIN (Vehicle Identification Number)
                        </p>
                        <p className="text-sm font-black text-slate-700 font-mono tracking-wider">
                          {vehicle.vin || "NO_VIN_RECORDED"}
                        </p>
                      </div>
                      {customColumns.map((col: any) => {
                        const val = vehicle.custom_fields?.[col.accessorKey];
                        const isFile = col.meta?.type === "files";

                        // Skip if empty AND not a file type (files should show 'Manage' even if empty)
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
                        !vehicle.custom_fields ||
                        Object.keys(vehicle.custom_fields).length === 0) && (
                        <div className="col-span-2 py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
                          <AlertCircle className="w-8 h-8 text-slate-200 mb-2" />
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                            No additional technical specs
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
          tableName="vehicles"
          recordId={id as string}
          onSave={(files) => {
            if (!activeFilesField) return;
            const newCustomFields = {
              ...(vehicle.custom_fields || {}),
              [activeFilesField]: files,
            };
            updateMutation.mutate(
              {
                id: vehicle.id,
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
      <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">
          {title}
        </p>
        <p className="text-[13px] font-black text-slate-700 leading-tight uppercase">
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
    blue: "bg-blue-50/50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50/50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50/50 text-amber-600 border-amber-100",
  };

  return (
    <div
      className={`p-6 rounded-[2.5rem] border shadow-sm ${colors[color]} group hover:scale-[1.02] transition-all`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-black/5 group-hover:shadow-indigo-900/10 transition-shadow">
          {icon}
        </div>
        <div className="text-[8px] font-black uppercase tracking-tighter opacity-30 font-mono italic">
          ACTIVE_SENSE
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
