import {
  mainProjects,
  subProjects as staticProjects,
  indicators,
  computeIndicatorSummary,
} from "@/lib/data";
import { fetchAllProjects } from "@/lib/sheets";
import NewsSection from "@/components/NewsSection";

export const revalidate = 300; // revalidate ทุก 5 นาที

function formatBudget(n: number): string {
  return n.toLocaleString("th-TH");
}

export default async function Home() {
  // ดึงจาก Google Sheets ถ้าได้ ไม่ได้ใช้ static
  let liveProjects = await fetchAllProjects();
  const subProjects = liveProjects.length > 0 ? liveProjects : staticProjects;
  const isLive = liveProjects.length > 0;

  const totalBudget = subProjects.reduce((s, p) => s + p.budget, 0);
  const approvedCount = subProjects.filter(
    (p) => p.status === "approved" || p.status === "completed"
  ).length;
  const completedCount = subProjects.filter(
    (p) => p.status === "completed"
  ).length;
  const summaries = computeIndicatorSummary(subProjects);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-royal-700">
          ภาพรวมโครงการใต้ร่มพระบารมี ปีงบประมาณ 2569
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา | รวม 3 โครงการหลัก: ขับเคลื่อนกลไก,
          ผลักดันเทคโนโลยี, พัฒนากำลังคน
        </p>
        {isLive && (
          <p className="mt-1 text-xs text-green-600">
            ข้อมูลจาก Google Sheets (อัปเดตทุก 5 นาที)
          </p>
        )}
        {!isLive && (
          <p className="mt-1 text-xs text-orange-500">
            ใช้ข้อมูล static (ไม่สามารถเชื่อมต่อ Google Sheets)
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">โครงการย่อยทั้งหมด</p>
          <p className="text-3xl font-bold text-royal-700">
            {subProjects.length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">งบประมาณรวม</p>
          <p className="text-2xl font-bold text-royal-700">
            {formatBudget(totalBudget)}
          </p>
          <p className="text-xs text-gray-400">บาท</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">อนุมัติแล้ว / ดำเนินการแล้ว</p>
          <p className="text-3xl font-bold text-green-600">
            {approvedCount}
            <span className="text-lg text-gray-400">
              /{subProjects.length}
            </span>
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">ดำเนินการแล้วเสร็จ (สวพส.)</p>
          <p className="text-3xl font-bold text-blue-600">{completedCount}</p>
        </div>
      </div>

      {/* Main Projects */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          โครงการหลัก
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mainProjects.map((mp) => {
            const subs = subProjects.filter(
              (sp) => sp.mainProjectId === mp.id
            );
            return (
              <a
                key={mp.id}
                href={`/projects?main=${mp.id}`}
                className="block rounded-lg bg-white p-4 shadow transition hover:shadow-md"
              >
                <span className="inline-block rounded bg-royal-100 px-2 py-0.5 text-xs font-medium text-royal-700">
                  {mp.source}
                </span>
                <h3 className="mt-2 text-sm font-semibold leading-tight">
                  {mp.name}
                </h3>
                <p className="mt-1 text-xs text-gray-500">{mp.strategy}</p>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-400">งบประมาณ</p>
                    <p className="font-semibold text-royal-700">
                      {formatBudget(mp.budget)}{" "}
                      <span className="text-xs font-normal">บาท</span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {subs.length} โครงการย่อย
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* ข่าวล่าสุด */}
      <NewsSection />

      {/* Indicator Summary */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          สรุปตัวชี้วัด
        </h2>
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-royal-700 text-white">
              <tr>
                <th className="px-4 py-2 text-left">ตัวชี้วัด</th>
                <th className="px-4 py-2 text-right">เป้าหมายรวม</th>
                <th className="px-4 py-2 text-right">ผลดำเนินการ</th>
                <th className="px-4 py-2 text-right">ร้อยละ</th>
                <th className="px-4 py-2 text-center">โครงการที่ตอบ</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.indicatorId} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <a
                      href={`/indicators#${s.indicatorId}`}
                      className="text-royal-600 hover:underline"
                    >
                      {s.indicatorName}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {s.overallTarget} {s.unit}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {s.totalActual} {s.unit}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                        s.percentage >= 80
                          ? "bg-green-100 text-green-700"
                          : s.percentage >= 40
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {s.percentage}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-gray-500">
                    {s.contributions.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
