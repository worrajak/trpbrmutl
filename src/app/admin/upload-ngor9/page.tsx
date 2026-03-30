"use client";

import { useState, useEffect } from "react";

interface ParsedProject {
  project_name: string;
  responsible: string;
  responsible_title: string;
  phone: string;
  organization: string;
  budget_total: number;
  project_period: string;
  site: string;
  main_program: string;
  activities: Array<{
    order: number;
    name: string;
    budget: number;
    planned_months: number[];
    output: string;
  }>;
  kpi: {
    quantitative: string[];
    qualitative: string[];
    time_target: string;
    budget_target: string;
  };
}

const AI_PROVIDERS = [
  { value: "gemini", label: "Google Gemini (ฟรี)", hint: "ขอ key ที่ aistudio.google.com" },
  { value: "claude", label: "Claude (Anthropic)", hint: "ขอ key ที่ console.anthropic.com" },
  { value: "openai", label: "OpenAI GPT-4o", hint: "ขอ key ที่ platform.openai.com" },
];

const MONTH_LABELS: Record<number, string> = {
  10: "ต.ค.", 11: "พ.ย.", 12: "ธ.ค.",
  1: "ม.ค.", 2: "ก.พ.", 3: "มี.ค.",
  4: "เม.ย.", 5: "พ.ค.", 6: "มิ.ย.",
  7: "ก.ค.", 8: "ส.ค.", 9: "ก.ย.",
};

const PROGRAMS = ["1.ผลักดันเทคโนโลยี", "2.ขับเคลื่อนกลไก", "3.พัฒนากำลังคน"];

export default function UploadNgor9Page() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");

  // AI settings
  const [aiProvider, setAiProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  // Parsed data (editable)
  const [parsed, setParsed] = useState<ParsedProject | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<Array<{ id: string; project_name: string; responsible: string | null }> | null>(null);
  const [fiscalYear, setFiscalYear] = useState(2570);

  useEffect(() => {
    const s = sessionStorage.getItem("admin_token_auth");
    if (s === "true") setAuthed(true);
    // Load saved API key
    const savedKey = localStorage.getItem(`ai_key_${aiProvider}`);
    if (savedKey) setApiKey(savedKey);
  }, [aiProvider]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem("admin_token_auth", "true");
      setAuthed(true);
    } else alert("รหัสผ่านไม่ถูกต้อง");
  }

  async function handleParse() {
    if (!file || !apiKey) return;
    setParsing(true);
    setParseError("");

    try {
      // Save API key locally
      localStorage.setItem(`ai_key_${aiProvider}`, apiKey);

      // Convert file to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const res = await fetch("/api/supabase/parse-ngor9", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_base64: base64,
          ai_provider: aiProvider,
          api_key: apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "เกิดข้อผิดพลาด";
        const raw = data.raw_text ? "\n\nAI ตอบ:\n" + data.raw_text.substring(0, 500) : "";
        throw new Error(msg + raw);
      }

      setParsed(data.data as ParsedProject);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setParsing(false);
    }
  }

  function updateField(field: string, value: string | number) {
    if (!parsed) return;
    setParsed({ ...parsed, [field]: value });
  }

  function updateActivity(idx: number, field: string, value: string | number | number[]) {
    if (!parsed) return;
    const acts = [...parsed.activities];
    acts[idx] = { ...acts[idx], [field]: value };
    setParsed({ ...parsed, activities: acts });
  }

  function addActivity() {
    if (!parsed) return;
    setParsed({
      ...parsed,
      activities: [
        ...parsed.activities,
        { order: parsed.activities.length + 1, name: "", budget: 0, planned_months: [], output: "" },
      ],
    });
  }

  function removeActivity(idx: number) {
    if (!parsed) return;
    const acts = parsed.activities.filter((_, i) => i !== idx);
    acts.forEach((a, i) => (a.order = i + 1));
    setParsed({ ...parsed, activities: acts });
  }

  function toggleMonth(actIdx: number, month: number) {
    if (!parsed) return;
    const acts = [...parsed.activities];
    const months = [...acts[actIdx].planned_months];
    const i = months.indexOf(month);
    if (i >= 0) months.splice(i, 1);
    else months.push(month);
    acts[actIdx] = { ...acts[actIdx], planned_months: months };
    setParsed({ ...parsed, activities: acts });
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/supabase/save-ngor9", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed, fiscal_year: fiscalYear }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      setSavedToken(data.token_code || "");
      setDuplicateWarning(data.duplicate_warning || null);
      setSaved(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  // Auth screen
  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
          <h1 className="mb-4 text-lg font-bold text-royal-700">Admin - นำเข้า ง9</h1>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Admin" className="mb-3 w-full rounded border px-3 py-2" />
          <button className="w-full rounded bg-royal-700 py-2 text-white hover:bg-royal-800">เข้าสู่ระบบ</button>
        </form>
      </div>
    );
  }

  // Success screen
  if (saved) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="rounded-lg bg-white p-8 shadow text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-green-700">บันทึกสำเร็จ!</h1>
          <p className="mt-2 text-gray-600">
            โครงการ &quot;{parsed?.project_name}&quot; ปี {fiscalYear}
          </p>

          {/* Token ที่สร้าง */}
          {savedToken && (
            <div className="mt-4 rounded-lg bg-royal-50 border-2 border-royal-300 p-4">
              <p className="text-sm text-gray-600">Token สำหรับ หน.โครงการ:</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-royal-700">
                {savedToken}
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(savedToken); }}
                className="mt-2 rounded bg-royal-700 px-3 py-1 text-xs text-white hover:bg-royal-800"
              >
                Copy Token
              </button>
              <p className="mt-2 text-xs text-gray-500">
                ส่ง Token นี้ให้ {parsed?.responsible || "หัวหน้าโครงการ"} เพื่อรายงานผลและรับ RPF Coin
              </p>
            </div>
          )}

          {/* Duplicate Warning */}
          {duplicateWarning && duplicateWarning.length > 0 && (
            <div className="mt-4 rounded bg-yellow-50 border border-yellow-300 p-3 text-left">
              <p className="text-sm font-medium text-yellow-800">
                &#9888; พบผู้รับผิดชอบซ้ำในปี {fiscalYear}:
              </p>
              <ul className="mt-1 space-y-1">
                {duplicateWarning.map((d) => (
                  <li key={d.id} className="text-xs text-yellow-700">
                    <a href={`/projects/${d.id}`} className="underline hover:text-yellow-900">
                      {d.project_name}
                    </a>
                    {" — "}{d.responsible}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-yellow-600">
                หน.โครงการ อาจใช้ Token เดิมได้ ดูที่หน้า Token/RPF
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => { setParsed(null); setSaved(false); setFile(null); setSavedToken(""); setDuplicateWarning(null); }}
              className="rounded bg-royal-700 px-4 py-2 text-white hover:bg-royal-800">
              นำเข้าไฟล์ใหม่
            </button>
            <a href="/admin/tokens" className="rounded border px-4 py-2 text-gray-600 hover:bg-gray-100">
              จัดการ Token
            </a>
            <a href="/projects" className="rounded border px-4 py-2 text-gray-600 hover:bg-gray-100">
              ดูโครงการ
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">นำเข้าเอกสาร ง9</h1>
        <p className="text-sm text-gray-600">Upload PDF ง9 → AI อ่านข้อมูล → ตรวจสอบ/แก้ไข → บันทึกลง Supabase</p>
      </div>

      {/* Step 1: AI Settings + Upload */}
      {!parsed && (
        <div className="space-y-4 rounded-lg bg-white p-6 shadow">
          <h2 className="font-semibold text-gray-800">1. ตั้งค่า AI + เลือกไฟล์</h2>

          {/* AI Provider */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">เลือก AI</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {AI_PROVIDERS.map((p) => (
                <button key={p.value} type="button"
                  onClick={() => setAiProvider(p.value)}
                  className={`rounded border p-3 text-left text-sm transition ${
                    aiProvider === p.value ? "border-royal-500 bg-royal-50 ring-2 ring-royal-200" : "hover:bg-gray-50"
                  }`}
                >
                  <p className="font-medium">{p.label}</p>
                  <p className="text-xs text-gray-500">{p.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={`ใส่ ${aiProvider} API key...`}
              className="w-full rounded border px-3 py-2 text-sm font-mono" />
            <p className="mt-1 text-xs text-gray-400">Key จะถูกเก็บในเครื่องเท่านั้น (localStorage)</p>
          </div>

          {/* File Upload */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ไฟล์ ง9 (PDF)</label>
            <input type="file" accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded border px-3 py-2 text-sm" />
            {file && <p className="mt-1 text-xs text-green-600">เลือกแล้ว: {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
          </div>

          {/* Parse Button */}
          <button onClick={handleParse} disabled={!file || !apiKey || parsing}
            className="w-full rounded bg-royal-700 py-3 font-medium text-white hover:bg-royal-800 disabled:opacity-50">
            {parsing ? "กำลังอ่านเอกสาร..." : "อ่านเอกสารด้วย AI"}
          </button>

          {parseError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">{parseError}</div>
          )}
        </div>
      )}

      {/* Step 2: Review + Edit */}
      {parsed && !saved && (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-700 font-medium">
              AI อ่านข้อมูลเสร็จแล้ว — กรุณาตรวจสอบและแก้ไขก่อนบันทึก
            </p>
          </div>

          {/* ข้อมูลทั่วไป */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 font-semibold text-gray-800">2. ข้อมูลโครงการ</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500">ปีงบประมาณ</label>
                <select value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))}
                  className="w-full rounded border px-3 py-2 text-sm font-bold text-royal-700">
                  <option value={2569}>2569 (ปัจจุบัน)</option>
                  <option value={2570}>2570 (ปีหน้า)</option>
                  <option value={2571}>2571</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">โครงการหลัก</label>
                <select value={parsed.main_program}
                  onChange={(e) => updateField("main_program", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm">
                  {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">ชื่อโครงการ</label>
                <input type="text" value={parsed.project_name}
                  onChange={(e) => updateField("project_name", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">หน่วยงาน</label>
                <input type="text" value={parsed.organization}
                  onChange={(e) => updateField("organization", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">ผู้รับผิดชอบ</label>
                <input type="text" value={parsed.responsible}
                  onChange={(e) => updateField("responsible", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">ตำแหน่ง</label>
                <input type="text" value={parsed.responsible_title}
                  onChange={(e) => updateField("responsible_title", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">งบประมาณ (บาท)</label>
                <input type="number" value={parsed.budget_total}
                  onChange={(e) => updateField("budget_total", Number(e.target.value))}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">เบอร์โทร</label>
                <input type="text" value={parsed.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">ระยะเวลา</label>
                <input type="text" value={parsed.project_period}
                  onChange={(e) => updateField("project_period", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">สถานที่ดำเนินงาน</label>
                <input type="text" value={parsed.site}
                  onChange={(e) => updateField("site", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* กิจกรรม + Gantt */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">3. กิจกรรม ({parsed.activities.length} รายการ)</h2>
              <button onClick={addActivity}
                className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">
                + เพิ่มกิจกรรม
              </button>
            </div>

            <div className="space-y-3">
              {parsed.activities.map((act, idx) => (
                <div key={idx} className="rounded border p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-sm font-bold text-gray-400">{act.order}.</span>
                    <div className="flex-1 space-y-2">
                      <input type="text" value={act.name}
                        onChange={(e) => updateActivity(idx, "name", e.target.value)}
                        placeholder="ชื่อกิจกรรม"
                        className="w-full rounded border px-2 py-1 text-sm" />
                      <div className="flex gap-2">
                        <div className="w-28">
                          <label className="text-[10px] text-gray-400">งบ (บาท)</label>
                          <input type="number" value={act.budget}
                            onChange={(e) => updateActivity(idx, "budget", Number(e.target.value))}
                            className="w-full rounded border px-2 py-1 text-xs" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400">เดือนที่ทำ (คลิกเลือก)</label>
                          <div className="flex flex-wrap gap-1">
                            {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
                              <button key={m} type="button"
                                onClick={() => toggleMonth(idx, m)}
                                className={`rounded px-1.5 py-0.5 text-[10px] ${
                                  act.planned_months.includes(m)
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}>
                                {MONTH_LABELS[m]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <input type="text" value={act.output}
                        onChange={(e) => updateActivity(idx, "output", e.target.value)}
                        placeholder="ผลผลิตที่คาดหวัง"
                        className="w-full rounded border px-2 py-1 text-xs text-gray-600" />
                    </div>
                    <button onClick={() => removeActivity(idx)}
                      className="mt-1 text-red-400 hover:text-red-600">&#10005;</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 font-semibold text-gray-800">4. ตัวชี้วัด</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">เชิงปริมาณ (บรรทัดละ 1 ตัว)</label>
                <textarea value={parsed.kpi.quantitative.join("\n")}
                  onChange={(e) => setParsed({
                    ...parsed,
                    kpi: { ...parsed.kpi, quantitative: e.target.value.split("\n").filter(Boolean) }
                  })}
                  rows={4} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">เชิงคุณภาพ (บรรทัดละ 1 ตัว)</label>
                <textarea value={parsed.kpi.qualitative.join("\n")}
                  onChange={(e) => setParsed({
                    ...parsed,
                    kpi: { ...parsed.kpi, qualitative: e.target.value.split("\n").filter(Boolean) }
                  })}
                  rows={3} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-500">เชิงเวลา</label>
                  <input type="text" value={parsed.kpi.time_target}
                    onChange={(e) => setParsed({
                      ...parsed,
                      kpi: { ...parsed.kpi, time_target: e.target.value }
                    })}
                    className="w-full rounded border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">เชิงค่าใช้จ่าย</label>
                  <input type="text" value={parsed.kpi.budget_target}
                    onChange={(e) => setParsed({
                      ...parsed,
                      kpi: { ...parsed.kpi, budget_target: e.target.value }
                    })}
                    className="w-full rounded border px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <button onClick={() => setParsed(null)}
              className="flex-1 rounded border py-3 text-gray-600 hover:bg-gray-100">
              ยกเลิก / อ่านใหม่
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 rounded bg-royal-700 py-3 font-medium text-white hover:bg-royal-800 disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึกลง Supabase"}
            </button>
          </div>

          {saveError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
          )}
        </div>
      )}
    </div>
  );
}
