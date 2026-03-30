"use client";

import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");

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

  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
          <h1 className="mb-2 text-xl font-bold text-royal-700">Admin Panel</h1>
          <p className="mb-4 text-sm text-gray-500">ระบบจัดการโครงการใต้ร่มพระบารมี</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Admin"
            className="mb-3 w-full rounded border px-3 py-2"
            autoFocus
          />
          <button className="w-full rounded bg-royal-700 py-2 text-white hover:bg-royal-800">
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  const menuItems = [
    {
      href: "/admin/tokens",
      icon: "&#128273;",
      title: "จัดการ Token / RPF Coin",
      desc: "ดู Token 33 โครงการ, ยอด RPF, streak, แจก Token ให้ หน.โครงการ",
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    },
    {
      href: "/admin/upload-ngor9",
      icon: "&#128196;",
      title: "นำเข้าเอกสาร ง9",
      desc: "Upload PDF ง9 → AI อ่าน (Gemini/Claude/OpenAI) → แก้ไข → บันทึก",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    },
    {
      href: "/admin/analytics",
      icon: "&#128200;",
      title: "Google Analytics",
      desc: "สถิติการเข้าชม, หน้าที่นิยม, ลิงก์ที่ถูกคลิก, ผู้เยี่ยมชม",
      color: "bg-green-50 border-green-200 hover:bg-green-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">Admin Panel</h1>
        <p className="text-sm text-gray-600">ระบบจัดการโครงการใต้ร่มพระบารมี มทร.ล้านนา</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`block rounded-lg border-2 p-6 shadow-sm transition ${item.color}`}
          >
            <div className="text-3xl">{item.icon.startsWith("&") ?
              <span dangerouslySetInnerHTML={{ __html: item.icon }} /> : item.icon}</div>
            <h2 className="mt-3 text-lg font-semibold text-gray-800">{item.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
