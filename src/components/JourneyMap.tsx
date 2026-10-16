"use client";

/**
 * JourneyMap — แผนที่ผลงานรายปี (ปีไหน ทำอะไร ที่ไหน ใครเป็นหัวหน้าโครงการ)
 *
 * หมุดหนึ่งจุด = หนึ่งพื้นที่ รวมงานทุกชิ้นในช่วงปีที่เลือก · ขนาดตามจำนวนงาน · สีตามระยะล่าสุด
 * งานที่เอกสารไม่ระบุพื้นที่รายศูนย์จะไม่ปักหมุด แต่ยังอยู่ในรายการรายปีด้านล่าง
 */
import { useEffect, useMemo, useState } from "react";
import {
  JOURNEY_PERIODS,
  JOURNEY_PLACES,
  JOURNEY_SOURCES,
  JOURNEY_WORKS,
  LEAD_FALLBACK,
  periodColor,
} from "@/lib/journey-map";
import type { JourneyPlace, JourneyWork } from "@/lib/journey-map";

const baht = (n: number) => n.toLocaleString("th-TH");
const placeById = new Map(JOURNEY_PLACES.map((p) => [p.id, p]));

/** หมุดที่พิกัดซ้ำกัน (ใช้จุดกลางอำเภอเดียวกัน) ขยับออกเป็นวงเล็ก ๆ ไม่ให้ทับกัน */
function spreadPositions(places: JourneyPlace[]): Map<string, [number, number]> {
  const groups = new Map<string, JourneyPlace[]>();
  places.forEach((p) => {
    const k = `${p.lat},${p.lng}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  });
  const out = new Map<string, [number, number]>();
  groups.forEach((g) => {
    g.forEach((p, i) => {
      if (g.length === 1) return out.set(p.id, [p.lat, p.lng]);
      const a = (2 * Math.PI * i) / g.length;
      out.set(p.id, [p.lat + 0.045 * Math.sin(a), p.lng + 0.045 * Math.cos(a)]);
    });
  });
  return out;
}

export default function JourneyMap() {
  const [period, setPeriod] = useState<string>("all");
  const [mods, setMods] = useState<{ RL: any } | null>(null);

  useEffect(() => {
    import("react-leaflet").then((RL) => setMods({ RL }));
  }, []);

  const range = JOURNEY_PERIODS.find((p) => p.key === period) ?? JOURNEY_PERIODS[0];
  const works = useMemo(
    () => JOURNEY_WORKS.filter((w) => w.year >= range.from && w.year <= range.to),
    [range]
  );

  const byPlace = useMemo(() => {
    const m = new Map<string, JourneyWork[]>();
    works.forEach((w) => w.places.forEach((id) => m.set(id, [...(m.get(id) ?? []), w])));
    return m;
  }, [works]);

  const shownPlaces = JOURNEY_PLACES.filter((p) => byPlace.has(p.id));
  const pos = useMemo(() => spreadPositions(shownPlaces), [shownPlaces]);

  const years = Array.from(new Set(works.map((w) => w.year))).sort((a, b) => a - b);
  const unmapped = works.filter((w) => w.places.length === 0).length;

  return (
    <div className="space-y-3">
      {/* กรองช่วงปี */}
      <div className="flex flex-wrap items-center gap-2">
        {JOURNEY_PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-3 py-1 text-[0.9rem] font-medium ring-1 transition ${
              period === p.key ? "text-white ring-transparent" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
            }`}
            style={period === p.key ? { backgroundColor: p.color } : undefined}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-[0.9rem] text-slate-600">
        {works.length} งาน · ปักหมุดได้ {shownPlaces.length} พื้นที่
        {unmapped > 0 && ` · ${unmapped} งานไม่ระบุพื้นที่รายศูนย์ (อยู่ในรายการด้านล่าง)`}
      </p>

      {/* แผนที่ */}
      {!mods ? (
        <div className="flex h-[480px] items-center justify-center rounded-lg bg-slate-100">
          <p className="text-[0.9rem] text-slate-500">กำลังโหลดแผนที่...</p>
        </div>
      ) : (
        <>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <mods.RL.MapContainer
            center={[18.9, 99.6]}
            zoom={7}
            style={{ height: "480px", width: "100%", borderRadius: "0.5rem" }}
            scrollWheelZoom={false}
          >
            <mods.RL.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {shownPlaces.map((p) => {
              const list = (byPlace.get(p.id) ?? []).slice().sort((a, b) => b.year - a.year);
              const color = periodColor(list[0].year);
              const at = pos.get(p.id) ?? [p.lat, p.lng];
              return (
                <mods.RL.CircleMarker
                  key={`${period}-${p.id}`}
                  center={at}
                  radius={6 + Math.min(list.length, 8) * 1.5}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.65, weight: p.precise ? 2 : 1, dashArray: p.precise ? undefined : "3 3" }}
                >
                  <mods.RL.Popup>
                    <div style={{ minWidth: 230, maxWidth: 300 }}>
                      <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>{p.name}</p>
                      <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "2px 0 6px" }}>
                        จ.{p.province}
                        {!p.precise && " · พิกัดโดยประมาณ (จุดกลางอำเภอ)"}
                      </p>
                      <div style={{ maxHeight: 220, overflowY: "auto" }}>
                        {list.map((w, i) => (
                          <div key={i} style={{ borderTop: "1px solid #e2e8f0", padding: "4px 0", fontSize: "0.85rem" }}>
                            <span style={{ fontWeight: 700, color: periodColor(w.year) }}>{w.year}</span> {w.title}
                            <br />
                            <span style={{ color: "#475569" }}>
                              หัวหน้า: {w.lead ?? LEAD_FALLBACK}
                              {w.budget ? ` · ${baht(w.budget)} บาท` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </mods.RL.Popup>
                </mods.RL.CircleMarker>
              );
            })}
          </mods.RL.MapContainer>
        </>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem] text-slate-600">
        {JOURNEY_PERIODS.slice(1).map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
            {p.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-dashed border-slate-500" />
          ขอบประ = พิกัดระดับอำเภอ
        </span>
      </div>

      {/* รายการรายปี */}
      <div className="space-y-2">
        {years.map((y) => (
          <details key={y} className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200" open={years.length <= 2}>
            <summary className="cursor-pointer text-[0.95rem] font-bold" style={{ color: periodColor(y) }}>
              ปีงบประมาณ {y} · {works.filter((w) => w.year === y).length} งาน
            </summary>
            <ul className="mt-2 space-y-2">
              {works
                .filter((w) => w.year === y)
                .map((w, i) => (
                  <li key={i} className="rounded-md bg-white px-3 py-2 text-[0.9rem] leading-snug">
                    <p className="font-medium text-slate-900">{w.title}</p>
                    <p className="mt-0.5 text-slate-600">
                      ที่ไหน:{" "}
                      {w.places.length
                        ? w.places.map((id) => placeById.get(id)?.name ?? id).join(" · ")
                        : "ไม่ระบุรายพื้นที่"}
                      {w.scope && ` (${w.scope})`}
                    </p>
                    <p className="text-slate-600">
                      หัวหน้าโครงการ: {w.lead ?? LEAD_FALLBACK}
                      {w.budget ? ` · ${baht(w.budget)} บาท` : ""}
                    </p>
                    <p className="text-[0.8rem] text-slate-400">
                      ที่มา: {JOURNEY_SOURCES[w.source]}
                      {w.ref && ` [${w.ref}]`}
                    </p>
                  </li>
                ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
