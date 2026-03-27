import dynamic from "next/dynamic";
import { locations } from "@/lib/locations";
import { subProjects } from "@/lib/data";

// Dynamic import เพื่อปิด SSR สำหรับ Leaflet
const ProjectMap = dynamic(() => import("@/components/ProjectMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center rounded-lg bg-gray-100">
      <p className="text-sm text-gray-500">กำลังโหลดแผนที่...</p>
    </div>
  ),
});

export default function MapPage() {
  const totalLocations = locations.length;
  const locationsWithProjects = locations.filter(
    (l) => l.subProjectIds.length > 0
  ).length;
  const provinceSet = new Set(locations.map((l) => l.province));
  const provinces = Array.from(provinceSet);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">
          แผนที่พื้นที่ดำเนินงาน
        </h1>
        <p className="text-sm text-gray-600">
          พื้นที่โครงการหลวงและพื้นที่ดำเนินงาน ปีงบประมาณ 2569
        </p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-lg bg-white px-4 py-3 shadow">
          <p className="text-xs text-gray-500">พื้นที่ทั้งหมด</p>
          <p className="text-2xl font-bold text-royal-700">{totalLocations}</p>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 shadow">
          <p className="text-xs text-gray-500">มีโครงการดำเนินงาน</p>
          <p className="text-2xl font-bold text-green-600">
            {locationsWithProjects}
          </p>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 shadow">
          <p className="text-xs text-gray-500">จังหวัด</p>
          <p className="text-2xl font-bold text-blue-600">
            {provinces.length}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-green-600" />
          อนุมัติแล้ว
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
          ดำเนินการแล้ว
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-600" />
          อยู่ในกระบวนการ
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
          ปรับแก้ไข
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-gray-400" />
          ยังไม่มีโครงการ
        </span>
      </div>

      {/* Map */}
      <ProjectMap />

      {/* Location list */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          รายชื่อพื้นที่
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">พื้นที่</th>
                <th className="px-3 py-2 text-left">จังหวัด</th>
                <th className="px-3 py-2 text-center">โครงการ</th>
                <th className="px-3 py-2 text-left">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => {
                const locProjects = loc.subProjectIds
                  .map((id) => subProjects.find((sp) => sp.id === id))
                  .filter(Boolean);
                return (
                  <tr key={loc.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{loc.name}</td>
                    <td className="px-3 py-2 text-gray-500">{loc.province}</td>
                    <td className="px-3 py-2 text-center">
                      {locProjects.length > 0 ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {locProjects.length}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {locProjects.map((sp) =>
                        sp ? (
                          <a
                            key={sp.id}
                            href={`/projects/${sp.id}`}
                            className="mr-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-100"
                          >
                            {sp.code}
                          </a>
                        ) : null
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
