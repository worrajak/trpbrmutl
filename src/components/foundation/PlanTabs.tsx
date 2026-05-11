"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, PLAN_TO_DB_PROGRAM, type Plan } from "@/lib/foundation";

interface Props {
  /** count of projects per plan number */
  projectCounts: Record<number, number>;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("th-TH");
}

// Static class maps — กัน Tailwind purge dynamic gradient
// (ถ้าใช้ template string `from-${x}` Tailwind จะตัด CSS ออก แม้ safelist ก็ยังควรมี static fallback)
const PLAN_ACTIVE_BG: Record<number, string> = {
  1: "bg-cyan-700 hover:bg-cyan-800",
  2: "bg-violet-700 hover:bg-violet-800",
  3: "bg-emerald-700 hover:bg-emerald-800",
};

export default function PlanTabs({ projectCounts }: Props) {
  const [activePlan, setActivePlan] = useState<number>(1);
  const plan = PLANS.find((p) => p.number === activePlan)!;

  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
      {/* Tabs header */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50 px-3 py-3">
        {PLANS.map((p) => {
          const isActive = p.number === activePlan;
          const count = projectCounts[p.number] || 0;
          return (
            <button
              key={p.number}
              onClick={() => setActivePlan(p.number)}
              className={`flex items-start gap-2 rounded-lg px-4 py-2.5 text-left transition shadow-sm ${
                isActive
                  ? `${PLAN_ACTIVE_BG[p.number]} text-white shadow-md ring-2 ring-offset-2 ring-slate-300`
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
              }`}
            >
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  isActive ? "bg-white/25" : "bg-slate-100 text-slate-600"
                }`}
              >
                {p.number}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-bold leading-tight ${isActive ? "text-white" : "text-slate-800"}`}>
                  {p.shortTitle}
                </p>
                <p className={`text-xs leading-tight mt-0.5 ${isActive ? "text-white/85" : "text-slate-500"}`}>
                  {fmt(p.budget)} บาท · {count} โครงการ
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active plan content */}
      <PlanContent plan={plan} projectCount={projectCounts[plan.number] || 0} />
    </div>
  );
}

function PlanContent({ plan, projectCount }: { plan: Plan; projectCount: number }) {
  const dbProgramName = PLAN_TO_DB_PROGRAM[plan.number];
  return (
    <div className="space-y-5 p-5">
      {/* Description */}
      <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 p-4 text-sm text-slate-700">
        <p className="font-bold text-slate-900 mb-1.5 text-base leading-snug">{plan.title}</p>
        <p className="leading-relaxed">{plan.description}</p>
        <p className="mt-3 text-sm text-slate-700 leading-relaxed">
          🎯 <strong className="text-slate-900">วัตถุประสงค์:</strong> {plan.objective}
        </p>
      </div>

      {/* KPIs table */}
      <div>
        <p className="mb-2 text-sm font-bold text-slate-800">
          📊 ตัวชี้วัดของแผนงาน ({plan.kpis.length} ตัว)
        </p>
        <div className="rounded-lg ring-1 ring-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-[0.72rem] uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">ตัวชี้วัด</th>
                <th className="px-3 py-2 text-right w-20">เป้า</th>
                <th className="px-3 py-2 text-left w-20">หน่วย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.kpis.map((k) => (
                <tr key={k.id} className={k.highlight ? "bg-amber-50" : ""}>
                  <td className="px-3 py-2 text-slate-400">{k.id}</td>
                  <td className="px-3 py-2 text-slate-800 leading-snug">
                    {k.highlight && <span className="mr-1 text-amber-600">⭐</span>}
                    {k.name}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900">
                    {k.target.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{k.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          ⭐ = ตัวชี้วัดที่เน้น "การมีส่วนร่วม" และ "พื้นที่เรียนรู้" (สื่อตรง คน + พื้นที่)
        </p>
      </div>

      {/* Sub-projects */}
      <div>
        <p className="mb-2 text-sm font-bold text-slate-800">
          📋 โครงการย่อยภายใต้แผน ({plan.subProjects.length} โครงการ)
        </p>
        <div className="space-y-2">
          {plan.subProjects.map((sp, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="text-slate-800 leading-snug">{sp.name}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {sp.strategy && <span className="text-blue-700 font-medium">{sp.strategy}</span>}
                  {sp.strategy && sp.responsible && " · "}
                  {sp.responsible}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-slate-900">{fmt(sp.budget)}</p>
                <p className="text-xs text-slate-500">บาท</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-references */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-blue-50 p-3 ring-1 ring-blue-200">
          <p className="text-xs font-bold text-blue-800 uppercase mb-1.5">
            🏆 ตอบยุทธศาสตร์ มทร.ล้านนา
          </p>
          {plan.rmutlStrategies.map((s, i) => (
            <div key={i} className="text-sm text-blue-900 mb-1.5">
              <p className="font-medium leading-snug">{s.name}</p>
              <p className="text-xs text-blue-700 mt-0.5">
                ตัวชี้วัด:{" "}
                {s.kpiCodes.map((c, ci) => (
                  <code key={ci} className="rounded bg-white px-1.5 py-0.5 mr-1 text-xs ring-1 ring-blue-200 font-mono">
                    {c}
                  </code>
                ))}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <p className="text-xs font-bold text-emerald-800 uppercase mb-1.5">
            🌍 SDGs ที่ตอบ ({plan.sdgs.length}/17)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {plan.sdgs.map((s) => (
              <Link
                key={s}
                href={`/sdgs/${s}`}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
        <div className="text-xs text-slate-600">
          📁 ใน DB: <code className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 font-mono">{dbProgramName}</code>
          {" · "}
          <Link
            href={`/projects?main_program=${encodeURIComponent(dbProgramName)}`}
            className="text-blue-700 hover:underline font-medium"
          >
            ดู {projectCount} โครงการในแผน →
          </Link>
        </div>
        <a
          href={plan.pdfPath}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          📄 ดู PDF เต็ม
        </a>
      </div>
    </div>
  );
}
