"use client";

import { useState } from "react";
import KpiReportPanel from "./KpiReportPanel";

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
          token_code: tokenCode || null,
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
