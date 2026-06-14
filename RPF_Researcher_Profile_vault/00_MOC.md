---
title: RPF Researcher Profile — Map of Content
type: moc
created: 2026-06-09
maintained_by: Worrajak
---

# 🗺️ Map of Content — RPF Researcher Profile

> ระบบติดตามโครงการกลุ่มแผนงานใต้ร่มพระบารมี · มทร.ล้านนา
> Stack: Next.js 14 · Supabase · OpenRouter (BYOK)

> **vault หลัก** ใช้ดูเอกสาร / ความรู้ของโปรเจกต์
> โค้ดอยู่ที่ `../src/`, `../supabase/` ไม่อยู่ในนี้

---

## 🔥 Quick Access

- เริ่มงานใหม่ → ดู [[_project-brief|brief ของ project active]]
- เปิดเอกสารตรวจรับ → [[1_Projects/acceptance-2569/_project-brief|Acceptance 2569]]
- ต้อง deploy → [[DEPLOYMENT]] · [[HANDOFF]]
- แก้ปัญหา user → [[USER_MANUAL]] · [[ADMIN_MANUAL]]
- ดูข้อมูลโปรเจกต์ → [[projects-summary]] · [[researchers]] · [[sites]] · [[staff]]

---

## 1️⃣ Projects (active · มี deadline)

| Project | สถานะ | brief |
|---------|------|-------|
| Acceptance 2569 | 🟢 active | [[1_Projects/acceptance-2569/_project-brief\|brief]] |
| Dashboard TOR 2569 | 🟢 active | [[1_Projects/dashboard-tor-2569/_project-brief\|brief]] |

---

## 2️⃣ Areas (responsibility ต่อเนื่อง)

| Area | scope | key notes |
|------|-------|-----------|
| Deployment Ops | deploy · handoff · ops | [[DEPLOYMENT]] · [[HANDOFF]] |
| User Support | user/admin manuals | [[USER_MANUAL]] · [[ADMIN_MANUAL]] |
| Budget 2569 | งบประมาณ + แผนงาน 1-3 | 4 PDFs + 1 xlsx ใน folder |

---

## 3️⃣ Resources

### Literature (สรุปจาก data/*.md)
- [[projects-summary]] — สรุปโครงการทั้งหมด
- [[researchers]] — รายชื่อนักวิจัย
- [[seed-data]] — ข้อมูล seed สำหรับ initial setup
- [[sites]] — พื้นที่ดำเนินงาน
- [[staff]] — รายชื่อ staff

### Refs (raw files)
- [[3_Resources/Refs/screenshots|screenshots/]] — 17 ภาพหน้า UI สำหรับเอกสารตรวจรับ

### Zettel (permanent atomic notes)
- _(ว่าง — รอ atomic ideas)_

---

## 4️⃣ Archives
- _(ว่าง)_

---

## 📌 Hard Rules (จาก `../CLAUDE.md`)

1. ห้ามใช้คำอาหรับ / คำทางศาสนา — ใช้คำกลาง
2. ห้ามใช้คำ "ใต้ร่มพระบารมี" ใน table/column — ใช้ prefix `rpf_`
3. ห้าม commit Dropbox conflict files (`*(LenovoX1's conflicted copy *)`)
4. ห้ามแก้ schema โดยไม่สร้าง migration file
5. AI brief gen ต้อง **sequential** เท่านั้น

---

## 🔗 External
- Project root: `../` (Next.js code)
- CLAUDE.md (working notes): `../CLAUDE.md`
- README: `../README.md`

*Last updated: 2026-06-09*
