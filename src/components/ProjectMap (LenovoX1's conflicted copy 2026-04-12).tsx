"use client";

import { useEffect, useState } from "react";
import { locations } from "@/lib/locations";
import { subProjects, getMainProjectById } from "@/lib/data";

const statusColor: Record<string, string> = {
  approved: "#16A34A",
  completed: "#2563EB",
  pending: "#CA8A04",
  revision: "#DC2626",
};

export default function ProjectMap() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg bg-gray-100">
        <p className="text-sm text-gray-500">กำลังโหลดแผนที่...</p>
      </div>
    );
  }

  return <MapInner />;
}

function MapInner() {
  const [L, setL] = useState<any>(null);
  const [RL, setRL] = useState<any>(null);

  useEffect(() => {
    // Dynamic import เพื่อหลีกเลี่ยง SSR
    Promise.all([import("leaflet"), import("react-leaflet")]).then(
      ([leaflet, reactLeaflet]) => {
        setL(leaflet.default);
        setRL(reactLeaflet);
      }
    );
  }, []);

  if (!L || !RL) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg bg-gray-100">
        <p className="text-sm text-gray-500">กำลังโหลดแผนที่...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = RL;

  // Center of northern Thailand
  const center: [number, number] = [19.0, 99.5];

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <MapContainer
        center={center}
        zoom={7}
        style={{ height: "500px", width: "100%", borderRadius: "0.5rem" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc) => {
          const locProjects = loc.subProjectIds
            .map((id) => subProjects.find((sp) => sp.id === id))
            .filter(Boolean);
          const hasProjects = locProjects.length > 0;
          const primaryStatus = locProjects[0]?.status || "pending";
          const color = hasProjects
            ? statusColor[primaryStatus] || "#6B7280"
            : "#6B7280";
          const radius = hasProjects ? 8 + locProjects.length * 2 : 6;

          return (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                weight: 2,
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="text-sm font-bold">{loc.name}</h3>
                  <p className="text-xs text-gray-500">{loc.province}</p>
                  {locProjects.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {locProjects.map((sp) => {
                        if (!sp) return null;
                        const main = getMainProjectById(sp.mainProjectId);
                        return (
                          <a
                            key={sp.id}
                            href={`/projects/${sp.id}`}
                            className="block rounded bg-gray-50 p-1.5 text-xs hover:bg-blue-50"
                          >
                            <span className="font-medium text-blue-600">
                              {sp.code}
                            </span>{" "}
                            {sp.name.length > 50
                              ? sp.name.substring(0, 50) + "..."
                              : sp.name}
                            <br />
                            <span className="text-gray-400">
                              {sp.budget.toLocaleString("th-TH")} บาท |{" "}
                              {main?.source}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">
                      ยังไม่มีโครงการในระบบ
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </>
  );
}
