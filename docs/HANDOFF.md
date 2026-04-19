# เอกสารส่งมอบงาน (Handoff)

**โครงการ:** ระบบติดตามโครงการใต้ร่มพระบารมี · RMUTL ปีงบประมาณ 2569
**วันที่ส่งมอบ:** 2026-04-19
**สถานะ:** ✅ Production (deploy บน Vercel — ใช้งานจริง)
**ผู้รับมอบ:** กลุ่มแผนงานใต้ร่มพระบารมี · มทร.ล้านนา

---

## 1. รายการส่งมอบ

### 1.1 ระบบที่ใช้งานได้ (ขึ้น live)

| รายการ | รายละเอียด |
|---|---|
| **Web application** | Next.js 14 · Deploy บน Vercel |
| **Database** | Supabase PostgreSQL · 12 ตาราง · RLS เปิด |
| **Domain** | _(ระบุ URL จริง)_ |
| **Admin panel** | `/admin` — password-protected |
| **Token system** | 6-digit code ต่อโครงการ — ให้ หน.โครงการ self-report |
| **Budget reconciliation** | แสดงงบ 3 แหล่ง (total / ERP / reported) ทุกหน้าโครงการ |
| **Reward engine** | RPF coin อัตโนมัติ — on_time, early, consistency, kpi_verified, kpi_exceeded |

### 1.2 Source Code & Repository

| รายการ | Path |
|---|---|
| GitHub repo | `github.com/worrajak/trpbrmutl` (branch: `main`) |
| Local clone | `~/Dropbox/2012-02-08_TheRoyalProject_x/RPF-Researcher-Profile` |
| Backup ไฟล์ | `backups/` (JSON snapshots) |

### 1.3 เอกสาร

| ไฟล์ | เนื้อหา | ผู้อ่าน |
|---|---|---|
| [`README.md`](../README.md) | ภาพรวม · tech stack · features | ทุกคน |
| [`docs/USER_MANUAL.md`](./USER_MANUAL.md) | วิธีส่งรายงาน/แก้ไข | หน.โครงการ |
| [`docs/ADMIN_MANUAL.md`](./ADMIN_MANUAL.md) | Sync/Repair/Token tools | Admin |
| [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) | คู่มือทำซ้ำ (ตั้งระบบใหม่) | DevOps |
| [`docs/HANDOFF.md`](./HANDOFF.md) | เอกสารนี้ — รายการส่งมอบ | ผู้รับมอบ |
| [`INSTRUCTION.md`](../INSTRUCTION.md) | โครงสร้างข้อมูล · API รายละเอียด | Developer |

### 1.4 ข้อมูลที่ seed ไว้แล้ว

| ตาราง | จำนวน | ที่มา |
|---|---|---|
| `projects` | 53 | Excel `9_4_2569_งบประมาณ...xlsx` (sync ล่าสุด 2026-04-19) |
| `activities` | ~265 | จาก ง.9 (บาง project seed แล้ว, บาง project ยังรอ parse ง.9) |
| `kpi_targets` | — | Per project (KPI 10, 35, 36, 39, 40 + เพิ่มเติม) |
| `project_tokens` | ≈ 53 | generate ครบทุกโครงการ (ส่งให้ หน.แล้ว) |
| `activity_reports` | — | เริ่ม seed บางส่วน (LoRa Mesh, โคกหนองนา, ฯลฯ) |

---

## 2. Credentials ที่ต้องส่งมอบ (แยก transmission — ไม่ commit ใน git)

> ⚠️ **ห้ามวางใน Git/Slack/Email แบบไม่เข้ารหัส**
> ส่งผ่าน 1Password, Bitwarden, หรือ `.env.local` ใน USB encrypted

### 2.1 Supabase
- **Project URL:** `https://<project-id>.supabase.co`
- **Anon key:** (ใช้ใน web)
- **Service role key:** (ใช้สำหรับ delete/admin script)
- **Database password:** (สำหรับ pg_dump)
- **Dashboard login:** (email/password ที่ตั้งไว้)

### 2.2 Vercel
- **Project:** `trpbrmutl`
- **Owner:** `worrajak@gmail.com` (ขอโอน ownership ถ้าเปลี่ยนคน)
- **Environment variables:** คัดลอกจาก Vercel Dashboard → Settings → Environment Variables
- **Custom domain:** _(ระบุ)_ · DNS: _(ระบุ)_

### 2.3 GitHub
- **Repo:** `github.com/worrajak/trpbrmutl`
- **Admin access:** `worrajak`
- ขอเพิ่ม collaborator: `<email ของผู้รับมอบ>`

### 2.4 Admin password (ใน web)
- กำหนดใน env: `ADMIN_PASSWORD=...`
- แนะนำเปลี่ยนหลัง handoff

### 2.5 ช่อง Telegram (ถ้าใช้งาน)
- Bot: `@RPFbot_bot`
- Channel/Chat ID: _(ระบุ)_
- Token: _(ระบุ)_

---

## 3. Timeline & สถานะฟีเจอร์

### ✅ ส่งมอบแล้ว (Production ready)

- [x] หน้าสาธารณะ: /, /projects, /projects/[id], /indicators, /map, /staff, /sdgs
- [x] Admin panel + password auth
- [x] Sync Excel งบประมาณ ERP (manual upload)
- [x] Token-based auth สำหรับ หน.โครงการ
- [x] Report form (description, budget, evidence, KPI, SDGs, new KPIs)
- [x] **แก้ไขรายงานเดิมผ่าน modal** (คำอธิบาย/ยอดเงิน/หลักฐาน)
- [x] **Inline quick-edit ยอดเงิน** (💰 แก้ยอด)
- [x] Budget reconciliation 3 แหล่ง
- [x] Repair budget tool (admin)
- [x] Cleanup parent projects (ERP 0000)
- [x] Cleanup duplicate ERP (SQL)
- [x] Reward engine (5 ประเภท)
- [x] SDG tagging ต่อโครงการ/รายงาน
- [x] S-Curve chart
- [x] Leaflet map 21 พื้นที่
- [x] Backup JSON endpoint
- [x] **Unified schema SQL** (`supabase/schema.sql`)
- [x] เอกสาร: README + 4 manuals ใน `docs/`

### 🚧 ยังไม่ได้ทำ (TODO / Phase 2)

- [ ] File upload ตัวระบบ (ตอนนี้ใช้ Drive URL) — อาจใช้ Supabase Storage
- [ ] Restore script จาก JSON backup
- [ ] Authentication เต็มรูปแบบ (Supabase Auth) แทน token+admin password
- [ ] Approval workflow — ตอนนี้ auto-approve รายงานทุกตัว
- [ ] Email/SMS notification ให้ หน.โครงการ (ตอนนี้มี Telegram)
- [ ] Dashboard analytics ลึกกว่านี้ (heatmap, trend, ฯลฯ)
- [ ] Export Excel/PDF สำหรับรายงานสรุปผู้บริหาร
- [ ] Multi-year support (ตอนนี้ hardcode 2569 ใน query บางที่)

---

## 4. ความเสี่ยง & ข้อควรระวัง

| เรื่อง | รายละเอียด | ความเสี่ยง | ทางแก้ |
|---|---|---|---|
| RLS ผ่อน | anon key INSERT/UPDATE ได้ทุกตาราง | 🟡 กลาง | ใช้ service_role สำหรับ production / จำกัด policy ก่อน launch จริง |
| Supabase free tier | จำกัด 500MB DB, 2GB bandwidth/month | 🟢 ต่ำ | Monitor usage — upgrade Pro เมื่อใกล้เต็ม |
| Token leak | Token 6 หลัก ถ้าหลุด คนอื่นแก้ข้อมูลได้ | 🟡 กลาง | แนะนำ หน.เปลี่ยน token รายไตรมาส / เพิ่ม logging |
| ไม่มี DELETE policy | ลบต้องใช้ SQL Editor | 🟢 ต่ำ | เป็น feature ไม่ใช่ bug — ปลอดภัยกว่า |
| Budget bug เก่า | โค้ดเวอร์ชันก่อน เคยบวก `budget_used` ซ้ำ | 🟢 แก้แล้ว | มี Repair Budget tool · ใช้ SUM ใน API ใหม่ทั้งหมด |
| Duplicate ERP | มี seed ที่ใช้ ERP ซ้ำ | 🟢 แก้แล้ว | SQL cleanup script + unique constraint ถ้าต้องการ (optional) |

---

## 5. การบำรุงรักษาประจำ

| ความถี่ | งาน |
|---|---|
| **รายเดือน** | Sync Excel งบประมาณรายเดือน (ต้นเดือน) |
| **รายเดือน** | Backup JSON + เก็บใน Dropbox |
| **รายไตรมาส** | รัน Repair Budget (dry-run) ดูว่ามี project ใดข้อมูลไม่ตรงไหม |
| **รายไตรมาส** | ตรวจ `project_tokens.is_active` — revoke token ของคนที่ไม่ต้องการแล้ว |
| **รายปี** | Archive ข้อมูลปีเก่า + ตั้ง Supabase project ใหม่ (ดู DEPLOYMENT.md) |
| **ตามโอกาส** | Parse ง.9 เข้าโครงการใหม่ที่ยังไม่มี activities/KPIs |

---

## 6. ติดต่อ

| บทบาท | ชื่อ | ช่องทาง |
|---|---|---|
| Developer (ผู้ส่งมอบ) | _(ระบุ)_ | worrajak@gmail.com |
| Admin หลัก | _(ระบุ)_ | — |
| ทีมกลุ่มแผนงาน | — | trpb.rmutl.ac.th |

**AI Collaboration:** ระบบนี้พัฒนาร่วมกับ Claude (Anthropic) ผ่าน Claude Code CLI — commit history ในเว้นบางส่วนระบุ `Co-Authored-By: Claude`

---

## 7. Checklist การรับมอบ

ผู้รับมอบตรวจ:

- [ ] ได้รับ credentials (Supabase, Vercel, GitHub) ผ่านช่องทางปลอดภัย
- [ ] เข้า Supabase Dashboard ได้ — เห็น 12 ตาราง + ข้อมูล
- [ ] เข้า Vercel Dashboard ได้ — เห็น production deployment
- [ ] Clone repo + `npm install` + `npm run dev` ติดที่ localhost สำเร็จ
- [ ] ลองเข้า `/admin` ด้วย password → ผ่าน
- [ ] ลอง Sync Excel ทดสอบ 1 รอบ → ยอดถูก
- [ ] ลอง generate token ใหม่ 1 อัน → หน.ทดลองรายงาน → `budget_reported` เพิ่ม
- [ ] อ่าน `docs/USER_MANUAL.md` + `docs/ADMIN_MANUAL.md` ครบ
- [ ] เก็บ `backup-YYYY-MM-DD.json` ล่าสุดไว้

เมื่อทุกข้อครบ → **✅ รับมอบงานสมบูรณ์**

---

_เอกสารฉบับนี้ commit ใน repo_ · _อัปเดตล่าสุด: 2026-04-19_
