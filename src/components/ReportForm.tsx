"use client";

import { useState } from "react";
import KpiReportPanel from "./KpiReportPanel";
import { SDG_GOALS } from "@/lib/sdgs";

interface KpiTarget {
  id: string;
  kpi_name: string;
  kpi_type: string;
  target_value: number;
  actual_value: number;
  unit: string | null;
  verified: boolean;
}

interface Activity {
  id: string;
  activity_order: number;
  activity_name: string;
}

interface RewardInfo {
  totalRpf: number;
  rewards: Array<{ type: string; amount: number; reason: string }>;
}

interface Props {
  projectId: string;
  activity: Activity;
  kpis: KpiTarget[];
  tokenCode?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ReportForm({
  projectId,
  activity,
  kpis,
  tokenCode,
  onClose,
  onSaved,
}: Props) {
  const [status, setStatus] = useState("in_progress");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [budgetSpent, setBudgetSpent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rewardResult, setRewardResult] = useState<RewardInfo | null>(null);
  const [saved, setSaved] = useState(false);

  // SDG tags
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>([]);
  function toggleSdg(id: number) {
    setSelectedSdgs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Evidence files (หลักฐานแนบ)
  const [evidenceFiles, setEvidenceFiles] = useState<
    Array<{ name: string; url: string; type: string }>
  >([]);
  function addEvidenceFile() {
    setEvidenceFiles((prev) => [...prev, { name: "", url: "", type: "link" }]);
  }
  function removeEvidenceFile(i: number) {
    setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateEvidenceFile(i: number, field: string, value: string) {
    setEvidenceFiles((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, [field]: value } : f))
    );
  }

  // ตัวชี้วัดใหม่ที่ หน.โครงการ เพิ่มเอง
  const [newKpis, setNewKpis] = useState<Array<{
    kpi_name: string; kpi_type: string;
    target_value: string; actual_value: string; unit: string;
  }>>([]);

  function addNewKpi() {
    setNewKpis((prev) => [
      ...prev,
      { kpi_name: "", kpi_type: "quantitative", target_value: "1", actual_value: "0", unit: "รายการ" },
    ]);
  }
  function removeNewKpi(i: number) {
    setNewKpis((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateNewKpi(i: number, field: string, value: string) {
    setNewKpis((prev) => prev.map((k, idx) => idx === i ? { ...k, [field]: value } : k));
  }

  // KPI contributions from KpiReportPanel
  const [kpiEntries, setKpiEntries] = useState<
    Array<{
      kpi_target_id: string;
      value: number;
      evidence_url: string;
      evidence_type: string;
      evidence_desc: string;
      participants: Array<{
        full_name: string;
        participant_type: string;
        student_id: string;
        organization: string;
      }>;
    }>
  >([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submittedBy.trim()) {
      setError("กรุณาระบุชื่อผู้รายงาน");
      return;
    }
    if (!description.trim()) {
      setError("กรุณาระบุรายละเอียดการดำเนินงาน");
      return;
    }

    setSaving(true);
    setError("");

    const kpiContributions = kpiEntries
      .filter((e) => e.value > 0 || e.participants.length > 0)
      .map((e) => ({
        kpi_target_id: e.kpi_target_id,
        value: e.value > 0 ? e.value : e.participants.length,
        evidence_url: e.evidence_url,
        evidence_type: e.evidence_type,
        evidence_desc: e.evidence_desc,
        participants: e.participants,
      }));

    try {
      const validNewKpis = newKpis.filter((k) => k.kpi_name.trim());

      const res = await fetch("/api/supabase/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          activity_id: activity.id,
          report_description: description,
          evidence_url: evidenceUrl || null,
          submitted_by: submittedBy,
          activity_status: status,
          budget_spent: budgetSpent ? Number(budgetSpent) : 0,
          kpi_contributions: kpiContributions,
          new_kpis: validNewKpis.map((k) => ({
            ...k,
            target_value: Number(k.target_value) || 1,
            actual_value: Number(k.actual_value) || 0,
          })),
          token_code: tokenCode || null,
          sdg_tags: selectedSdgs,
          evidence_files: evidenceFiles.filter((f) => f.url.trim()),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      const result = await res.json();
      if (result.reward && result.reward.totalRpf > 0) {
        setRewardResult(result.reward);
        setSaved(true);
      } else {
        onSaved();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  // Reward success screen
  if (saved && rewardResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
          <div className="mb-4 text-5xl">&#127881;</div>
          <h3 className="text-lg font-bold text-gray-800">บันทึกสำเร็จ!</h3>
          <p className="mt-2 text-3xl font-bold text-royal-700">
            +{rewardResult.totalRpf.toLocaleString()} RPF
          </p>
          <div className="mt-4 space-y-2 text-left">
            {rewardResult.rewards.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded bg-green-50 px-3 py-2 text-sm"
              >
                <span className="text-gray-700">{r.reason}</span>
                <span className="font-bold text-green-700">+{r.amount}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onSaved}
            className="mt-6 w-full rounded bg-royal-700 py-2 text-white hover:bg-royal-800"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 z-10 border-b bg-royal-700 px-5 py-3 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">รายงานความก้าวหน้า</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-white/70 hover:text-white"
              >
                &#10005;
              </button>
            </div>
            <p className="mt-1 text-sm text-white/80">
              {activity.activity_order}. {activity.activity_name}
            </p>
          </div>

          <div className="space-y-4 p-5">
            {/* ผู้รายงาน */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ผู้รายงาน *
              </label>
              <input
                type="text"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full rounded border px-3 py-2 text-sm"
                required
              />
            </div>

            {/* สถานะ */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                สถานะกิจกรรม
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสมบูรณ์</option>
                <option value="delayed">ล่าช้า</option>
              </select>
            </div>

            {/* รายละเอียด */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                รายละเอียดการดำเนินงาน *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายสิ่งที่ทำไปสั้นๆ..."
                rows={3}
                className="w-full rounded border px-3 py-2 text-sm"
                required
              />
            </div>

            {/* รูปภาพ/หลักฐาน */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                หลักฐาน (URL รูปภาพ / Google Drive)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>

            {/* งบที่ใช้ */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                งบประมาณที่ใช้ไปครั้งนี้ (บาท)
              </label>
              <input
                type="number"
                value={budgetSpent}
                onChange={(e) => setBudgetSpent(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>

            {/* ตอบตัวชี้วัด + หลักฐาน + รายชื่อ */}
            <KpiReportPanel
              projectId={projectId}
              kpis={kpis}
              onSubmit={(entries) => setKpiEntries(entries)}
              onChange={(entries) => setKpiEntries(entries)}
            />

            {/* ตัวชี้วัดเพิ่มเติม (หน.โครงการเพิ่มเอง) */}
            <div className="rounded-lg border border-dashed border-teal-300 bg-teal-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-teal-800">➕ ตัวชี้วัดเพิ่มเติม</p>
                  <p className="text-xs text-teal-600">ผลที่เกิดขึ้นจริงนอกเหนือจากที่กำหนดไว้ตั้งแต่ต้น</p>
                </div>
                {tokenCode && (
                  <span className="text-xs text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                    +{600}/ตัวชี้วัด RPF
                  </span>
                )}
              </div>

              {newKpis.map((kpi, i) => (
                <div key={i} className="mb-3 rounded-lg bg-white border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="ชื่อตัวชี้วัด เช่น จำนวนผู้เข้าร่วมกิจกรรม"
                        value={kpi.kpi_name}
                        onChange={(e) => updateNewKpi(i, "kpi_name", e.target.value)}
                        className="w-full rounded border px-2 py-1.5 text-sm"
                      />
                    </div>
                    <button type="button" onClick={() => removeNewKpi(i)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none mt-1">×</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">เป้าหมาย</label>
                      <input type="number" min="0" value={kpi.target_value}
                        onChange={(e) => updateNewKpi(i, "target_value", e.target.value)}
                        className="w-full rounded border px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">ทำได้แล้ว</label>
                      <input type="number" min="0" value={kpi.actual_value}
                        onChange={(e) => updateNewKpi(i, "actual_value", e.target.value)}
                        className="w-full rounded border px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">หน่วย</label>
                      <input type="text" value={kpi.unit} placeholder="คน/ชิ้น/ครั้ง"
                        onChange={(e) => updateNewKpi(i, "unit", e.target.value)}
                        className="w-full rounded border px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                  <select value={kpi.kpi_type}
                    onChange={(e) => updateNewKpi(i, "kpi_type", e.target.value)}
                    className="w-full rounded border px-2 py-1.5 text-xs text-gray-600">
                    <option value="quantitative">เชิงปริมาณ (นับได้)</option>
                    <option value="qualitative">เชิงคุณภาพ (ประเมิน)</option>
                  </select>
                </div>
              ))}

              <button type="button" onClick={addNewKpi}
                className="w-full rounded-lg border border-teal-300 py-2 text-sm text-teal-700 hover:bg-teal-100 transition">
                + เพิ่มตัวชี้วัดใหม่
              </button>
            </div>

            {/* SDG Tags */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">🌐 SDGs ที่เกี่ยวข้อง</p>
              <p className="text-xs text-blue-600 mb-3">เลือก SDG ที่ผลงานครั้งนี้สนับสนุน</p>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                {SDG_GOALS.map((g) => {
                  const active = selectedSdgs.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleSdg(g.id)}
                      title={`SDG ${g.id}: ${g.name_th}`}
                      className="flex flex-col items-center rounded-lg p-1.5 text-center transition"
                      style={{
                        backgroundColor: active ? g.color : g.bg,
                        border: `2px solid ${active ? g.color : "transparent"}`,
                        color: active ? "#fff" : g.color,
                      }}
                    >
                      <span className="text-lg leading-none">{g.icon}</span>
                      <span className="text-[10px] font-bold mt-0.5">{g.id}</span>
                    </button>
                  );
                })}
              </div>
              {selectedSdgs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedSdgs.sort((a, b) => a - b).map((id) => {
                    const g = SDG_GOALS.find((x) => x.id === id)!;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white font-medium"
                        style={{ backgroundColor: g.color }}
                      >
                        {g.icon} SDG {id}: {g.name_th}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* หลักฐานแนบ (evidence_files) */}
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-purple-900">📎 แนบหลักฐาน</p>
                  <p className="text-xs text-purple-600">รูปถ่าย, PDF, หรือลิงก์ที่แสดงผลการดำเนินงาน</p>
                </div>
              </div>

              {evidenceFiles.map((f, i) => (
                <div key={i} className="mb-2 rounded-lg bg-white border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={f.type}
                      onChange={(e) => updateEvidenceFile(i, "type", e.target.value)}
                      className="rounded border px-2 py-1.5 text-xs text-gray-600 w-24 shrink-0"
                    >
                      <option value="image">🖼️ รูปภาพ</option>
                      <option value="pdf">📄 PDF</option>
                      <option value="link">🔗 ลิงก์</option>
                    </select>
                    <input
                      type="text"
                      placeholder="ชื่อไฟล์ / คำอธิบาย"
                      value={f.name}
                      onChange={(e) => updateEvidenceFile(i, "name", e.target.value)}
                      className="flex-1 rounded border px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeEvidenceFile(i)}
                      className="text-red-400 hover:text-red-600 text-lg leading-none"
                    >×</button>
                  </div>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... หรือ URL รูปภาพ"
                    value={f.url}
                    onChange={(e) => updateEvidenceFile(i, "url", e.target.value)}
                    className="w-full rounded border px-2 py-1.5 text-sm"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={addEvidenceFile}
                className="w-full rounded-lg border border-purple-300 py-2 text-sm text-purple-700 hover:bg-purple-100 transition"
              >
                + เพิ่มหลักฐาน
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded bg-red-50 p-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t bg-gray-50 px-5 py-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded border px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded bg-royal-700 px-4 py-2 text-sm font-medium text-white hover:bg-royal-800 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกความก้าวหน้า"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
