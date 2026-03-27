# TRPB RMUTL - ระบบติดตามโครงการใต้ร่มพระบารมี

ระบบติดตามโครงการย่อยและรายงานผลตัวชี้วัด ปีงบประมาณ 2569
กลุ่มแผนงานใต้ร่มพระบารมี มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา

## Overview

ระบบแสดงข้อมูลโครงการย่อย งบประมาณ ผู้รับผิดชอบ พื้นที่ดำเนินงาน และสถานะการดำเนินงาน
พร้อมรายงานผลตอบตัวชี้วัดของมหาวิทยาลัย ภายใต้ 3 โครงการหลัก:

| โครงการหลัก | งบประมาณ |
|---|---|
| ขับเคลื่อนกลไกการพัฒนาองค์ความรู้เพื่อยกระดับคุณภาพชีวิต | 2,000,000 บาท |
| ผลักดันเทคโนโลยี นวัตกรรมสู่ชุมชน | 2,000,000 บาท |
| พัฒนากำลังคน สร้างอาชีพ ลดความเหลื่อมล้ำ บนพื้นที่สูง | 4,000,000 บาท |

## Pages

| หน้า | เส้นทาง | รายละเอียด |
|---|---|---|
| ภาพรวม | `/` | สรุปโครงการ งบประมาณ สถานะ ตัวชี้วัด |
| โครงการย่อย | `/projects` | รายการโครงการย่อย กรอง/ค้นหา |
| รายละเอียดโครงการ | `/projects/[id]` | งบประมาณ ผู้รับผิดชอบ ผลตอบตัวชี้วัด |
| ตัวชี้วัด | `/indicators` | รายงานผล 5 ตัวชี้วัด (KPI 10, 35, 36, 39, 40) |
| บุคลากร | `/staff` | บุคลากรกลุ่มแผนงานใต้ร่มพระบารมี |

## Tech Stack

| Component | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) — planned |
| Deployment | Vercel |

## Data Sources

| แหล่งข้อมูล | รายละเอียด |
|---|---|
| Google Sheets | แผนการดำเนินงานโครงการย่อย 3 แผนงาน |
| Excel ง.8 | รายละเอียดการจัดทำโครงการ ง.8 2569 |
| Excel ตัวชี้วัด สวพส. | ผลการดำเนินงาน 19 โครงการ 14 พื้นที่ |
| trpb.rmutl.ac.th | ข้อมูลบุคลากร ประวัติองค์กร |

## Data Files (ร่าง)

ข้อมูลร่างอยู่ใน `data/`:

| ไฟล์ | เนื้อหา |
|---|---|
| `staff.md` | บุคลากร 13 คน จาก trpb.rmutl.ac.th |
| `researchers.md` | อาจารย์/นักวิจัย ~33 คน จัดกลุ่มตาม 3 แผนงาน |
| `projects-summary.md` | สรุปโครงการย่อยทั้งหมด พร้อมงบประมาณและสถานะ |
| `sites.md` | พื้นที่โครงการหลวง 14 แห่ง |

## Project Structure

```
trpbrmutl/
├── src/
│   ├── app/
│   │   ├── page.tsx              # ภาพรวม
│   │   ├── layout.tsx            # Layout + Navbar
│   │   ├── globals.css
│   │   ├── projects/
│   │   │   ├── page.tsx          # รายการโครงการย่อย
│   │   │   └── [id]/page.tsx     # รายละเอียดโครงการ
│   │   ├── indicators/
│   │   │   └── page.tsx          # รายงานตัวชี้วัด
│   │   └── staff/
│   │       └── page.tsx          # บุคลากร
│   └── lib/
│       ├── types.ts              # TypeScript interfaces
│       └── data.ts               # ข้อมูล (จะย้ายไป Supabase)
├── data/                         # ข้อมูลร่าง (markdown)
│   ├── staff.md
│   ├── researchers.md
│   ├── projects-summary.md
│   └── sites.md
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── .env.local.example
├── .gitignore
└── README.md
```

## Roadmap

- [x] สร้างหน้าภาพรวม โครงการย่อย ตัวชี้วัด บุคลากร
- [x] ดึงข้อมูลจาก Google Sheets / Excel / trpb.rmutl.ac.th
- [x] จัดทำร่างข้อมูล markdown สำหรับ cross-check
- [ ] ย้ายข้อมูลจาก static data ไป Supabase
- [ ] เพิ่มระบบรายงานผลดำเนินงาน (กรอกผล actual)
- [ ] เพิ่มหน้าพื้นที่โครงการหลวง พร้อมแผนที่
- [ ] เพิ่มหน้าโปรไฟล์นักวิจัย/อาจารย์
- [ ] Authentication สำหรับผู้กรอกข้อมูล
- [ ] Deploy บน Vercel

## Getting Started

```bash
git clone https://github.com/worrajak/trpbrmutl.git
cd trpbrmutl
npm install
cp .env.local.example .env.local
npm run dev
```

เปิด http://localhost:3000

## License

Internal use - RMUTL
