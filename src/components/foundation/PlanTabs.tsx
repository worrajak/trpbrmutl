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

export default function PlanTabs({ projectCounts }: Props) {
  const [activePlan, setActivePlan] = useState<number>(1);
  const plan = PLANS.find((p) => p.number === activePlan)!;

  return (
    <div className="rounded-lg bg-white ring-1 ring-gray-200 overflow-hidden">
      {/* Tabs header */}
      <div className="flex flex-wrap gap-1 border-b border-gray-100 bg-gray-50 px-3 py-2">
        {PLANS.map((p) => {
          const isActive = p.number === activePlan;
          const count = projectCounts[p.number] || 0;
          return (
            <button
              key={p.number}
              onClick={() => setActivePlan(p.number)}
              className={`flex items-start gap-2 rounded-md px-3 py-2 text-left transition ${
                isActive
                  ? `bg-gradient-to-r ${p.color} text-white shadow-md`
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isActive ? "bg-white/20" : "bg-gray-100 text-gray-600"
                }`}
              >
                {p.number}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-bold leading-tight ${isActive ? "text-white" : "text-gray-800"}`}>
                  {p.shortTitle}
                </p>
                <p className={`text-[10px] leading-tight ${isActive ? "text-white/80" : "text-gray-500"}`}>
                  {fmt(p.budget)} บาท · {count} โครงการในระบบ
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
    <div className="space-y-4 p-4">
      {/* Description */}
      <div className={`rounded-md bg-gradient-to-r ${plan.color} bg-opacity-5 p-3 text-xs text-gray-700`}>
        <p className="font-bold text-gray-900 mb-1">{plan.title}</p>
        <p>{plan.description}</p>
        <p className="mt-2 text-[11px] text-gray-600">
          🎯 <strong>วัตถุประสงค์:</strong> {plan.objective}
        </p>
      </div>

      {/* KPIs table */}
      <div>
        <p className="mb-1.5 text-xs font-bold text-gray-700">
          📊 ตัวชี้วัดของแผนงาน ({plan.kpis.length} ตัว)
        </p>
        <div className="rounded-md ring-1 ring-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr>
                <th className="px-2 py-1.5 text-left">#</th>
                <th className="px-2 py-1.5 text-left">ตัวชี้วัด</th>
                <th className="px-2 py-1.5 text-right">เป้า</th>
                <th className="px-2 py-1.5 text-left">หน่วย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plan.kpis.map((k) => (
                <tr key={k.id} className={k.highlight ? "bg-amber-50/50" : ""}>
                  <td className="px-2 py-1.5 text-gray-400">{k.id}</td>
                  <td className="px-2 py-1.5 text-gray-700">
                    {k.highlight && <span className="mr-1 text-amber-600">⭐</span>}
                    {k.name}
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-gray-900">
                    {k.target.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-gray-500">{k.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[10px] text-gray-400">
          ⭐ = ตัวชี้วัดที่เน้น "การมีส่วนร่วม" และ "พื้นที่เรียนรู้" (สื่อตรง คน + พื้นที่)
        </p>
      </div>

      {/* Sub-projects */}
      <div>
        <p className="mb-1.5 text-xs font-bold text-gray-700">
          📋 โครงการย่อยภายใต้แผน ({plan.subProjects.length} โครงการ)
        </p>
        <div className="space-y-1.5">
          {plan.subProjects.map((sp, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="text-gray-800">{sp.name}</p>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  {sp.strategy && <span className="text-blue-600">{sp.strategy}</span>}
                  {sp.strategy && sp.responsible && " · "}
                  {sp.responsible}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs font-bold text-gray-900">{fmt(sp.budget)}</p>
                <p className="text-[10px] text-gray-400">บาท</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-references */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-md bg-blue-50 p-2.5 ring-1 ring-blue-100">
          <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">
            🏆 ตอบยุทธศาสตร์ มทร.ล้านนา
          </p>
          {plan.rmutlStrategies.map((s, i) => (
            <div key={i} className="text-[11px] text-blue-900 mb-1">
              <p className="font-medium">{s.name}</p>
              <p className="text-blue-600">
                ตัวชี้วัด:{" "}
                {s.kpiCodes.map((c, ci) => (
                  <code key={ci} className="rounded bg-white px-1 mr-0.5 text-[10px]">
                    {c}
                  </code>
                ))}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-md bg-green-50 p-2.5 ring-1 ring-green-100">
          <p className="text-[10px] font-bold text-green-700 uppercase mb-1">
            🌍 SDGs ที่ตอบ ({plan.sdgs.length}/17)
          </p>
          <div className="flex flex-wrap gap-1">
            {plan.sdgs.map((s) => (
              <Link
                key={s}
                href={`/sdgs/${s}`}
                className="inline-flex items-center justify-center h-5 w-5 rounded text-[9px] font-bold text-white bg-green-600 hover:bg-green-700 transition"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <div className="text-[11px] text-gray-500">
          📁 ใน DB: <code className="rounded bg-gray-100 px-1.5 py-0.5">{dbProgramName}</code>
          {" · "}
          <Link
            href={`/projects?main_program=${encodeURIComponent(dbProgramName)}`}
            className="text-blue-600 hover:underline"
          >
            ดู {projectCount} โครงการในแผน →
          </Link>
        </div>
        <a
          href={plan.pdfPath}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          📄 ดู PDF เต็ม
        </a>
      </div>
    </div>
  );
}
