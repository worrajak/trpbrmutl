# คู่มือ Admin

> **ใครใช้?** ผู้ดูแลระบบ · ผู้ประสานงานกลุ่มแผนงาน
> **เข้าถึงได้ที่:** `/admin` (มี PIN/password ตาม config)

สารบัญ:
1. [เข้าสู่ Admin Panel](#1-เข้าสู่-admin-panel)
2. [Sync Excel งบประมาณ ERP](#2-sync-excel-งบประมาณ-erp)
3. [Generate Tokens ที่ขาด](#3-generate-tokens-ที่ขาด)
4. [Repair Budget](#4-repair-budget--ซ่อมข้อมูลงบที่-corrupt)
5. [Cleanup Parent Projects](#5-cleanup-parent-projects)
6. [Backup JSON](#6-backup-json-ทั้ง-db)
7. [การจัดการ Supabase โดยตรง (SQL Editor)](#7-การจัดการ-supabase-โดยตรง-sql-editor)
8. [Troubleshooting ที่พบบ่อย](#8-troubleshooting-ที่พบบ่อย)

---

## 1. เข้าสู่ Admin Panel

1. ไปที่ `/admin`
2. ใส่ PIN/password ตามที่ตั้งไว้ใน `.env.local` → `ADMIN_PASSWORD`
3. จะเห็นเมนูการ์ด (expand/collapse ได้):
   - 🔄 Sync Excel
   - 🎫 Tokens
   - 🛠️ Repair Budget
   - 🧹 Cleanup Parents
   - 📦 Backup
   - 🎁 Rewards
   - (อื่น ๆ)

---

## 2. Sync Excel งบประมาณ ERP

### เมื่อไหร่ต้องทำ?
- **ต้นเดือน** — ERP สรุปงบประมาณใหม่ → ไฟล์ Excel รายเดือน (ตัวอย่าง: `9_4_2569_งบประมาณ...xlsx`)
- เมื่อมีโครงการใหม่เข้ามา
- เมื่อพบข้อมูลงบไม่ตรงกับใน ERP

### ขั้นตอน

1. `/admin → Sync Excel` → เปิดการ์ด
2. **Upload Excel** (`.xlsx`) — ลากวางหรือกดเลือกไฟล์
3. ระบบจะ:
   - อ่านคอลัมน์ (col 4 = total, col 9 = disbursed, col 10 = combined, col 12 = remaining)
   - ข้ามแถว ERP code ที่ลงท้าย `0000` (= summary row)
   - Match โครงการด้วย `erp_code` → อัปเดต `budget_total` + `budget_used`
   - แสดงสรุป (ทั้งหมดกี่โครงการ, อัปเดตกี่, skip กี่)

### โครงสร้าง Excel ที่คาด
```
col 4  | budget_total  | งบที่ได้รับ
col 9  | disbursed     | ยอดเบิกจริง
col 10 | combined_order_disbursed | ยอดรวม PO + เบิก (ใช้เมื่อ col 9 ว่าง)
col 12 | remaining     | คงเหลือ
```

### ⚠️ ข้อควรระวัง
- **อย่า sync Excel แบบ manual ไปแก้ `budget_used` ใน SQL ตรง ๆ** — ทำให้ข้อมูลเพี้ยน
- ERP คือ source of truth สำหรับ `budget_used`
- ห้าม `budget_used += X` ในโค้ด — ต้อง assign ตรง ๆ (bug เดิมเคยบวกซ้ำ)

---

## 3. Generate Tokens ที่ขาด

### เมื่อไหร่ต้องทำ?
- หลัง sync Excel มีโครงการใหม่ → ยังไม่มี Token
- หัวหน้าโครงการทำ Token หาย → Admin generate ใหม่

### ขั้นตอน

1. `/admin → Tokens` → การ์ด **Generate missing tokens**
2. กด **สร้าง Token ที่หายไป**
3. ระบบจะ:
   - Scan `projects` vs `project_tokens`
   - สำหรับโครงการที่ยังไม่มี → สร้าง token 6 หลักแบบสุ่ม
   - ดึงชื่อ `responsible_name` — ถ้าชื่อมี `()` → แยกชื่อในวงเล็บออก
   - Insert `project_tokens` + init `reward_balance`
4. แสดงรายการ token ที่สร้าง (copy เก็บไว้แจก หน.โครงการ)

### Manual — สร้าง/revoke Token ทีละอัน
ใน Supabase Dashboard → `project_tokens` → แก้ `is_active = false` เพื่อ revoke

---

## 4. Repair Budget — ซ่อมข้อมูลงบที่ corrupt

### อาการของ budget ที่ corrupt
- `budget_used` > `budget_total` (ERP ไม่น่าเกินงบรวม)
- BudgetReconciliation แสดง `remaining = 0` ทั้งที่ยังไม่ได้ใช้หมด
- ยอด `budget_used` ดูเป็น ERP + reported บวกกัน (bug เก่า)

### ขั้นตอน

1. `/admin → Repair Budget`
2. ใส่ `id` (slug) หรือ `erp_code` ในช่อง (เว้นว่าง = สแกนทุกโครงการ)
3. กด **สแกน (Dry-run)** → ดูรายการที่ต้องแก้
4. ตรวจความถูกต้อง — `before` vs `after` ของแต่ละโครงการ
5. กด **แก้จริง** → บันทึกลง DB

### Logic การซ่อม

```
erpStored       = budget_used (ใน DB ตอนนี้)
actualReported  = SUM(activity_reports.budget_spent) ของโครงการนี้
suspectedErp    = max(0, erpStored − actualReported)

เงื่อนไข corrupt:
  A) erpStored > budget_total                           → over budget
  B) |erpStored − (suspectedErp + actualReported)| < 1  → bug บวกซ้ำ

ถ้า corrupt:
  - ถ้ามี reports   → proposedUsed = suspectedErp  (ถอยกลับก่อนบวก)
  - ถ้าไม่มี reports → proposedUsed = budget_total  (clamp)
```

Output: `budget_used`, `budget_reported`, `budget_advance`, `budget_remaining` ที่ถูกต้อง

---

## 5. Cleanup Parent Projects

### คืออะไร?
Excel ERP มีแถว "โครงการแม่" รวมยอด (erp_code ลงท้าย `0000`) — ไม่ใช่โครงการจริง
ถ้า seed เก่าเคย insert แถวนี้เข้ามา → ต้องลบออก

### ขั้นตอน
`/admin → Cleanup parents` → ระบบจะ list โครงการที่ `erp_code LIKE '%0000'` → ยืนยันลบ

---

## 6. Backup JSON ทั้ง DB

`/admin → Backup` → กด **Download JSON**
ระบบจะดึงทุกตาราง → สร้างไฟล์ `backup-YYYY-MM-DD.json`

> แนะนำ backup ก่อนทุกครั้งที่จะ:
> - Sync Excel
> - Run `cleanup-duplicate-erp.sql`
> - Repair budget

---

## 7. การจัดการ Supabase โดยตรง (SQL Editor)

### การลบข้อมูล (DELETE)
⚠️ **RLS policies ไม่อนุญาต DELETE ผ่าน anon key** — ต้องใช้ SQL Editor ใน Supabase Dashboard

ตัวอย่าง:
```sql
-- ลบโครงการ seed ซ้ำ (CASCADE จะลบ activities/tokens/reports ตาม)
DELETE FROM projects WHERE id IN ('nan-68-274', 'chiangrai-68-273');

-- ลบรายงานซ้ำ
DELETE FROM activity_reports WHERE id = 'xxx-xxx-xxx';
```

มี SQL สำเร็จรูปใน `supabase/cleanup-duplicate-erp.sql`

### ตรวจ ERP duplicate
```sql
SELECT erp_code, COUNT(*) AS n, array_agg(id) AS project_ids
FROM projects
WHERE erp_code IS NOT NULL
GROUP BY erp_code HAVING COUNT(*) > 1;
```

### Recompute `budget_reported` ทั้งระบบ
```sql
UPDATE projects p
SET budget_reported = COALESCE(s.sum, 0)
FROM (
  SELECT project_id, SUM(budget_spent) AS sum
  FROM activity_reports
  GROUP BY project_id
) s
WHERE p.id = s.project_id;
```

---

## 8. Troubleshooting ที่พบบ่อย

### "Sync Excel บอกว่า 0 updated"
- ตรวจ `erp_code` ใน Excel ตรงกับใน DB หรือเปล่า
- ถ้า erp_code ใน DB เก็บเป็น string → ห้ามมีเว้นวรรค/0 นำหน้าหายไป

### "Repair Budget สแกนแล้ว 0 โครงการ"
- ถ้ากรอก `project_id` เฉพาะ → ลองใช้ `erp_code` แทน (API รองรับทั้งคู่)
- เว้นว่าง = สแกนทุกโครงการ

### "หน.รายงานแล้วแต่ `budget_reported` ไม่เพิ่ม"
1. ตรวจ `activity_reports.budget_spent` > 0 จริงไหม
2. ถ้าใช่ → รัน Repair Budget เพื่อ recompute
3. ถ้า bug → ดู `/api/supabase/report/route.ts` ว่าใช้ SUM หรือ `+=` (ต้องเป็น assign ตรง)

### "RLS error — permission denied for table"
- แค่ anon key ทำ SELECT/INSERT/UPDATE ได้
- DELETE ต้องใช้ service_role หรือ SQL Editor
- ถ้าอยากแก้ policy → `supabase/schema.sql` (section RLS)

### "Token ล็อกอินไม่ผ่าน"
- ตรวจ `project_tokens.is_active = true`
- ตรวจ `project_tokens.project_id` ตรงกับโครงการ
- ถ้า token code มี whitespace → trim ใน DB

---

## 🆘 เมื่อข้อมูลพัง

ลำดับการกู้คืน:
1. **หยุดทุก sync/update ทันที**
2. Download backup ล่าสุด (`/admin → Backup`)
3. ใน Supabase Dashboard → SQL Editor ดู `backup` ที่ auto-snapshot (Supabase keep PITR 7 วัน สำหรับ paid plans)
4. Restore จากไฟล์ JSON + `node supabase/run-migration.js` (ถ้าเขียนสคริปต์ restore)
5. หรือ Reset: รัน `supabase/schema.sql` → seed ใหม่ → sync Excel → generate tokens

---

**ข้อมูลติดต่อ developer:** ดูใน `docs/HANDOFF.md`
