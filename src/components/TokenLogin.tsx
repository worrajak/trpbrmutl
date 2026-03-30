"use client";

import { useState } from "react";

interface TokenInfo {
  token_code: string;
  responsible_name: string;
  tron_wallet: string | null;
  projects: {
    id: string;
    project_name: string;
    main_program: string;
  } | null;
}

interface BalanceInfo {
  total_rpf: number;
  report_count: number;
  streak_count: number;
}

interface Props {
  projectId: string;
  onAuthenticated: (tokenCode: string, tokenInfo: TokenInfo) => void;
}

export default function TokenLogin({ projectId, onAuthenticated }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("กรุณาใส่ token 6 หลัก");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/supabase/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_code: code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Token ไม่ถูกต้อง");
      }

      // ตรวจว่า token ตรงกับโครงการนี้
      if (data.token.project_id !== projectId) {
        throw new Error("Token นี้ไม่ตรงกับโครงการนี้");
      }

      onAuthenticated(code, data.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-royal-300 bg-royal-50 p-6 text-center">
      <p className="text-sm text-gray-600">
        ใส่ Token 6 หลัก เพื่อรายงานความก้าวหน้าและรับ RPF Coin
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex items-center justify-center gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
          }}
          placeholder="______"
          maxLength={6}
          className="w-32 rounded border-2 border-royal-300 px-3 py-2 text-center font-mono text-xl tracking-[0.3em] focus:border-royal-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="rounded bg-royal-700 px-4 py-2 text-sm font-medium text-white hover:bg-royal-800 disabled:opacity-50"
        >
          {loading ? "..." : "เข้าสู่ระบบ"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-xs text-gray-400">
        Token ได้รับจากผู้ดูแลระบบ สำหรับหัวหน้าโครงการเท่านั้น
      </p>
    </div>
  );
}
