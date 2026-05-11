"use client";

import { useState, useEffect } from "react";
import { suggestToken, isValidToken, isValidPin } from "@/lib/team-auth";

/**
 * /admin/team — จัดการคณะทำงานใต้ร่มพระบารมี
 *
 * Use case: super-admin (password) สร้าง/แก้/ลบ team_members
 *  - กรอกชื่อ → auto-suggest token จากชื่อ
 *  - ตั้ง PIN 4 หลัก
 *  - role: team_member / team_lead
 *  - สิทธิ: can_edit (default true), can_delete (default false ตาม spec C1)
 */

interface Member {
  id: string;
  name: string;
  token: string;
  role: string;
  email: string | null;
  phone: string | null;
  can_edit: boolean;
  can_delete: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  last_login_at: string | null;
}

export default function AdminTeamPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  // Create form
  const [newName, setNewName] = useState("");
  const [newToken, setNewToken] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState<"team_member" | "team_lead">("team_member");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCanDelete, setNewCanDelete] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editing, setEditing] = useState<Member | null>(null);
  const [editPin, setEditPin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") === "true") {
      setAuthed(true);
      void loadMembers();
    }
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
      void loadMembers();
    } else alert("รหัสผ่านไม่ถูกต้อง");
  }

  async function loadMembers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team-members", { cache: "no-store" });
      const data = await res.json();
      setMembers(data.members || []);
    } finally {
      setLoading(false);
    }
  }

  function handleNameChange(name: string) {
    setNewName(name);
    if (!newToken && name.length > 2) {
      setNewToken(suggestToken(name));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidToken(newToken)) {
      setError("Token ต้องเป็น 6-8 ตัว A-Z, 0-9");
      return;
    }
    if (!isValidPin(newPin)) {
      setError("PIN ต้องเป็นตัวเลข 4 หลัก");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          token: newToken,
          pin: newPin,
          role: newRole,
          email: newEmail || undefined,
          phone: newPhone || undefined,
          can_delete: newCanDelete,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างไม่สำเร็จ");
      // reset
      setNewName("");
      setNewToken("");
      setNewPin("");
      setNewEmail("");
      setNewPhone("");
      setNewCanDelete(false);
      setShowCreate(false);
      await loadMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: editing.name,
        email: editing.email,
        phone: editing.phone,
        role: editing.role,
        can_edit: editing.can_edit,
        can_delete: editing.can_delete,
        is_active: editing.is_active,
        notes: editing.notes,
      };
      if (editPin) payload.pin = editPin;

      const res = await fetch(`/api/admin/team-members/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setEditing(null);
      setEditPin("");
      await loadMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: Member) {
    if (!confirm(`ลบ "${m.name}" (${m.token}) ถาวร?`)) return;
    try {
      const res = await fetch(`/api/admin/team-members/${m.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ลบไม่สำเร็จ");
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err: unknown) {
      alert("ลบไม่สำเร็จ: " + (err instanceof Error ? err.message : "เกิดข้อผิดพลาด"));
    }
  }

  // ===== Auth =====
  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
          <h1 className="mb-4 text-lg font-bold text-emerald-700">Admin · จัดการคณะทำงาน</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Super-admin"
            className="mb-3 w-full rounded border px-3 py-2"
          />
          <button className="w-full rounded bg-emerald-700 py-2 text-white hover:bg-emerald-800">
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-emerald-700">👥 คณะทำงานใต้ร่มพระบารมี</h1>
          <p className="text-sm text-slate-600">
            จัดการ team_members · ออก token + PIN · กำหนดสิทธิ
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/admin" className="rounded border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            ← กลับ /admin
          </a>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            {showCreate ? "✕ ปิดฟอร์ม" : "+ เพิ่มคณะทำงาน"}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg bg-emerald-50 ring-1 ring-emerald-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-emerald-800">เพิ่มคณะทำงานใหม่</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">ชื่อ-นามสกุล *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="นางสาวพิมลพรรณ เลิศบัวบาน"
                required
                className="w-full rounded border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[0.65rem] text-slate-500">
                💡 ระบบจะ suggest token อัตโนมัติเมื่อพิมพ์ชื่อ &gt; 2 ตัว
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-600">Token (6-8 ตัว A-Z, 0-9) *</label>
              <input
                type="text"
                value={newToken}
                onChange={(e) =>
                  setNewToken(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8))
                }
                placeholder="PIMOL01"
                required
                maxLength={8}
                className="w-full rounded border px-3 py-2 text-sm font-mono uppercase tracking-wider"
              />
              <p className="mt-1 text-[0.65rem] text-slate-500">เช่น PIMOL07, WACHR42</p>
            </div>
            <div>
              <label className="text-xs text-slate-600">PIN (4 ตัวเลข) *</label>
              <input
                type="text"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                required
                maxLength={4}
                className="w-full rounded border px-3 py-2 text-sm font-mono tracking-[0.4em] text-center"
              />
              <p className="mt-1 text-[0.65rem] text-slate-500">บอกเจ้าตัวให้เปลี่ยนเองภายหลัง (TODO)</p>
            </div>
            <div>
              <label className="text-xs text-slate-600">ตำแหน่ง</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "team_member" | "team_lead")}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="team_member">คณะทำงาน (team_member)</option>
                <option value="team_lead">หัวหน้าคณะทำงาน (team_lead)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="pimol@rmutl.ac.th"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">เบอร์โทร</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="0xx-xxx-xxxx"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCanDelete}
                  onChange={(e) => setNewCanDelete(e.target.checked)}
                />
                <span>
                  อนุญาตให้ <strong className="text-red-700">ลบ</strong> โครงการได้ (ปกติปิด · เปิดเฉพาะ team_lead)
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded bg-red-50 ring-1 ring-red-200 p-2 text-xs text-red-700">{error}</div>
          )}

          <div className="flex gap-2 pt-2 border-t border-emerald-200">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? "⏳ กำลังสร้าง..." : "✅ บันทึก + ออก Token"}
            </button>
          </div>
        </form>
      )}

      {/* Members table */}
      <div className="rounded-lg bg-white ring-1 ring-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">ชื่อ</th>
              <th className="px-3 py-2 text-left">Token</th>
              <th className="px-3 py-2 text-left">ตำแหน่ง</th>
              <th className="px-3 py-2 text-center">สิทธิ</th>
              <th className="px-3 py-2 text-left">Login ล่าสุด</th>
              <th className="px-3 py-2 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  ⏳ กำลังโหลด...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  ยังไม่มีคณะทำงาน — เริ่มเพิ่มได้เลย
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className={m.is_active ? "" : "opacity-50"}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800">{m.name}</p>
                    {m.email && <p className="text-[0.65rem] text-slate-500">{m.email}</p>}
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-emerald-700">{m.token}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {m.role === "team_lead" ? "🎖 หัวหน้าคณะทำงาน" : "👤 คณะทำงาน"}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    <span className={m.can_edit ? "text-blue-700" : "text-slate-300"}>
                      {m.can_edit ? "✓ Edit" : "—"}
                    </span>
                    {" · "}
                    <span className={m.can_delete ? "text-red-700" : "text-slate-300"}>
                      {m.can_delete ? "✓ Delete" : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {m.last_login_at ? new Date(m.last_login_at).toLocaleDateString("th-TH") : "ยังไม่เคย"}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <button
                      onClick={() => setEditing(m)}
                      className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                    >
                      ✏️ แก้ไข
                    </button>{" "}
                    <button
                      onClick={() => handleDelete(m)}
                      className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                    >
                      🗑 ลบ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-emerald-700 text-white px-5 py-3 rounded-t-2xl">
              <h3 className="font-bold">✏️ แก้ไข {editing.name}</h3>
              <p className="text-xs text-emerald-100 mt-0.5 font-mono">Token: {editing.token}</p>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-xs text-slate-600">ชื่อ</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600">Email</label>
                  <input
                    type="email"
                    value={editing.email || ""}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">เบอร์โทร</label>
                  <input
                    type="text"
                    value={editing.phone || ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-600">ตำแหน่ง</label>
                <select
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  className="w-full rounded border px-3 py-2 text-sm"
                >
                  <option value="team_member">คณะทำงาน (team_member)</option>
                  <option value="team_lead">หัวหน้าคณะทำงาน (team_lead)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 rounded bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.can_edit}
                    onChange={(e) => setEditing({ ...editing, can_edit: e.target.checked })}
                  />
                  <span>อนุญาตให้แก้ไขโครงการ</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.can_delete}
                    onChange={(e) => setEditing({ ...editing, can_delete: e.target.checked })}
                  />
                  <span className="text-red-700">อนุญาตให้ลบโครงการ</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  <span>Active (ปิดเพื่อ disable login ชั่วคราว)</span>
                </label>
              </div>
              <div>
                <label className="text-xs text-slate-600">รีเซ็ต PIN (เว้นว่างถ้าไม่ต้องการเปลี่ยน)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="PIN ใหม่ 4 หลัก"
                  maxLength={4}
                  className="w-full rounded border px-3 py-2 text-sm font-mono tracking-[0.4em] text-center"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">หมายเหตุ</label>
                <textarea
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              {error && (
                <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>
              )}
            </div>

            <div className="border-t bg-slate-50 px-5 py-3 flex gap-2 rounded-b-2xl">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="flex-1 rounded border bg-white py-2 text-sm hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
