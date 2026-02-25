"use client";

import { useMemo, useState, useEffect } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Truck, Plus, Map, List } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";


export default function VehiclesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fleet/vehicles');
      if (!res.ok) throw new Error('Failed to fetch');
      const vehicles = await res.json();
      setData(vehicles || []);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const columns = useMemo(
    () => [
      {
        header: "Vehicle ID",
        accessorKey: "vehicle_number",
        cell: ({ row }: any) => (
          <span className="font-mono text-xs font-bold">{row.original.vehicle_number}</span>
        ),
      },
      {
        header: "Make",
        accessorKey: "make",
      },
      {
        header: "Model",
        accessorKey: "model",
      },
      {
        header: "Plate",
        accessorKey: "license_plate",
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }: any) => {
          const status = row.original.status;
          return (
            <Badge
              variant={status === "active" ? "success" : status === "maintenance" ? "destructive" : "default"}
            >
              {status}
            </Badge>
          );
        },
      },
      {
        header: "Location",
        accessorKey: "last_location_at",
        cell: ({ row }: any) => {
          if (!row.original.last_known_lat) return <span className="text-muted-foreground italic text-xs">No GPS fix</span>;
          return <span className="text-xs">{row.original.last_location_at ? new Date(row.original.last_location_at).toLocaleString() : 'Recent'}</span>;
        }
      }
    ],
    [],
  );

  const handleUpdate = async (id: string, updatedFields: any) => {
    // Basic update logic - in production you'd call a server action
    setData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updatedFields } : item,
      ),
    );
  };

  const handleAdd = async (newItem: any) => {
    try {
      console.log("Creating vehicle and syncing to Traccar...");
      const res = await fetch('/api/fleet/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (!res.ok) throw new Error('Failed to create');
      const created = await res.json();
      setData([created, ...data]);
      console.log("Vehicle created and synced successfully!");
    } catch (error) {
      console.error("Failed to sync vehicle with Traccar:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/fleet/vehicles/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      setData(data.filter((item) => item.id !== id));
      console.log("Vehicle removed");
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Fleet Asset Management</h1>
          <p className="text-sm text-muted-foreground">Unified registry with real-time Traccar synchronization.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
            className="gap-2"
          >
            {viewMode === "list" ? <Map className="w-4 h-4" /> : <List className="w-4 h-4" />}
            {viewMode === "list" ? "Show Map View" : "Show Table View"}
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add Vehicle
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm min-h-[400px]">
        {viewMode === "list" ? (
          <EditableTable
            title="Asset Registry"
            description="Detailed information for all physical assets in the fleet."
            data={data}
            columns={columns}
            onUpdate={handleUpdate}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        ) : (
          <div className="w-full h-[600px] flex flex-col items-center justify-center bg-slate-50">
             <Map className="w-12 h-12 text-slate-300 mb-4 animate-pulse" />
             <p className="text-slate-500 text-sm">Traccar Live Map Integration Loading...</p>
             <p className="text-xs text-slate-400 mt-2">Secure token generation in progress.</p>
          </div>
        )}
      </div>
    </div>
  );
}
