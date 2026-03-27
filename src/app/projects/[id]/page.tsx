import { subProjects, getMainProjectById, getIndicatorById } from "@/lib/data";
import { notFound } from "next/navigation";
import SCurveChart from "@/components/SCurveChart";

function formatBudget(n: number): string {
  return n.toLocaleString("th-TH");
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  approved: { text: "อนุมัติแล้ว", cls: "bg-green-100 text-green-700" },
  completed: { text: "ดำเนินการแล้ว", cls: "bg-blue-100 text-blue-700" },
  pending: { text: "อยู่ในกระบวนการ", cls: "bg-yellow-100 text-yellow-700" },
  revision: { text: "ปรับแก้ไข", cls: "bg-red-100 text-red-700" },
};

// คำนวณเดือนปัจจุบันเทียบกับ ต.ค. 68 (index 0)
function getCurrentMonth(): number {
  const now = new Date();
  // ต.ค. 68 = October 2025 (month 9, year 2025)
  const startYear = 2025;
  const startMonth = 9; // October (0-indexed)
  const diff = (now.getFullYear() - startYear) * 12 + (now.getMonth() - startMonth);
  return Math.max(0, Math.min(11, diff));
}

// สร้างข้อมูล actual ตาม status
function generateActual(status: string, currentMonth: number): number[] {
  const planned = [2, 8, 18, 32, 48, 62, 74, 84, 91, 96, 99, 100];

  if (status === "completed") {
    // ดำเนินการแล้วเสร็จ — actual ≈ planned
    return planned.slice(0, currentMonth + 1).map((v) =>
      Math.min(100, v + Math.round(Math.random() * 3))
    );
  }
  if (status === "approved") {
    // อนุมัติแล้ว กำลังดำเนินการ — actual ต่ำกว่า planned เล็กน้อย
    return planned.slice(0, currentMonth + 1).map((v, i) =>
      Math.max(0, Math.round(v * 0.85))
    );
  }
  if (status === "revision") {
    // ปรับแก้ไข — ยังไม่ค่อยมีความก้าวหน้า
    return planned.slice(0, currentMonth + 1).map((v) =>
      Math.max(0, Math.round(v * 0.3))
    );
  }
  // pending
  return planned.slice(0, currentMonth + 1).map((v) =>
    Math.max(0, Math.round(v * 0.5))
  );
}

export function generateStaticParams() {
  return subProjects.map((sp) => ({ id: sp.id }));
}

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = subProjects.find((sp) => sp.id === params.id);
  if (!project) return notFound();

  const main = getMainProjectById(project.mainProjectId);
  const st = statusLabel[project.status];
  const budgetUsedPct =
    project.budgetUsed !== undefined
      ? Math.round((project.budgetUsed / project.budget) * 100)
      : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <a href="/" className="hover:text-royal-600">
          หน้าแรก
        </a>
        {" / "}
        <a href="/projects" className="hover:text-royal-600">
          โครงการย่อย
        </a>
        {" / "}
        <span className="text-gray-700">{project.code}</span>
      </nav>

      {/* Project header */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-block rounded bg-royal-100 px-2 py-0.5 text-xs font-medium text-royal-700">
              {main?.source}
            </span>
            <span className={`ml-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${st.cls}`}>
              {st.text}
            </span>
          </div>
          <span className="font-mono text-sm text-gray-500">{project.code}</span>
        </div>
        <h1 className="mt-3 text-xl font-bold text-gray-900">{project.name}</h1>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">งบประมาณ</p>
            <p className="text-lg font-bold text-royal-700">
              {formatBudget(project.budget)} <span className="text-xs font-normal">บาท</span>
            </p>
          </div>
          {project.budgetUsed !== undefined && (
            <div>
              <p className="text-xs text-gray-500">ใช้จ่ายแล้ว</p>
              <p className="text-lg font-bold text-blue-600">
                {formatBudget(project.budgetUsed)}{" "}
                <span className="text-xs font-normal">บาท ({budgetUsedPct}%)</span>
              </p>
            </div>
          )}
          {project.budgetRemaining !== undefined && (
            <div>
              <p className="text-xs text-gray-500">คงเหลือ</p>
              <p className="text-lg font-bold text-gray-600">
                {formatBudget(project.budgetRemaining)}{" "}
                <span className="text-xs font-normal">บาท</span>
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">ผู้รับผิดชอบ</p>
            <p className="font-medium">{project.responsible || "-"}</p>
            {project.responsibleOrg && (
              <p className="text-xs text-gray-400">{project.responsibleOrg}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">พื้นที่ดำเนินงาน</p>
            <p className="font-medium">{project.site}</p>
          </div>
        </div>

        {/* Budget progress bar */}
        {budgetUsedPct !== null && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500">
              <span>การใช้งบประมาณ</span>
              <span>{budgetUsedPct}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-royal-500 transition-all"
                style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {main && (
          <div className="mt-4 rounded bg-gray-50 p-3">
            <p className="text-xs text-gray-500">โครงการหลัก</p>
            <p className="text-sm font-medium">{main.name}</p>
            <p className="text-xs text-gray-400">
              {main.strategy} | {main.plan}
            </p>
          </div>
        )}
      </div>

      {/* S-Curve Progress */}
      <div className="rounded-lg bg-white p-6 shadow">
        <SCurveChart
          currentMonth={getCurrentMonth()}
          actual={generateActual(project.status, getCurrentMonth())}
          milestones={
            project.status === "completed"
              ? [
                  { month: 0, label: "เริ่มโครงการ" },
                  { month: getCurrentMonth(), label: "แล้วเสร็จ" },
                ]
              : project.status === "approved"
              ? [{ month: 0, label: "อนุมัติ" }]
              : []
          }
        />
      </div>

      {/* KPI Output */}
      {project.kpiText && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold text-gray-800">
            ผลผลิต / ตัวชี้วัดตามแผนปฏิบัติงาน
          </h2>
          <p className="whitespace-pre-line text-sm text-gray-700">
            {project.kpiText}
          </p>
        </div>
      )}

      {/* Indicator Contributions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          ผลตอบตัวชี้วัด
        </h2>
        {project.indicatorContributions.length === 0 ? (
          <p className="text-sm text-gray-500">ไม่มีข้อมูลตัวชี้วัด</p>
        ) : (
          <div className="space-y-4">
            {project.indicatorContributions.map((ic) => {
              const ind = getIndicatorById(ic.indicatorId);
              const pct = ic.target > 0 ? Math.round((ic.actual / ic.target) * 100) : 0;
              return (
                <div key={ic.indicatorId} className="rounded border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-royal-700">
                        {ind?.code || ic.indicatorId}
                      </p>
                      <p className="text-sm text-gray-600">{ind?.name}</p>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        pct >= 80
                          ? "bg-green-100 text-green-700"
                          : pct >= 40
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">เป้าหมาย</p>
                      <p className="font-semibold">
                        {ic.target} {ic.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">ผลดำเนินการ</p>
                      <p className="font-semibold text-blue-600">
                        {ic.actual} {ic.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">รายละเอียด</p>
                      <p>{ic.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-200">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-400"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expected outputs (สวพส.) */}
      {project.expectedOutputs && project.expectedOutputs.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold text-gray-800">
            ผลที่คาดว่าจะได้รับ
          </h2>
          <ul className="list-inside list-decimal space-y-1 text-sm text-gray-700">
            {project.expectedOutputs.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
