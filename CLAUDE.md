# RPF-Researcher-Profile · Claude Working Notes

ระบบติดตามโครงการกลุ่มแผนงานใต้ร่มพระบารมี — มทร.ล้านนา
Stack: Next.js 14 App Router · Supabase (Postgres + RLS) · Tailwind · OpenRouter (BYOK)

---

## 🎯 Working Habit (อ่านทุก session)

### ใช้ `/clarify` ก่อนงาน non-trivial เป็น default
**Trigger:**
- ฟีเจอร์ใหม่ · UI redesign · refactor > 50 บรรทัด · cross-file
- คำขอ scope กว้าง: "ทั้งหมด" / "เต็มรูปแบบ" / "ทั้งคู่"
- คำขอกำกวม / ไม่มี mockup

**Skip:**
- typo · padding · color · cursor
- "เปลี่ยน X เป็น Y" < 10 บรรทัด
- bug fix ชัดเจน
- user บอก "เริ่มเลย" / "ทำเลย" / "ปรับแก้เลย"

---

## 🚫 Hard Rules (ห้ามฝ่าฝืน)

1. **ห้ามใช้คำอาหรับ / คำทางศาสนา** — แม้แนวคิดจะมาจาก Hadith Isnad ก็ตาม
   ใช้คำกลาง: "สายของแหล่งข้อมูล" · "เครดิตผู้รายงาน" · "ความน่าเชื่อ"

2. **ห้ามใช้คำว่า "ใต้ร่มพระบารมี" ในชื่อ table/column** — ใช้ prefix `rpf_` แทน
   เช่น `rpf_researchers`, `rpf_research_areas`

3. **ห้าม commit Dropbox conflict files** — ตรวจ `git status` ก่อน `git add -A`
   ไฟล์ pattern: `*(LenovoX1's conflicted copy *)*` · `*(DESKTOP-*'s conflicted copy *)*`
   ถ้าเห็น → ใช้ `git rm` หรือ `git add` เฉพาะไฟล์ที่ต้องการ

4. **ห้ามแก้ schema โดยไม่สร้าง migration file**
   - แก้ `supabase/schema.sql` (canonical)
   - สร้าง `supabase/YYYY-MM-DD-feature-name.sql` (incremental)
   - แจ้ง user ให้รันใน Supabase SQL Editor

5. **AI brief gen ต้อง sequential เท่านั้น** — ห้าม parallel ในรอบเดียว
   เพราะจะได้ชื่อโครงการซ้ำ (ปัญหาเก่า)

---

## 📐 Conventions

### Database
- Tables: `snake_case` · prefix `rpf_` ถ้าเสี่ยง conflict กับระบบอื่น (เช่น CESru)
- RLS เปิดทุกตาราง · policy `anon` ทำได้ทุก op (admin gate ที่ API route)
- Migrations: ตั้งชื่อ `YYYY-MM-DD-short-feature.sql`
- JSON columns ใช้ `JSONB DEFAULT '[]'::jsonb` หรือ `'{}'::jsonb`

### TypeScript
- API routes: `export const dynamic = "force-dynamic"` ถ้าใช้ Supabase
- Validation: เขียน `validate*()` function · return `{ valid, errors, data? }`
- Type imports: `import type { ... }` แยกจาก runtime imports

### UI / Tailwind
- ❌ **ห้าม** `text-[10px]` / `text-[11px]` (pixel ตายตัว ไม่ scale)
- ✅ **ใช้** `text-[0.65rem]` / `text-[0.72rem]` แทน
- Mobile-first: stack vertical บน `< sm` ถ้าเสี่ยง overflow
- Base font: 17.5px desktop · 19px mobile (ใหญ่กว่าเพื่ออ่านง่าย)
- Sarabun font ผ่าน `next/font/google` ใน layout
- Dynamic class names ต้องอยู่ใน `tailwind.config.ts` safelist

### AI Workflow (OpenRouter BYOK)
- API key เก็บที่ `app_settings` (server) + localStorage (client cache)
- Model default: `anthropic/claude-sonnet-4.5` (override ได้ใน UI)
- Sequential gen เท่านั้น · ส่ง `avoid_titles` ไป context ทุก iteration
- Brief AI: ป้อน catalog skills ปัจจุบันให้ AI ใช้ซ้ำ (ลดชื่อซ้ำ)

---

## 🔄 Recurring Patterns

### Source Attribution Chain (ทุก claim)
ทุกข้อความต้องตอบ 3 คำถาม:
1. ใครเป็นคนรายงาน? (`reporter`)
2. ผ่านใครมา? (`via[]`)
3. ต้นทางคือใคร? น่าเชื่อแค่ไหน? (`origin` + `credibility 1-5`)

ใช้กับ: brief problem_statement → ขยายไป activity reports + KPI evidence ในอนาคต

### Auto-sync to Catalog
เมื่อสร้าง/แก้/ลบ brief → sync `required_skills` ไป `rpf_research_areas`:
- ใหม่ → insert (auto_imported=true)
- มีอยู่ → bump usage_count + recompute demand_level
- ลบ + count=0 + auto_imported → ลบ catalog entry

### Trust Computation
- credibility ≤ 2 OR `needs_verification=true` → `verification_status=flagged`
- credibility 3-4 → `pending`
- admin verify manually → `verified`

---

## 🧪 Common Gotchas

1. **Tailwind class purge**: dynamic class names (เช่น `bg-${color}-500`) ต้องอยู่ในไฟล์ + safelist
2. **Supabase types**: ใช้ `SupabaseClient` (no generic) · `SupabaseClient<unknown, "public", unknown>` พัง
3. **RLS silent block**: insert/update return success แต่ data ไม่เปลี่ยน → ตรวจ policy
4. **Server vs Client component**: API routes + middleware = server only · ห้าม `"use client"` ผสม
5. **Brief status default**: `status='draft'` จะไม่แสดงใน `/briefs` public — ใช้ `'open'` ถ้าต้องการเผยแพร่ทันที
6. **localStorage cache stale**: AiSettingsBar reload จาก server เมื่อเปิด modal · ไม่งั้น user เห็นค่าเก่า
7. **Thai text overflow**: ห้ามใช้ `truncate` ใน flex row บน mobile · ให้ stack vertical
8. **Brief AI duplicates**: ถ้าไม่ส่ง `avoid_titles` → ได้ชื่อซ้ำ 5/5

---

## 📁 Key Paths

```
src/lib/
  ├── ai-brief-generator-prompts.ts  # AI prompt + types + summarizeSourceChain()
  ├── sync-brief-skills.ts            # auto-sync catalog
  ├── brief-matching.ts                # researcher ↔ brief matching
  ├── researcher-tags.ts               # 20 preset skill slugs
  ├── excellence-kpi.ts                # มทร. KPI catalog
  ├── foundation.ts                    # 4 plans + KPIs
  └── supabase.ts                      # client factory

src/app/api/admin/briefs/
  ├── route.ts                         # POST = create + sync skills
  ├── [id]/route.ts                    # PATCH/DELETE + decrement skills
  └── ai-generate/route.ts             # AI gen + feed catalog

supabase/
  ├── schema.sql                       # canonical full schema
  └── YYYY-MM-DD-*.sql                 # incremental migrations
```

---

## 🗺 Roadmap (สิ่งที่อยู่ใน backlog)

- [ ] Reporter trust workflow (table มีแล้ว · ยังไม่ wire)
- [ ] Activity report source chain (เหมือน brief)
- [ ] KPI evidence chain
- [ ] AI verification helper (bot ตรวจ reporter exists)
- [ ] Admin UI สำหรับ verify source_chain ทีละ claim
- [ ] Researcher-side: see "this claim is verified by X"

---

*Last updated: 2026-05-14 · maintained by Claude per session*
