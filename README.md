# TRPB RMUTL — ระบบติดตามโครงการใต้ร่มพระบารมี

ระบบติดตามโครงการย่อย งบประมาณ ตัวชี้วัด และรายงานผลดำเนินงาน
ของกลุ่มแผนงานใต้ร่มพระบารมี **มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา (RMUTL)**
ปีงบประมาณ 2569 (งบ 8,000,000 บาท — 53 โครงการย่อย)

> เว็บไซต์: _(ระบุหลัง deploy — Vercel)_
> Repo: `github.com/worrajak/trpbrmutl`

---

## 📚 Documentation

| ไฟล์ | สำหรับใคร | เนื้อหา |
|---|---|---|
| [`README.md`](./README.md) | ทุกคน | ภาพรวม, Tech stack, Quick start (คุณอยู่ที่นี่) |
| [`docs/USER_MANUAL.md`](./docs/USER_MANUAL.md) | หัวหน้าโครงการ | วิธีส่งรายงาน · กรอกยอดเงิน · แก้ไขรายงานด้วย Token |
| [`docs/ADMIN_MANUAL.md`](./docs/ADMIN_MANUAL.md) | Admin | Sync Excel · Generate tokens · Repair budget · Cleanup |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | DevOps / ผู้ตั้งค่าระบบใหม่ | คู่มือการทำซ้ำ — ตั้ง Supabase + Vercel จาก 0 |
| [`docs/HANDOFF.md`](./docs/HANDOFF.md) | ผู้รับมอบงาน | รายการส่งมอบ · Credential · สิ่งที่ deploy แล้ว |
| [`INSTRUCTION.md`](./INSTRUCTION.md) | Developer | รายละเอียดโครงสร้างข้อมูล · API · business logic |

---

## ✨ Features (สรุป)

### สาธารณะ (ไม่ต้องล็อกอิน)
- 🏠 **หน้าภาพรวม** (`/`) — งบรวม, โครงการทั้งหมด, สถานะ
- 📋 **โครงการย่อย** (`/projects`) — 53 โครงการ, ค้นหา/กรองตามแผนงาน, พื้นที่, สถานะ
- 📊 **รายละเอียดโครงการ** (`/projects/[id]`) — งบ · กิจกรรม · KPI · รายงาน · S-Curve · BudgetReconciliation
- 🎯 **ตัวชี้วัด** (`/indicators`) — 5 KPI รวม (มทร. 10, 35, 36, 39, 40)
- 🗺️ **แผนที่** (`/map`) — Leaflet, 21 พื้นที่ดำเนินงาน
- 👥 **บุคลากร** (`/staff`) — 13 คน จาก trpb.rmutl.ac.th
- 🌍 **SDGs** (`/sdgs`, `/sdgs/[goal]`) — โครงการจัดกลุ่มตาม 17 SDGs

### สำหรับหัวหน้าโครงการ (ใช้ Token 6 หลัก)
- 📝 **ส่งรายงาน** (`/projects/[id]` → กดปุ่ม "รายงานผล")
  - คำอธิบาย · หลักฐานแนบ (รูป/PDF/ลิงก์/วิดีโอ) · ยอดเงินที่ใช้ · ตอบตัวชี้วัด · เพิ่ม KPI ใหม่ · ติด SDG tags
- ✏️ **แก้ไขรายงานเดิม** — ปุ่ม ✏️ บนแต่ละรายงาน → Modal แก้คำอธิบาย/ยอดเงิน/หลักฐาน
- 💰 **แก้ยอดเงินเร็ว** — inline edit (ไม่เปิด modal)
- 🎁 **RPF Reward** — รายงานตรงเวลา → ได้ RPF coin (reward engine)

### สำหรับ Admin (`/admin` → เมนู Tools)
- 🔄 **Sync Excel → Supabase** — อัปโหลด Excel งบประมาณ ERP รายเดือน
- 🎫 **Generate missing tokens** — สร้าง token 6 หลักสำหรับโครงการที่ยังไม่มี
- 🛠️ **Repair budget** — สแกน/แก้ข้อมูลงบที่ corrupt (จาก bug เก่าที่บวกซ้ำ)
- 🧹 **Cleanup parent projects** — ลบโครงการแม่ (รหัส ERP ลงท้าย `0000`)
- 📦 **Backup** — export JSON ทั้ง DB

---

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| Framework | **Next.js 14** (App Router, Server + Client Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | **Supabase** (PostgreSQL + RLS) |
| Auth (leader) | Token-based (6-digit code → `project_tokens`) |
| Map | Leaflet + OpenStreetMap |
| Excel Parse | `xlsx` (SheetJS) |
| Deployment | Vercel |

---

## 🗄 Database Schema

12 ตารางหลัก — ดูรายละเอียดที่ [`supabase/schema.sql`](./supabase/schema.sql)

```
projects           ← โครงการย่อย (งบ, ผู้รับผิดชอบ, ERP code)
  ├ activities            ← กิจกรรมใต้โครงการ
  │   └ activity_reports  ← รายงานผลกิจกรรม (หน.ส่ง)
  │       ├ kpi_contributions   ← ตอบ KPI
  │       ├ participants        ← ผู้เข้าร่วม
  │       ├ kpi_evidence        ← หลักฐาน KPI
  │       └ reward_log          ← RPF coin ที่ได้
  ├ kpi_targets           ← ตัวชี้วัดคาดหวัง
  ├ project_tokens        ← Token หน.โครงการ → reward_balance
  ├ budget_transactions   ← ธุรกรรมงบ (sync จาก Excel)
  └ notifications         ← แจ้งเตือน
```

**Budget model** (3 แหล่งข้อมูล):
- `budget_total` = งบจัดสรร
- `budget_used` = ยอดเบิกจาก **ERP** (sync จาก Excel — source of truth)
- `budget_reported` = `SUM(activity_reports.budget_spent)` — ยอด หน.รายงาน
- `budget_advance` = `max(0, reported − used)` — ยอดที่ หน.ออกเงินเองก่อน
- `budget_remaining` = `total − max(used, reported)`

---

## 🚀 Quick Start (local dev)

```bash
# 1. Clone + install
git clone https://github.com/worrajak/trpbrmutl.git
cd trpbrmutl
npm install

# 2. Config
cp .env.local.example .env.local
# แก้ NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. (ครั้งแรกเท่านั้น) Apply schema
#    Supabase Dashboard → SQL Editor → วางเนื้อ supabase/schema.sql → Run

# 4. Seed
node supabase/seed-data.js     # projects + activities + kpis
node supabase/seed-tokens.js   # tokens

# 5. Run
npm run dev
# เปิด http://localhost:3000
```

ตั้งระบบใหม่ตั้งแต่ 0? → **[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)**

---

## 📁 Project Structure

```
RPF-Researcher-Profile/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # หน้าภาพรวม
│   │   ├── projects/                 # โครงการย่อย + รายละเอียด
│   │   ├── indicators/               # ตัวชี้วัด KPI
│   │   ├── map/                      # แผนที่ Leaflet
│   │   ├── sdgs/                     # หน้า SDGs
│   │   ├── staff/                    # บุคลากร
│   │   ├── admin/                    # Admin panel (tools)
│   │   └── api/
│   │       ├── supabase/             # CRUD endpoints (projects, reports, tokens, sync-excel, ...)
│   │       ├── admin/                # Admin tools (repair-budget, seed-activities, auth)
│   │       ├── public/               # Public aggregates (SDGs)
│   │       ├── backup/               # JSON dump
│   │       └── projects/             # Google Sheets fallback
│   ├── components/
│   │   ├── ReportForm.tsx            # ฟอร์มส่งรายงาน (modal)
│   │   ├── BudgetReconciliation.tsx  # แสดงงบ 3 แหล่ง
│   │   ├── SCurveChart.tsx           # กราฟ S-Curve
│   │   └── ProjectMap.tsx            # แผนที่
│   └── lib/
│       ├── supabase.ts               # Supabase client
│       ├── supabase-data.ts          # Query helpers
│       ├── sheets.ts                 # Google Sheets parser
│       ├── types.ts                  # TypeScript interfaces
│       └── reward-engine.ts          # คำนวณ RPF coin
├── supabase/
│   ├── schema.sql                    # ✨ Unified schema (ใช้ตอน setup)
│   ├── cleanup-duplicate-erp.sql     # Utility SQL
│   ├── seed-data.js                  # Seed projects/activities/KPIs
│   ├── seed-tokens.js                # Seed tokens
│   └── old-migrations/               # Legacy (01/02/03 — รวมไปอยู่ใน schema.sql แล้ว)
├── docs/
│   ├── USER_MANUAL.md
│   ├── ADMIN_MANUAL.md
│   ├── DEPLOYMENT.md
│   └── HANDOFF.md
├── data/                             # markdown cross-check (staff, researchers, sites, projects)
└── INSTRUCTION.md                    # รายละเอียดเชิงลึก
```

---

## 🧭 Data Sources

| แหล่ง | รายละเอียด |
|---|---|
| **Excel งบประมาณ ERP** | ไฟล์รายเดือน `9_X_2569_งบประมาณกลุ่มแผนงาน...xlsx` → sync ผ่าน `/admin` |
| **ง.8/ง.9 project form** | รายละเอียดกิจกรรม + ตัวชี้วัดต่อโครงการ (กรอกครั้งแรกผ่าน parse-ngor9) |
| **Google Sheets** | แผนการดำเนินงาน (fallback — revalidate 5 นาที) |
| **trpb.rmutl.ac.th** | ข้อมูลบุคลากร ประวัติองค์กร |

---

## 🛡 License

Internal use — มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา (RMUTL)

---

## 🙏 Credits

พัฒนาโดย **กลุ่มแผนงานใต้ร่มพระบารมี RMUTL** ร่วมกับ Claude (Anthropic) สำหรับโครงการ
_"ขับเคลื่อนกลไกการพัฒนาองค์ความรู้เพื่อยกระดับคุณภาพชีวิต · ผลักดันเทคโนโลยี นวัตกรรมสู่ชุมชน · พัฒนากำลังคน สร้างอาชีพ ลดความเหลื่อมล้ำ บนพื้นที่สูง"_
