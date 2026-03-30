"use client";

import { useState, useEffect } from "react";

interface KpiTarget {
  id: string;
  kpi_name: string;
  kpi_type: string;
  target_value: number;
  actual_value: number;
  unit: string | null;
  verified: boolean;
}

interface Participant {
  full_name: string;
  participant_type: string;
  student_id: string;
  organization: string;
}

interface KpiEntry {
  kpi_target_id: string;
  value: number;
  evidence_url: string;
  evidence_type: string;
  evidence_desc: string;
  participants: Participant[];
}

interface Props {
  projectId: string;
  kpis: KpiTarget[];
  onSubmit: (entries: KpiEntry[]) => void;
  onChange?: (entries: KpiEntry[]) => void;
}

const PARTICIPANT_TYPES = [
  { value: "lecturer", label: "อาจารย์" },
  { value: "staff", label: "บุคลากร" },
  { value: "student", label: "นักศึกษา" },
  { value: "villager", label: "ชาวบ้าน/เกษตรกร" },
  { value: "other", label: "อื่นๆ" },
];

const EVIDENCE_TYPES = [
  { value: "image", label: "รูปภาพ" },
  { value: "document", label: "เอกสาร" },
  { value: "certificate", label: "ใบรับรอง/สิทธิบัตร" },
  { value: "patent", label: "อนุสิทธิบัตร" },
  { value: "link", label: "ลิงก์" },
  { value: "other", label: "อื่นๆ" },
];

// ตรวจว่า KPI นี้เกี่ยวกับคน (ต้องกรอกรายชื่อ)
function isPersonKpi(name: string): boolean {
  const keywords = ["คน", "ผู้เข้าร่วม", "บุคลากร", "อาจารย์", "นักศึกษา", "เกษตรกร", "ราย", "รูป", "ครัวเรือน"];
  return keywords.some((k) => name.includes(k));
}

// ตรวจว่า KPI นี้ต้องแนบหลักฐาน (เอกสาร/สิทธิบัตร/ผลงาน)
function needsEvidence(name: string): boolean {
  const keywords = ["สิทธิบัตร", "อนุสิทธิบัตร", "หลักสูตร", "คู่มือ", "องค์ความรู้", "บทความ", "เครื่อง", "แปลง", "ผลิตภัณฑ์", "เมนู", "ศูนย์", "แบรนด์", "ข้อเสนอ", "ระบบ", "แผน", "วีดีโอ", "ชิ้นงาน", "เครือข่าย", "อาคาร", "Roadmap"];
  return keywords.some((k) => name.includes(k));
}

export default function KpiReportPanel({ projectId, kpis, onSubmit, onChange }: Props) {
  const quantKpis = kpis.filter((k) => k.kpi_type === "quantitative");

  const [entries, setEntries] = useState<Record<string, KpiEntry>>({});
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);

  // Sync entries to parent on every change
  useEffect(() => {
    if (onChange) {
      const validEntries = Object.values(entries).filter(
        (e) => e.value > 0 || e.participants.length > 0 || e.evidence_url
      );
      // Auto-set value from participants count
      for (const e of validEntries) {
        const kpi = quantKpis.find((k) => k.id === e.kpi_target_id);
        if (kpi && isPersonKpi(kpi.kpi_name) && e.participants.length > 0 && e.value === 0) {
          e.value = e.participants.length;
        }
      }
      onChange(validEntries);
    }
  }, [entries]);

  function toggleKpi(id: string) {
    setExpandedKpi(expandedKpi === id ? null : id);
    if (!entries[id]) {
      setEntries((prev) => ({
        ...prev,
        [id]: {
          kpi_target_id: id,
          value: 0,
          evidence_url: "",
          evidence_type: "image",
          evidence_desc: "",
          participants: [],
        },
      }));
    }
  }

  function updateEntry(id: string, field: string, value: string | number) {
    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function addParticipant(kpiId: string) {
    setEntries((prev) => ({
      ...prev,
      [kpiId]: {
        ...prev[kpiId],
        participants: [
          ...prev[kpiId].participants,
          { full_name: "", participant_type: "lecturer", student_id: "", organization: "" },
        ],
      },
    }));
  }

  function updateParticipant(kpiId: string, idx: number, field: string, value: string) {
    setEntries((prev) => {
      const updated = [...prev[kpiId].participants];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, [kpiId]: { ...prev[kpiId], participants: updated } };
    });
  }

  function removeParticipant(kpiId: string, idx: number) {
    setEntries((prev) => {
      const updated = prev[kpiId].participants.filter((_, i) => i !== idx);
      return { ...prev, [kpiId]: { ...prev[kpiId], participants: updated } };
    });
  }

  function handleSubmit() {
    const validEntries = Object.values(entries).filter(
      (e) => e.value > 0 || e.evidence_url || e.participants.length > 0
    );
    // Auto-set value from participants count if person KPI
    for (const e of validEntries) {
      const kpi = quantKpis.find((k) => k.id === e.kpi_target_id);
      if (kpi && isPersonKpi(kpi.kpi_name) && e.participants.length > 0 && e.value === 0) {
        e.value = e.participants.length;
      }
    }
    onSubmit(validEntries);
  }

  if (quantKpis.length === 0) return null;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        ตอบตัวชี้วัด + แนบหลักฐาน
      </label>
      <div className="space-y-2">
        {quantKpis.map((k) => {
          const isPerson = isPersonKpi(k.kpi_name);
          const needsEv = needsEvidence(k.kpi_name);
          const entry = entries[k.id];
          const isOpen = expandedKpi === k.id;
          const pct = Number(k.target_value) > 0
            ? Math.round((Number(k.actual_value) / Number(k.target_value)) * 100) : 0;

          return (
            <div
              key={k.id}
              className={`rounded border ${isOpen ? "border-blue-400 bg-blue-50" : "hover:bg-gray-50"}`}
            >
              {/* KPI Header */}
              <button
                type="button"
                onClick={() => toggleKpi(k.id)}
                className="flex w-full items-center justify-between px-3 py-3 text-left"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{k.kpi_name}</p>
                  <p className="text-xs text-gray-500">
                    สะสม: {Number(k.actual_value)}/{Number(k.target_value)} {k.unit}
                    {pct >= 100 && " ✅"}
                    {isPerson && " | 👤 ต้องกรอกรายชื่อ"}
                    {needsEv && " | 📎 ต้องแนบหลักฐาน"}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                  pct >= 100 ? "bg-green-100 text-green-700"
                    : pct > 0 ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {pct}%
                </span>
              </button>

              {/* Expanded form */}
              {isOpen && entry && (
                <div className="space-y-3 border-t bg-white px-3 pb-3 pt-2">
                  {/* จำนวน */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">ครั้งนี้ +</span>
                    <input
                      type="number"
                      value={entry.value || ""}
                      onChange={(e) => updateEntry(k.id, "value", Number(e.target.value))}
                      min="0"
                      className="w-20 rounded border px-2 py-1 text-sm"
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-500">{k.unit}</span>
                    {entry.value > 0 && (
                      <span className="text-xs text-blue-600 font-medium">
                        = {Number(k.actual_value) + entry.value} {k.unit}
                      </span>
                    )}
                  </div>

                  {/* หลักฐาน */}
                  {(needsEv || true) && (
                    <div className="space-y-2 rounded bg-gray-50 p-2">
                      <p className="text-xs font-medium text-gray-600">📎 หลักฐาน</p>
                      <div className="flex gap-2">
                        <select
                          value={entry.evidence_type}
                          onChange={(e) => updateEntry(k.id, "evidence_type", e.target.value)}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          {EVIDENCE_TYPES.map((et) => (
                            <option key={et.value} value={et.value}>{et.label}</option>
                          ))}
                        </select>
                        <input
                          type="url"
                          value={entry.evidence_url}
                          onChange={(e) => updateEntry(k.id, "evidence_url", e.target.value)}
                          placeholder="URL รูปภาพ / Google Drive / ลิงก์"
                          className="flex-1 rounded border px-2 py-1 text-xs"
                        />
                      </div>
                      <input
                        type="text"
                        value={entry.evidence_desc}
                        onChange={(e) => updateEntry(k.id, "evidence_desc", e.target.value)}
                        placeholder="คำอธิบายหลักฐาน (เช่น ใบอนุสิทธิบัตร เลขที่...)"
                        className="w-full rounded border px-2 py-1 text-xs"
                      />
                    </div>
                  )}

                  {/* รายชื่อผู้เข้าร่วม (สำหรับ KPI เกี่ยวกับคน) */}
                  {isPerson && (
                    <div className="space-y-2 rounded bg-green-50 p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-600">
                          👤 รายชื่อผู้เข้าร่วม ({entry.participants.length} คน)
                        </p>
                        <button
                          type="button"
                          onClick={() => addParticipant(k.id)}
                          className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-700"
                        >
                          + เพิ่มคน
                        </button>
                      </div>

                      {entry.participants.map((p, pi) => (
                        <div key={pi} className="flex flex-wrap items-center gap-1.5 rounded bg-white p-2">
                          <select
                            value={p.participant_type}
                            onChange={(e) => updateParticipant(k.id, pi, "participant_type", e.target.value)}
                            className="rounded border px-1.5 py-1 text-xs"
                          >
                            {PARTICIPANT_TYPES.map((pt) => (
                              <option key={pt.value} value={pt.value}>{pt.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={p.full_name}
                            onChange={(e) => updateParticipant(k.id, pi, "full_name", e.target.value)}
                            placeholder="ชื่อ-นามสกุล"
                            className="flex-1 rounded border px-2 py-1 text-xs"
                          />
                          {p.participant_type === "student" && (
                            <input
                              type="text"
                              value={p.student_id}
                              onChange={(e) => updateParticipant(k.id, pi, "student_id", e.target.value)}
                              placeholder="รหัส นศ."
                              className="w-24 rounded border px-2 py-1 text-xs"
                            />
                          )}
                          <input
                            type="text"
                            value={p.organization}
                            onChange={(e) => updateParticipant(k.id, pi, "organization", e.target.value)}
                            placeholder="หน่วยงาน/สังกัด"
                            className="w-32 rounded border px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => removeParticipant(k.id, pi)}
                            className="text-red-400 hover:text-red-600"
                          >
                            &#10005;
                          </button>
                        </div>
                      ))}

                      {entry.participants.length > 0 && (
                        <p className="text-xs text-green-600">
                          จำนวนจะนับอัตโนมัติ: +{entry.participants.length} {k.unit}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit summary */}
      {Object.values(entries).some((e) => e.value > 0 || e.participants.length > 0 || e.evidence_url) && (
        <div className="mt-3 rounded bg-blue-50 p-2 text-xs text-blue-700">
          จะตอบตัวชี้วัด{" "}
          {Object.values(entries).filter(
            (e) => e.value > 0 || e.participants.length > 0 || e.evidence_url
          ).length}{" "}
          ตัว
        </div>
      )}
    </div>
  );
}
