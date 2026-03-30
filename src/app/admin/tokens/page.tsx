"use client";

import { useState, useEffect } from "react";

interface TokenData {
  token_code: string;
  project_id: string;
  responsible_name: string;
  tron_wallet: string | null;
  is_active: boolean;
  last_used_at: string | null;
  projects: {
    project_name: string;
    main_program: string;
    organization: string;
  } | null;
}

interface BalanceData {
  token_code: string;
  total_rpf: number;
  report_count: number;
  streak_count: number;
  last_report_date: string | null;
}

export default function AdminTokensPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [balances, setBalances] = useState<Record<string, BalanceData>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === "true") setAuthed(true);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem("admin_auth", "true");
      setAuthed(true);
    } else {
      alert("รหัสผ่านไม่ถูกต้อง");
    }
  }

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch("/api/supabase/admin/tokens")
      .then((r) => r.json())
      .then((data) => {
        setTokens(data.tokens || []);
        const balMap: Record<string, BalanceData> = {};
        for (const b of data.balances || []) {
          balMap[b.token_code] = b;
        }
        setBalances(balMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authed]);

  function copyToken(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = tokens.filter((t) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      t.token_code.includes(q) ||
      t.responsible_name.toLowerCase().includes(q) ||
      (t.projects?.project_name || "").toLowerCase().includes(q) ||
      (t.projects?.main_program || "").toLowerCase().includes(q) ||
      (t.projects?.organization || "").toLowerCase().includes(q)
    );
  });

  const totalRpf = Object.values(balances).reduce(
    (s, b) => s + Number(b.total_rpf),
    0
  );
  const totalReports = Object.values(balances).reduce(
    (s, b) => s + (b.report_count || 0),
    0
  );

  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
        >
          <h1 className="mb-4 text-lg font-bold text-royal-700">
            Admin - จัดการ Token
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Admin"
            className="mb-3 w-full rounded border px-3 py-2"
          />
          <button className="w-full rounded bg-royal-700 py-2 text-white hover:bg-royal-800">
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500">
        กำลังโหลดข้อมูล Token...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">
          จัดการ Token หัวหน้าโครงการ
        </h1>
        <p className="text-sm text-gray-600">
          แจก Token 6 หลักให้ หน.โครงการ เพื่อรายงานความก้าวหน้าและรับ RPF Coin
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">Token ทั้งหมด</p>
          <p className="text-2xl font-bold text-royal-700">{tokens.length}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">รายงานทั้งหมด</p>
          <p className="text-2xl font-bold text-blue-600">{totalReports}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">RPF แจกไปแล้ว</p>
          <p className="text-2xl font-bold text-green-600">
            {totalRpf.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">ใช้งานแล้ว</p>
          <p className="text-2xl font-bold text-purple-600">
            {tokens.filter((t) => t.last_used_at).length}
          </p>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="ค้นหา token, ชื่อโครงการ, ผู้รับผิดชอบ..."
        className="w-full rounded-lg border px-4 py-2 text-sm shadow-sm"
      />

      {/* Token Table */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-royal-700 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Token</th>
              <th className="px-3 py-2 text-left">โครงการ</th>
              <th className="px-3 py-2 text-left">ผู้รับผิดชอบ</th>
              <th className="px-3 py-2 text-right">RPF</th>
              <th className="px-3 py-2 text-center">รายงาน</th>
              <th className="px-3 py-2 text-center">Streak</th>
              <th className="px-3 py-2 text-center">ใช้ล่าสุด</th>
              <th className="px-3 py-2 text-center">Copy</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const bal = balances[t.token_code];
              return (
                <tr key={t.token_code} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="rounded bg-gray-100 px-2 py-1 font-mono text-lg font-bold tracking-wider text-royal-700">
                      {t.token_code}
                    </span>
                  </td>
                  <td className="max-w-xs px-3 py-2">
                    <a
                      href={`/projects/${t.project_id}`}
                      className="text-royal-600 hover:underline"
                    >
                      {(t.projects?.project_name || "").length > 40
                        ? (t.projects?.project_name || "").substring(0, 40) +
                          "..."
                        : t.projects?.project_name}
                    </a>
                    <p className="text-xs text-gray-400">
                      {t.projects?.organization}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs">{t.responsible_name}</td>
                  <td className="px-3 py-2 text-right font-bold text-green-600">
                    {Number(bal?.total_rpf || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {bal?.report_count || 0}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {(bal?.streak_count || 0) >= 3 ? (
                      <span className="text-orange-500">
                        &#128293; {bal?.streak_count}
                      </span>
                    ) : (
                      bal?.streak_count || 0
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-gray-400">
                    {t.last_used_at
                      ? new Date(t.last_used_at).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                        })
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => copyToken(t.token_code)}
                      className={`rounded px-2 py-1 text-xs ${
                        copied === t.token_code
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {copied === t.token_code ? "Copied!" : "Copy"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
