import {
  fetchProjects,
  fetchActivities,
  computeActivityAlerts,
  getMonthName,
} from "@/lib/supabase-data";

export const revalidate = 60;

const alertConfig = {
  overdue: { label: "เลยกำหนด", dot: "bg-red-500", badge: "bg-red-100 text-red-700" },
  due_this_month: { label: "ถึงกำหนดเดือนนี้", dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700" },
  upcoming: { label: "กำลังจะถึง", dot: "bg-green-500", badge: "bg-green-100 text-green-700" },
};

export default async function AlertsPage() {
  const [projects, activities] = await Promise.all([
    fetchProjects(),
    fetchActivities(),
  ]);

  const alerts = computeActivityAlerts(projects, activities);

  const overdue = alerts.filter((a) => a.alertType === "overdue");
  const dueThisMonth = alerts.filter((a) => a.alertType === "due_this_month");
  const upcoming = alerts.filter((a) => a.alertType === "upcoming");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔔</span>
        <div>
          <h1 className="text-xl font-bold text-gray-800">การแจ้งเตือนกิจกรรม</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {alerts.length} รายการ</p>
        </div>
      </div>

      {alerts.length === 0 && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-8 text-center">
          <p className="text-2xl">✅</p>
          <p className="mt-2 font-medium text-green-700">ไม่มีการแจ้งเตือน</p>
          <p className="text-sm text-green-600">ทุกกิจกรรมดำเนินการตามแผน</p>
        </div>
      )}

      {/* Summary badges */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{overdue.length}</p>
            <p className="text-xs text-red-600">เลยกำหนด</p>
          </div>
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{dueThisMonth.length}</p>
            <p className="text-xs text-yellow-600">ถึงกำหนดเดือนนี้</p>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{upcoming.length}</p>
            <p className="text-xs text-green-600">กำลังจะถึง</p>
          </div>
        </div>
      )}

      {/* Alert list grouped by type */}
      {(["overdue", "due_this_month", "upcoming"] as const).map((type) => {
        const group = alerts.filter((a) => a.alertType === type);
        if (group.length === 0) return null;
        const cfg = alertConfig[type];
        return (
          <section key={type}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
              {cfg.label} ({group.length} รายการ)
            </h2>
            <div className="space-y-2">
              {group.map((alert, i) => (
                <a
                  key={i}
                  href={`/projects/${alert.projectId}`}
                  className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm transition hover:shadow-md"
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 leading-snug">
                      {alert.projectName}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {alert.activityName}
                      {" · "}แผน: {getMonthName(alert.plannedMonth)}
                      {alert.responsible && ` · ${alert.responsible}`}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
