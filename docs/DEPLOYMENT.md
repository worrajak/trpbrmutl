# คู่มือการทำซ้ำ / Deployment

> **ใช้เมื่อไหร่?**
> - ปีงบประมาณใหม่ ต้องตั้งระบบใหม่อีกรอบ
> - ย้าย server / clone ระบบไปใช้ที่อื่น
> - สร้าง dev environment
>
> **เวลาที่ใช้:** ~30-60 นาที (ครั้งแรก)

---

## สารบัญ

1. [Prerequisite](#1-prerequisite)
2. [ตั้ง Supabase Project](#2-ตั้ง-supabase-project)
3. [Apply Schema](#3-apply-schema-ลง-supabase)
4. [ตั้ง Local Development](#4-ตั้ง-local-development)
5. [Seed ข้อมูลเริ่มต้น](#5-seed-ข้อมูลเริ่มต้น)
6. [Deploy ขึ้น Vercel](#6-deploy-ขึ้น-vercel)
7. [Post-deploy Checklist](#7-post-deploy-checklist)
8. [Backup & Restore](#8-backup--restore)

---

## 1. Prerequisite

### บัญชี/เครื่องมือที่ต้องมี

| สิ่งที่ต้องมี | ใช้เพื่อ | ค่าใช้จ่าย |
|---|---|---|
| **GitHub account** | เก็บ source code | ฟรี |
| **Supabase account** | Database (PostgreSQL + RLS) | ฟรี (Free tier พอ) |
| **Vercel account** | Deploy Next.js | ฟรี (Hobby tier พอ) |
| **Node.js 18+** | Local dev | ฟรี |
| **Excel ง9/งบประมาณ ERP** | ข้อมูลเริ่มต้น | — |

### Clone repo

```bash
git clone https://github.com/worrajak/trpbrmutl.git
cd trpbrmutl
npm install
```

---

## 2. ตั้ง Supabase Project

1. ไปที่ [supabase.com](https://supabase.com) → **New Project**
2. ตั้งชื่อ (เช่น `rpf-researcher-2570`) + ภูมิภาค **Southeast Asia (Singapore)**
3. รอ Supabase provision (~1-2 นาที)
4. เก็บ credentials:
   - **Settings → API**
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key (เก็บลับ — ใช้สำหรับ delete ผ่าน script)

---

## 3. Apply Schema ลง Supabase

1. เข้า **Supabase Dashboard → SQL Editor**
2. เปิดไฟล์ [`supabase/schema.sql`](../supabase/schema.sql)
3. Copy ทั้งไฟล์ (~300 บรรทัด) → วางใน SQL Editor → กด **Run**
4. ตรวจ **Table Editor** — ต้องเห็น 12 ตาราง:
   ```
   projects · activities · kpi_targets · activity_reports
   kpi_contributions · notifications · budget_transactions
   project_tokens · reward_log · reward_balance
   participants · kpi_evidence
   ```

> 💡 `schema.sql` ใช้ `IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS` → **รันซ้ำได้** แบบไม่เสียหาย

---

## 4. ตั้ง Local Development

### 4.1 สร้าง `.env.local`

```bash
cp .env.local.example .env.local
```

แก้:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ADMIN_PASSWORD=<ตั้ง password ของตัวเอง>
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX     # (optional - Google Analytics)
```

### 4.2 Run dev server

```bash
npm run dev
```

เปิด `http://localhost:3000` → ต้องเห็นหน้าภาพรวม (แต่ยังว่าง ๆ เพราะยังไม่ seed)

---

## 5. Seed ข้อมูลเริ่มต้น

### 5.1 Seed projects + activities + KPIs

**วิธีที่ 1: ใช้ไฟล์ Excel ผ่าน Admin UI (แนะนำ)**
1. ไปที่ `/admin → Sync Excel`
2. Upload ไฟล์ Excel รายเดือน (เช่น `9_4_2569_งบประมาณ...xlsx`)
3. ระบบ upsert projects + budget_total + budget_used

**วิธีที่ 2: ใช้ seed script**
```bash
node supabase/seed-data.js
```
(อ่านจาก `data/*.md` — projects-summary, researchers, sites, staff)

**วิธีที่ 3: Parse ง.9 per project**
สำหรับแต่ละโครงการที่มีไฟล์ ง.9 (PDF/Excel):
- `/admin → Parse ง.9` → upload → extract activities + KPIs อัตโนมัติ (มี AI-assisted path)

### 5.2 Seed tokens

```bash
node supabase/seed-tokens.js
```
หรือผ่าน UI: `/admin → Tokens → สร้าง token ที่หายไป`

> จะ generate 6-digit random code สำหรับแต่ละโครงการที่ยังไม่มี token
> **เก็บผลลัพธ์ไว้แจก หน.โครงการ**

### 5.3 Cleanup (ถ้ามี duplicate)

```sql
-- Supabase Dashboard → SQL Editor
-- รัน supabase/cleanup-duplicate-erp.sql
```

---

## 6. Deploy ขึ้น Vercel

### 6.1 Push ไป GitHub
```bash
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

### 6.2 Import ใน Vercel
1. [vercel.com/new](https://vercel.com/new) → Import Project → เลือก repo
2. **Framework Preset:** Next.js (auto-detect)
3. **Environment Variables:** — คัดลอกจาก `.env.local` (ไม่ต้องใส่ NEXT_PUBLIC_GA_ID ถ้าไม่ใช้)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD`
4. กด **Deploy** — รอ 2-3 นาที

### 6.3 ตั้ง custom domain (optional)
- Vercel → Project → Settings → Domains → Add
- ตัวอย่าง: `rpf.trpb.rmutl.ac.th`

---

## 7. Post-deploy Checklist

ตรวจก่อนส่งให้ end user:

- [ ] หน้าภาพรวม (`/`) แสดงจำนวนโครงการถูกต้อง
- [ ] `/projects` แสดงรายการ 53 โครงการ (หรือจำนวนที่ seed มา)
- [ ] คลิกเข้าหน้าโครงการ — S-Curve + BudgetReconciliation แสดง
- [ ] `/map` แสดง leaflet ได้ (ไม่มี error hydration)
- [ ] `/admin` — ใส่ password ถูก → เข้าได้
- [ ] ทดลอง sync Excel บนโครงการ 1 ตัว → ยอดถูก
- [ ] ทดลองสร้าง token → หน.โครงการใช้ token → ส่งรายงาน → `budget_reported` เพิ่ม
- [ ] `/sdgs` แสดง 17 goals ถูก
- [ ] RLS ทำงาน — ลอง DELETE ผ่าน anon key → ต้องได้ error (= ปลอดภัย)

---

## 8. Backup & Restore

### Backup (แนะนำทำรายเดือน)

**วิธี A: Admin UI**
- `/admin → Backup → Download JSON`

**วิธี B: Supabase PITR (paid plan)**
- Dashboard → Database → Backups → On-demand snapshot

**วิธี C: pg_dump**
```bash
pg_dump "$SUPABASE_DB_URL" > backup-YYYY-MM-DD.sql
```

### Restore

จาก JSON → ต้องเขียน script restore (ไม่มีใน repo ปัจจุบัน — TODO)
จาก `.sql` dump → Supabase SQL Editor → paste → Run

---

## 🔁 ตั้งปีงบประมาณใหม่ (ปีถัดไป)

แนะนำแยก **Supabase project** ต่อปี (ไม่ปนข้อมูล):

1. สร้าง Supabase project ใหม่ → `rpf-researcher-2570`
2. รัน `supabase/schema.sql`
3. `fiscal_year` ใน `.env.local` ของ repo ใหม่ → 2570
4. Clone repo → branch `fiscal-2570` → ตั้ง Vercel แยก domain
5. Import ข้อมูลจาก Excel งบประมาณปีใหม่
6. สร้าง token ใหม่สำหรับ หน.โครงการปีใหม่

**หรือ** ใช้ DB เดียว แต่ filter ด้วย `fiscal_year` (ซับซ้อนกว่า — ต้องแก้ทุก query)

---

## ⚡ Quick-setup Script (Copy-paste)

```bash
# Clone + config
git clone https://github.com/worrajak/trpbrmutl.git rpf && cd rpf
npm install
cp .env.local.example .env.local
# (แก้ .env.local ด้วย editor)

# Supabase schema
# → Dashboard → SQL Editor → paste supabase/schema.sql → Run

# Seed
node supabase/seed-data.js
node supabase/seed-tokens.js

# Run
npm run dev
# → http://localhost:3000
```

---

**ถัดไป:** อ่าน [`USER_MANUAL.md`](./USER_MANUAL.md) · [`ADMIN_MANUAL.md`](./ADMIN_MANUAL.md)
