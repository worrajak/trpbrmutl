"use client";

import { useState } from "react";

interface KpiTarget {
  id: string;
  kpi_name: string;
  kpi_type: string;
  target_value: number;
  actual_value: number;
  unit: string | null;
}

interface Activity {
  id: string;
  activity_order: number;
  activity_name: string;
}

interface Props {
  projectId: string;
  activity: Activity;
  kpis: KpiTarget[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ReportForm({
  projectId,
  activity,
  kpis,
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

  // KPI contributions state
  const quantKpis = kpis.filter((k) => k.kpi_type === "quantitative");
  const [selectedKpis, setSelectedKpis] = useState<
    Record<string, { checked: boolean; value: string }>
  >({});

  function toggleKpi(id: string) {
    setSelectedKpis((prev) => ({
      ...prev,
      [id]: {
        checked: !prev[id]?.checked,
        value: prev[id]?.value || "",
      },
    }));
  }

  function setKpiValue(id: string, value: string) {
    setSelectedKpis((prev) => ({
      ...prev,
      [id]: { checked: true, value },
    }));
  }

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

    const kpiContributions = Object.entries(selectedKpis)
      .filter(([, v]) => v.checked && Number(v.value) > 0)
      .map(([kpiId, v]) => ({
        kpi_target_id: kpiId,
        value: Number(v.value),
      }));

    try {
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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
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

            {/* ตอบตัวชี้วัด */}
            {quantKpis.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  ตอบตัวชี้วัด (เลือกที่ทำได้)
                </label>
                <div className="space-y-2">
                  {quantKpis.map((k) => {
                    const sel = selectedKpis[k.id];
                    return (
                      <div
                        key={k.id}
                        className={`rounded border p-3 ${
                          sel?.checked ? "border-blue-400 bg-blue-50" : ""
                        }`}
                      >
                        <label className="flex cursor-pointer items-start gap-2">
                          <input
                            type="checkbox"
                            checked={sel?.checked || false}
                            onChange={() => toggleKpi(k.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <p className="text-sm">{k.kpi_name}</p>
                            <p className="text-xs text-gray-500">
                              สะสมเดิม: {Number(k.actual_value)} / เป้า:{" "}
                              {Number(k.target_value)} {k.unit}
                            </p>
                          </div>
                        </label>
                        {sel?.checked && (
                          <div className="mt-2 flex items-center gap-2 pl-6">
                            <span className="text-xs text-gray-500">ครั้งนี้ +</span>
                            <input
                              type="number"
                              value={sel.value}
                              onChange={(e) => setKpiValue(k.id, e.target.value)}
                              min="0"
                              className="w-20 rounded border px-2 py-1 text-sm"
                              placeholder="0"
                            />
                            <span className="text-xs text-gray-500">{k.unit}</span>
                            {Number(sel.value) > 0 && (
                              <span className="text-xs text-blue-600">
                                = {Number(k.actual_value) + Number(sel.value)}{" "}
                                {k.unit}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
