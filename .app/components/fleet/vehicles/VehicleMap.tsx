"use client";

import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import {
  Truck,
  MapPin,
  Power,
  Signal,
  Activity,
  Clock,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

/**
 * --- Custom Icon Creator ---
 * Uses Lucide icons rendered to static HTML for Leaflet markers.
 */
const createVehicleIcon = (
  status: string,
  ignition: boolean,
  isSelected: boolean = false,
) => {
  const isOnline = status === "online";
  // Emerald for Driving, Blue for Online/Idle, Slate for Offline
  const color = isOnline ? (ignition ? "#10b981" : "#3b82f6") : "#94a3b8";

  return L.divIcon({
    html: ReactDOMServer.renderToString(
      <div
        className={`relative flex items-center justify-center transition-all duration-300 ${isSelected ? "scale-110 z-[1000]" : "scale-100"}`}
      >
        <div className="relative">
          {/* Main Marker Pin */}
          <MapPin
            className="h-10 w-10 drop-shadow-2xl"
            style={{ color: color, fill: "white" }}
          />

          {/* Internal Vehicle Icon */}
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 rounded-full p-0.5">
            <Truck className="h-4 w-4" style={{ color: color }} />
          </div>
        </div>

        {/* Live Status Indicator */}
        {isOnline && (
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ignition ? "bg-emerald-400" : "bg-blue-400"}`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${ignition ? "bg-emerald-500" : "bg-blue-500"}`}
            ></span>
          </div>
        )}
      </div>,
    ),
    className: "custom-vehicle-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -42],
  });
};

/**
 * --- Auto-bounds Controller ---
 */
function MapAutoBounds({ markers }: { markers: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [markers, map]);
  return null;
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  make?: string;
  model?: string;
  license_plate?: string;
  last_known_lat?: number;
  last_known_lng?: number;
  last_location_at?: string;
  ignition_status?: boolean;
  traccar_status?: string;
  is_active?: boolean;
}

interface VehicleMapProps {
  vehicles: Vehicle[];
}

export default function VehicleMap({ vehicles = [] }: VehicleMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      // Fix for grey area on load
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("resize"));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Filter and parse coordinates
  const trackedVehicles = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          v.last_known_lat !== null &&
          v.last_known_lng !== null &&
          !(Number(v.last_known_lat) === 0 && Number(v.last_known_lng) === 0),
      ),
    [vehicles],
  );

  const markerPositions = useMemo(
    () =>
      trackedVehicles.map(
        (v) =>
          [Number(v.last_known_lat), Number(v.last_known_lng)] as [
            number,
            number,
          ],
      ),
    [trackedVehicles],
  );

  const stats = useMemo(
    () => ({
      total: vehicles.length,
      online: vehicles.filter((v) => v.traccar_status?.trim() === "online")
        .length,
      moving: vehicles.filter(
        (v) => v.traccar_status?.trim() === "online" && v.ignition_status,
      ).length,
      tracked: trackedVehicles.length,
    }),
    [vehicles, trackedVehicles],
  );

  if (!isMounted) {
    return (
      <div className="min-h-[650px] w-full bg-slate-50 flex flex-col items-center justify-center rounded-[2rem] border border-slate-100 border-dashed animate-pulse">
        <Activity className="w-8 h-8 text-blue-500 mb-2" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Waking up fleet engines...
        </p>
      </div>
    );
  }

  return (
    <div className="h-[650px] w-full relative overflow-hidden rounded-[2rem] shadow-2xl border border-white group">
      {/* 🧩 Map Container */}
      <MapContainer
        center={[9.032, 38.75]} // Addis Ababa Default
        zoom={13}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {trackedVehicles.map((v) => (
          <Marker
            key={v.id}
            position={[Number(v.last_known_lat), Number(v.last_known_lng)]}
            icon={createVehicleIcon(
              v.traccar_status?.trim() || "offline",
              v.ignition_status || false,
              selectedId === v.id,
            )}
            eventHandlers={{
              click: () => setSelectedId(v.id),
            }}
          >
            <Popup className="premium-map-popup" minWidth={240}>
              <div className="p-3">
                {/* Popup Header */}
                <div className="flex items-start gap-4 mb-4 border-b border-slate-100 pb-3">
                  <div
                    className={`p-2.5 rounded-2xl ${v.traccar_status?.trim() === "online" ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400"}`}
                  >
                    <Truck size={22} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-base leading-none mb-1 uppercase tracking-tight truncate">
                      {v.vehicle_number || "ASSET-1"}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {v.license_plate || "N/A"}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <span className="text-[10px] font-bold text-blue-500 uppercase">
                        {v.make}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Matrix */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 flex flex-col gap-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Engine Power
                    </p>
                    <div className="flex items-center gap-2">
                      <Power
                        className={
                          v.ignition_status
                            ? "text-emerald-500"
                            : "text-slate-300"
                        }
                        size={14}
                        strokeWidth={3}
                      />
                      <span
                        className={`text-xs font-black ${v.ignition_status ? "text-emerald-600" : "text-slate-500"} uppercase`}
                      >
                        {v.ignition_status ? "ACTIVE" : "IDLE"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 flex flex-col gap-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Network Status
                    </p>
                    <div className="flex items-center gap-2">
                      <Signal
                        className={
                          v.traccar_status?.trim() === "online"
                            ? "text-blue-500"
                            : "text-slate-300"
                        }
                        size={14}
                        strokeWidth={3}
                      />
                      <span
                        className={`text-xs font-black ${v.traccar_status?.trim() === "online" ? "text-blue-600" : "text-slate-500"} uppercase`}
                      >
                        {v.traccar_status?.trim() === "online"
                          ? "LIVE"
                          : "LOST"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Data Footer */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {v.last_location_at
                        ? new Date(v.last_location_at).toLocaleTimeString()
                        : "WAITING..."}
                    </span>
                  </div>
                  <button className="h-8 px-4 bg-slate-900 hover:bg-black text-[10px] font-black text-white rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 uppercase tracking-widest">
                    <Navigation size={12} fill="white" />
                    Focus
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {markerPositions.length > 0 && (
          <MapAutoBounds markers={markerPositions} />
        )}
      </MapContainer>

      {/* 📊 Console Legendary Legend */}
      <div className="absolute top-6 right-6 z-[1000] pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl border border-white p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col gap-4 min-w-[220px] pointer-events-auto">
          <div className="flex items-center justify-between gap-4 border-b pb-3 border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">
                Fleet Monitor
              </h3>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 text-[8px] font-black border border-blue-100">
              STABLE
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-3xl font-black text-slate-900 tracking-tighter">
                {stats.online}
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] font-black text-emerald-600 uppercase">
                  ONLINE
                </span>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-3xl font-black text-slate-300 tracking-tighter">
                {stats.total - stats.online}
              </p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[9px] font-black text-slate-400 uppercase">
                  OFFLINE
                </span>
                <div className="w-2 h-2 rounded-full bg-slate-300" />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                Coverage
              </span>
              <span className="text-xs font-black text-slate-700">
                {Math.round((stats.tracked / stats.total) * 100 || 0)}% SIGNAL
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-800 uppercase">
                {stats.tracked} / {stats.total}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 2rem !important;
          padding: 0 !important;
          overflow: hidden !important;
          border: 4px solid white !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip {
          background: white !important;
          box-shadow: none !important;
        }
        .custom-vehicle-icon {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
