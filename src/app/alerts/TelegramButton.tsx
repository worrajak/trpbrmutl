"use client";
import { useState } from "react";

export default function TelegramButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function handleSend() {
    setLoading(true);
    setResult("");
    const res = await fetch("/api/notify/telegram", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setResult("❌ " + (data.error || "เกิดข้อผิดพลาด"));
    } else {
      setResult(`✅ ส่ง Telegram แล้ว (${data.alerts} รายการ)`);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSend}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.012 9.482c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 14.447l-2.95-.924c-.642-.2-.655-.642.136-.953l11.52-4.44c.537-.194 1.006.131.686.118z"/>
        </svg>
        {loading ? "กำลังส่ง..." : "📨 ส่งแจ้งเตือน Telegram"}
      </button>
      {result && <span className="text-sm text-gray-600">{result}</span>}
    </div>
  );
}
