"use client";

import { useMemo, useState, useEffect } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Truck, Plus, Map, List, Search, Filter } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import dynamic from 'next/dynamic';

// Dynamically import Map to avoid SSR issues with Leaflet
const VehicleMap = dynamic(() => import('@/components/fleet/vehicles/VehicleMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-[600px] flex items-center justify-center bg-slate-50 text-slate-400">Loading Map Environment...</div>
});

export default function VehiclesPage() {
  const [data, setData] = useState<any[]>([]);
  // drivers: shaped records from driver_assignments (each has driver_id + driver_name)
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [vRes, dRes] = await Promise.all([
        fetch('/api/fleet/vehicles'),
        fetch('/api/fleet/drivers'),  // only actual drivers, not all employees
      ]);
      
      const [vehicles, driverList] = await Promise.all([
        vRes.ok ? vRes.json() : [],
        dRes.ok ? dRes.json() : [],
      ]);
      
      setData(vehicles || []);
      setDrivers(driverList || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Build unique driver options from driver_assignments.
  // driver_id is the UUID of the employee; driver_name is the display label.
  // Use 'none' as the sentinel for "Unassigned" — never use '' as a Select value.
  const driverOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [
      { label: '— Unassigned —', value: 'none' },
    ];
    for (const d of drivers) {
      if (d.driver_id && !seen.has(d.driver_id)) {
        seen.add(d.driver_id);
        opts.push({ label: d.driver_name || d.driver_id, value: d.driver_id });
      }
    }
    return opts;
  }, [drivers]);

  const columns = useMemo(
    () => [
      {
        header: "Make / Model",
        accessorKey: "model",
        cell: ({ row }: any) => (
          <span className="text-sm font-medium text-slate-700">{row.original.make} {row.original.model}</span>
        ),
      },
      {
        header: "Plate",
        accessorKey: "license_plate",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="font-mono text-xs text-slate-600">{row.original.license_plate || "-"}</span>
        ),
      },
      {
        header: "Driver",
        accessorKey: "assigned_driver_id",
        meta: { 
          type: "select" as const, 
          options: driverOptions,
        },
        cell: ({ row }: any) => {
          const driverId = row.original.assigned_driver_id;
          // Find the driver record from driver_assignments that matches this vehicle's assigned driver
          const driverRecord = drivers.find(d => d.driver_id === driverId);
          if (!driverId || !driverRecord)
            return <span className="text-muted-foreground italic text-xs">Unassigned</span>;
          return (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-[9px] font-black flex-shrink-0">
                {(driverRecord.driver_name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 leading-tight">{driverRecord.driver_name}</p>
                {driverRecord.driver_title && (
                  <p className="text-[9px] text-slate-400 leading-tight">{driverRecord.driver_title}</p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        header: "GPS Status",
        accessorKey: "gps_status",
        meta: { readOnly: true },
        cell: ({ row }: any) => {
          const status = row.original.traccar_status || (row.original.last_known_lat ? "active" : "inactive");
          const isActive = row.original.is_active || status?.trim() === 'online';
          
          return (
            <Badge
              variant={isActive ? "success" : "default"}
              className="capitalize text-[10px]"
            >
              {isActive ? "Online" : "Offline"}
            </Badge>
          );
        },
      },
      {
        header: "GPS ID",
        accessorKey: "gps_id",
        meta: { type: "text" as const },
        cell: ({ row }: any) => {
          const gpsId = row.original.custom_fields?.gps_id || "-";
          return (
            <div className="flex items-center gap-2 font-mono text-[11px] text-blue-600">
              <Map className="w-3 h-3" />
              <span>{gpsId}</span>
            </div>
          );
        },
      },
      {
        header: "Live Position / Seen",
        accessorKey: "last_location_at",
        meta: { readOnly: true },
        cell: ({ row }: any) => {
          if (!row.original.last_known_lat) return <span className="text-muted-foreground italic text-[10px]">No Signal</span>;
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-1.5 items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-mono text-slate-500">
                    {Number(row.original.last_known_lat).toFixed(5)}, {Number(row.original.last_known_lng).toFixed(5)}
                  </span>
              </div>
              <span className="text-[9px] text-slate-400 ml-3">
                {row.original.last_location_at ? new Date(row.original.last_location_at).toLocaleString() : 'Just now'}
              </span>
            </div>
          );
        }
      }
    ],
    [driverOptions, drivers],
  );

  const filteredData = useMemo(() => {
    return data.filter((v) => {
      const driverRecord = drivers.find(d => d.driver_id === v.assigned_driver_id);
      const searchStr = `${v.make} ${v.model} ${v.license_plate} ${driverRecord?.driver_name || ''} ${v.custom_fields?.gps_id || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      const isActive = v.is_active || v.traccar_status?.trim() === 'online';
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'online' && isActive) || 
                           (statusFilter === 'offline' && !isActive);
                           
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter, drivers]);

  const handleUpdate = async (id: string, updatedFields: any) => {
    // Optimistic update
    const previousData = [...data];
    setData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updatedFields } : item,
      ),
    );

    try {
      // Normalize body for API
      const body: any = { ...updatedFields };

      // Normalize driver sentinel: 'none' means unassign
      if ('assigned_driver_id' in body) {
        body.assigned_driver_id =
          body.assigned_driver_id === 'none' || !body.assigned_driver_id
            ? null
            : body.assigned_driver_id;
      }
      
      // Handle custom fields (GPS ID, GPS Status, etc)
      if ('gps_id' in updatedFields || 'gps_status' in updatedFields || 'assignment_status' in updatedFields) {
        const vehicle = data.find(v => v.id === id);
        body.custom_fields = {
          ...(vehicle?.custom_fields || {}),
          gps_id: updatedFields.gps_id || vehicle?.custom_fields?.gps_id,
          gps_status: updatedFields.gps_status || vehicle?.custom_fields?.gps_status,
          assignment_status: updatedFields.assignment_status || vehicle?.custom_fields?.assignment_status
        };
        delete body.gps_id;
        delete body.gps_status;
        delete body.assignment_status;
      }

      const res = await fetch(`/api/fleet/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      
      // Update with server data
      setData(prev => prev.map(v => v.id === id ? updated : v));
      console.log("Vehicle updated and synced successfully!");
    } catch (error) {
      console.error("Failed to update vehicle:", error);
      setData(previousData);
    }
  };

  const handleAdd = async (newItem: any) => {
    try {
      console.log("Creating vehicle...");

      // Normalize driver sentinel before sending
      const assignedDriverId =
        newItem.assigned_driver_id === 'none' || !newItem.assigned_driver_id
          ? null
          : newItem.assigned_driver_id;
      
      // Prepare body with custom fields
      const body = {
        ...newItem,
        assigned_driver_id: assignedDriverId,
        custom_fields: {
          gps_id: newItem.gps_id,
          gps_status: newItem.gps_status || 'inactive',
          assignment_status: newItem.assignment_status || (assignedDriverId ? 'assigned' : 'unassigned')
        }
      };
      delete body.gps_id;
      delete body.gps_status;
      delete body.assignment_status;

      const res = await fetch('/api/fleet/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) throw new Error('Failed to create');
      const created = await res.json();
      setData([created, ...data]);
      console.log("Vehicle created and registered.");
    } catch (error) {
      console.error("Failed to add vehicle:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/fleet/vehicles/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      setData(data.filter((item) => item.id !== id));
      console.log("Vehicle and its GPS record removed successfully");
    } catch (error: any) {
      console.error("Deletion failed:", error);
      alert(error.message);
    }
  };

  return (
    <div className="space-y-1">
      <div className="px-2 flex flex-col md:flex-row items-center justify-between gap-2">
    <div className="flex items-center gap-2 w-full md:w-auto">
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Search plate, model, driver..." 
          className="pl-10 h-11 border-slate-200/60 rounded-[1.2rem] bg-slate-50/30 focus:bg-white transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="flex items-center gap-1 bg-slate-100/40 p-1.5 rounded-2xl border border-slate-200/50">
        <Button 
          variant={statusFilter === 'all' ? 'secondary' : 'ghost'} 
          size="sm" 
          className={`h-8 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 ${statusFilter === 'all' ? 'bg-white shadow-sm' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All Units
        </Button>
        <Button 
          variant={statusFilter === 'online' ? 'secondary' : 'ghost'} 
          size="sm" 
          className={`h-8 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 gap-2 ${statusFilter === 'online' ? 'bg-white shadow-sm' : ''}`}
          onClick={() => setStatusFilter('online')}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </Button>
        <Button 
          variant={statusFilter === 'offline' ? 'secondary' : 'ghost'} 
          size="sm" 
          className={`h-8 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 gap-2 ${statusFilter === 'offline' ? 'bg-white shadow-sm' : ''}`}
          onClick={() => setStatusFilter('offline')}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Offline
        </Button>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
        className="h-11 px-6 gap-3 rounded-[1.2rem] border-slate-200/60 bg-white hover:bg-slate-50 transition-all shadow-sm"
      >
        {viewMode === "list" ? <Map className="w-4 h-4 text-blue-500" /> : <List className="w-4 h-4 text-blue-500" />}
        <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">
          {viewMode === "list" ? "Live Map" : "Asset List"}
        </span>
      </Button>
    </div>
  </div>

      <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm min-h-[600px] flex flex-col">
        {viewMode === "list" ? (
          <EditableTable
            title="Asset Registry"
            description="Manage physical assets, GPS identifiers, and driver assignments."
            data={filteredData.map(v => ({
               ...v,
               gps_id: v.custom_fields?.gps_id || "",
               gps_status: v.custom_fields?.gps_status || "inactive",
               assignment_status: v.custom_fields?.assignment_status || (v.assigned_driver_id ? "assigned" : "unassigned")
            }))}
            columns={columns}
            onUpdate={handleUpdate}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex-1 w-full relative">
            <VehicleMap vehicles={filteredData} />
          </div>
        )}
      </div>
    </div>
  );
}
