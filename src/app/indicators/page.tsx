import { indicators, getIndicatorSummary } from "@/lib/data";

export default function IndicatorsPage() {
  const summaries = getIndicatorSummary();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">
          รายงานผลตัวชี้วัด
        </h1>
        <p className="text-sm text-gray-600">
          ภาพรวมการดำเนินงานตอบตัวชี้วัดของมหาวิทยาลัย ปีงบประมาณ 2569
        </p>
      </div>

      {/* Overall progress */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s) => {
          const ind = indicators.find((i) => i.id === s.indicatorId)!;
          return (
            <div
              key={s.indicatorId}
              id={s.indicatorId}
              className="rounded-lg bg-white p-5 shadow"
            >
              <p className="text-xs font-medium text-gray-400">{ind.code}</p>
              <h3 className="mt-1 text-sm font-semibold leading-snug text-gray-800">
                {s.indicatorName}
              </h3>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-royal-700">
                    {s.totalActual}
                    <span className="text-base text-gray-400">
                      /{s.overallTarget}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">{s.unit}</p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-sm font-bold ${
                    s.percentage >= 80
                      ? "bg-green-100 text-green-700"
                      : s.percentage >= 40
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {s.percentage}%
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full transition-all ${
                    s.percentage >= 80
                      ? "bg-green-500"
                      : s.percentage >= 40
                      ? "bg-yellow-500"
                      : "bg-red-400"
                  }`}
                  style={{ width: `${Math.min(s.percentage, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                เป้าหมายรวมระดับมหาวิทยาลัย: {ind.target} {ind.unit}
              </p>
            </div>
          );
        })}
      </div>

      {/* Detail per indicator */}
      {summaries.map((s) => {
        const ind = indicators.find((i) => i.id === s.indicatorId)!;
        return (
          <section key={s.indicatorId} className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-royal-700">
                  {ind.code}
                </h2>
                <p className="text-sm text-gray-600">{ind.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-royal-700">
                  {s.totalActual}/{s.overallTarget}
                </p>
                <p className="text-xs text-gray-500">{s.unit}</p>
              </div>
            </div>

            {s.contributions.length === 0 ? (
              <p className="text-sm text-gray-500">ยังไม่มีโครงการที่ตอบตัวชี้วัดนี้</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">โครงการย่อย</th>
                      <th className="px-3 py-2 text-right">เป้าหมาย</th>
                      <th className="px-3 py-2 text-right">ผลดำเนินการ</th>
                      <th className="px-3 py-2 text-right">ร้อยละ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.contributions.map((c) => {
                      const pct =
                        c.target > 0
                          ? Math.round((c.actual / c.target) * 100)
                          : 0;
                      return (
                        <tr key={c.subProjectId} className="border-t">
                          <td className="px-3 py-2">
                            <a
                              href={`/projects/${c.subProjectId}`}
                              className="text-royal-600 hover:underline"
                            >
                              {c.subProjectName.length > 70
                                ? c.subProjectName.substring(0, 70) + "..."
                                : c.subProjectName}
                            </a>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {c.target} {s.unit}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {c.actual} {s.unit}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                                pct >= 80
                                  ? "bg-green-100 text-green-700"
                                  : pct >= 40
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-3 py-2">รวม</td>
                      <td className="px-3 py-2 text-right">
                        {s.overallTarget} {s.unit}
                      </td>
                      <td className="px-3 py-2 text-right text-royal-700">
                        {s.totalActual} {s.unit}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
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
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
