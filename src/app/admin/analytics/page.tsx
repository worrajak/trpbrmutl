"use client";

import { useState, useEffect } from "react";

interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  topClicks: { target: string; count: number }[];
  topPages: { page: string; count: number }[];
  dailyViews: { date: string; count: number }[];
  period: string;
}

const pageLabels: Record<string, string> = {
  "/": "หน้าแรก",
  "/projects": "โครงการย่อย",
  "/indicators": "ตัวชี้วัด",
  "/map": "แผนที่",
  "/staff": "บุคลากร",
  "/regulations": "ระเบียบ/ประกาศ",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);

  // ตรวจสอบ session จาก sessionStorage
  useEffect(() => {
    if (sessionStorage.getItem("admin_authed") === "1") {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days, authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem("admin_authed", "1");
      setAuthed(true);
    } else {
      setAuthError(true);
    }
  };

  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg"
        >
          <h1 className="mb-6 text-center text-xl font-bold text-royal-700">
            เข้าสู่ระบบ Admin
          </h1>
          <div className="mb-4">
            <label className="mb-1 block text-sm text-gray-600">
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm focus:border-royal-500 focus:outline-none focus:ring-1 focus:ring-royal-500"
              placeholder="ใส่รหัสผ่าน"
              autoFocus
            />
          </div>
          {authError && (
            <p className="mb-4 text-center text-sm text-red-500">
              รหัสผ่านไม่ถูกต้อง
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded bg-royal-700 px-4 py-2 text-sm font-medium text-white hover:bg-royal-800 transition"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-royal-700">
            สถิติการใช้งาน
          </h1>
          <p className="text-sm text-gray-600">
            ข้อมูลการเข้าชมและการคลิกลิงก์
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded border px-3 py-1.5 text-sm"
        >
          <option value={7}>7 วัน</option>
          <option value={30}>30 วัน</option>
          <option value={90}>90 วัน</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
      ) : !data ? (
        <div className="rounded-lg bg-yellow-50 p-6 text-center text-sm text-yellow-700">
          ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Supabase
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-xs text-gray-500">เข้าชมทั้งหมด</p>
              <p className="text-3xl font-bold text-royal-700">
                {data.totalViews.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">{data.period}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-xs text-gray-500">ผู้เข้าชม (unique)</p>
              <p className="text-3xl font-bold text-blue-600">
                {data.uniqueVisitors.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-xs text-gray-500">คลิกลิงก์ทั้งหมด</p>
              <p className="text-3xl font-bold text-green-600">
                {data.topClicks
                  .reduce((s, c) => s + c.count, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-xs text-gray-500">หน้าที่เข้าชมมากสุด</p>
              <p className="text-lg font-bold text-royal-700">
                {data.topPages[0]
                  ? pageLabels[data.topPages[0].page] || data.topPages[0].page
                  : "-"}
              </p>
              {data.topPages[0] && (
                <p className="text-xs text-gray-400">
                  {data.topPages[0].count} ครั้ง
                </p>
              )}
            </div>
          </div>

          {/* Daily chart (simple bar) */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              จำนวนเข้าชมรายวัน (7 วันล่าสุด)
            </h2>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {data.dailyViews.map((d) => {
                const max = Math.max(...data.dailyViews.map((v) => v.count), 1);
                const h = Math.max((d.count / max) * 100, 4);
                return (
                  <div
                    key={d.date}
                    className="flex flex-1 flex-col items-center"
                  >
                    <span className="mb-1 text-[10px] text-gray-500">
                      {d.count}
                    </span>
                    <div
                      className="w-full rounded-t bg-royal-500 transition-all"
                      style={{ height: `${h}px` }}
                    />
                    <span className="mt-1 text-[10px] text-gray-400">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Top pages */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                หน้าที่เข้าชมมากที่สุด
              </h2>
              {data.topPages.length === 0 ? (
                <p className="text-sm text-gray-400">ยังไม่มีข้อมูล</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {data.topPages.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 text-gray-700">
                          {pageLabels[p.page] || p.page}
                        </td>
                        <td className="py-2 text-right font-medium text-royal-700">
                          {p.count.toLocaleString()} ครั้ง
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top clicks */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                ลิงก์ที่คลิกมากที่สุด
              </h2>
              {data.topClicks.length === 0 ? (
                <p className="text-sm text-gray-400">ยังไม่มีข้อมูล</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {data.topClicks.map((c, i) => (
                      <tr key={i} className="border-t">
                        <td className="max-w-[200px] truncate py-2 text-gray-700">
                          {c.target}
                        </td>
                        <td className="py-2 text-right font-medium text-green-600">
                          {c.count.toLocaleString()} ครั้ง
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
