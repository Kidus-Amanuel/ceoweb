"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Truck, Plus, Map, List, User, Search, Filter } from "lucide-react";
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
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [vRes, eRes] = await Promise.all([
        fetch('/api/fleet/vehicles'),
        fetch('/api/hr/employees')
      ]);
      
      const [vehicles, empList] = await Promise.all([
        vRes.ok ? vRes.json() : [],
        eRes.ok ? eRes.json() : []
      ]);
      
      setData(vehicles || []);
      setEmployees(empList || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const employeeOptions = useMemo(() => 
    employees.map(e => ({ label: e.name, value: e.id })), 
  [employees]);

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
          options: employeeOptions 
        },
        cell: ({ row }: any) => {
          const driverId = row.original.assigned_driver_id;
          const driver = employees.find(e => e.id === driverId);
          if (!driver) return <span className="text-muted-foreground italic text-xs">Unassigned</span>;
          return (
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-xs font-medium text-slate-700">{driver.name}</span>
            </div>
          );
        }
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
    [employeeOptions, employees],
  );

  const filteredData = useMemo(() => {
    return data.filter((v) => {
      const driver = employees.find(e => e.id === v.assigned_driver_id);
      const searchStr = `${v.make} ${v.model} ${v.license_plate} ${driver?.name || ''} ${v.custom_fields?.gps_id || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      const isActive = v.is_active || v.traccar_status?.trim() === 'online';
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'online' && isActive) || 
                           (statusFilter === 'offline' && !isActive);
                           
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter, employees]);

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
      
      // Prepare body with custom fields
      const body = {
        ...newItem,
        custom_fields: {
          gps_id: newItem.gps_id,
          gps_status: newItem.gps_status || 'inactive',
          assignment_status: newItem.assignment_status || (newItem.assigned_driver_id ? 'assigned' : 'unassigned')
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
