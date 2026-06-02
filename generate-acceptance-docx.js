/**
 * generate-acceptance-docx.js
 * สร้างเอกสารตรวจรับ/ส่งมอบงาน ภายใต้ TOR:
 *   "บริการวิเคราะห์ข้อมูล + Dashboard ใต้ร่ม ปี 69"
 *
 * วิธีใช้: node generate-acceptance-docx.js
 */

const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  ShadingType,
  WidthType,
  LevelFormat,
  PageBreak,
  Header,
  Footer,
  ImageRun,
} = require("docx");

// =============================================================================
// CONSTANTS
// =============================================================================
const PROJECT_NAME = "ระบบติดตามโครงการกลุ่มแผนงานใต้ร่มพระบารมี";
const PROJECT_SHORT = "ใต้ร่มพระบารมี Intel";
const TOR_NAME = "บริการวิเคราะห์ข้อมูล + Dashboard ใต้ร่ม ปี 69";
const ORG = "มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา (มทร.ล้านนา)";
const VERSION = "1.0";
const MONTH_YEAR = "มิถุนายน 2569";
const FONT = "TH Sarabun New";

// A4 portrait: 11906 × 16838 DXA · content width = 9266 DXA
const CONTENT_WIDTH = 9266;

const SCREENSHOTS_DIR = path.join(__dirname, "docs", "screenshots");

// =============================================================================
// SHARED HELPERS
// =============================================================================
const border = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
const headerShading = { fill: "1B4F72", type: ShadingType.CLEAR, color: "auto" };
const altShading = { fill: "EBF5FB", type: ShadingType.CLEAR, color: "auto" };

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: opts.spacing || { after: 120 },
    children: [
      new TextRun({
        text: String(text),
        font: FONT,
        size: opts.size || 28,
        bold: !!opts.bold,
        italics: !!opts.italics,
        color: opts.color || "000000",
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: "Heading1",
    spacing: { before: 480, after: 240 },
    children: [new TextRun({ text, bold: true, font: FONT, size: 40, color: "1B4F72" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: "Heading2",
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, font: FONT, size: 32, color: "2E86C1" })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 60 },
    children: [new TextRun({ text: String(text), font: FONT, size: 28 })],
  });
}

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: headerShading,
    margins: cellMargins,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, font: FONT, size: 28, color: "FFFFFF" })],
      }),
    ],
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shade ? altShading : undefined,
    margins: cellMargins,
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: String(text),
            font: FONT,
            size: opts.size || 28,
            bold: !!opts.bold,
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, rows, widths) {
  const sum = widths.reduce((a, b) => a + b, 0);
  if (sum !== CONTENT_WIDTH) {
    throw new Error(`Table widths sum=${sum} ต้องเท่ากับ ${CONTENT_WIDTH}`);
  }
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => headerCell(h, widths[i])),
      }),
      ...rows.map(
        (row, ri) =>
          new TableRow({
            children: row.map((c, ci) =>
              cell(c, widths[ci], { shade: ri % 2 === 1, center: ci === 0 && row.length > 1 })
            ),
          })
      ),
    ],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function imageBlock(filename, caption, widthPx = 600) {
  const fp = path.join(SCREENSHOTS_DIR, filename);
  if (!fs.existsSync(fp)) {
    return [
      p(`[ภาพประกอบ: ${caption} — ไม่พบไฟล์ ${filename}]`, { italics: true, color: "888888" }),
    ];
  }
  const buf = fs.readFileSync(fp);
  // อ่าน PNG dimensions จาก header (offsets 16,20 เป็น big-endian uint32)
  let imgW = 1280;
  let imgH = 720;
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    imgW = buf.readUInt32BE(16);
    imgH = buf.readUInt32BE(20);
  }
  const aspect = imgH / imgW;
  const renderW = widthPx;
  // จำกัดความสูงไม่เกิน 800px เพื่อไม่ให้รูปทอดตัวเกินหน้า
  let renderH = Math.round(widthPx * aspect);
  if (renderH > 900) {
    renderH = 900;
  }

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [
        new ImageRun({
          type: "png",
          data: buf,
          transformation: { width: renderW, height: renderH },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `รูปประกอบ: ${caption}`,
          italics: true,
          font: FONT,
          size: 24,
          color: "555555",
        }),
      ],
    }),
  ];
}

function makeHeader() {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
        children: [
          new TextRun({
            text: `${PROJECT_SHORT} | เอกสารตรวจรับ ${TOR_NAME}`,
            color: "888888",
            size: 20,
            font: FONT,
          }),
        ],
      }),
    ],
  });
}

function makeFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `เอกสารตรวจรับโครงการ ${PROJECT_NAME} · ${ORG}`,
            color: "888888",
            size: 20,
            font: FONT,
          }),
        ],
      }),
    ],
  });
}

// =============================================================================
// DOCUMENT CONTENT
// =============================================================================

const children = [];

// ---- COVER PAGE -----------------------------------------------------------
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1800, after: 240 },
    children: [
      new TextRun({
        text: "เอกสารตรวจรับและส่งมอบงาน",
        bold: true,
        font: FONT,
        size: 48,
        color: "1B4F72",
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 480 },
    children: [
      new TextRun({
        text: `ภายใต้ TOR: ${TOR_NAME}`,
        bold: true,
        font: FONT,
        size: 36,
        color: "2E86C1",
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 120 },
    children: [new TextRun({ text: PROJECT_NAME, bold: true, font: FONT, size: 40 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: "ระบบ Dashboard + เครื่องมือวิเคราะห์ข้อมูล KPI/งบประมาณ",
        italics: true,
        font: FONT,
        size: 28,
        color: "555555",
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 360 },
    children: [
      new TextRun({
        text: "สำหรับกลุ่มแผนงานใต้ร่มพระบารมี",
        italics: true,
        font: FONT,
        size: 28,
        color: "555555",
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 120 },
    children: [new TextRun({ text: ORG, bold: true, font: FONT, size: 32 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600 },
    children: [
      new TextRun({
        text: `เวอร์ชัน ${VERSION} · ${MONTH_YEAR}`,
        font: FONT,
        size: 28,
        color: "555555",
      }),
    ],
  }),
  pageBreak()
);

// ---- TABLE OF CONTENTS ----------------------------------------------------
children.push(h1("สารบัญ"));
const tocItems = [
  "1. ภาพรวมและขอบเขตของ TOR",
  "2. สถาปัตยกรรมและเทคโนโลยีที่ใช้",
  "3. โครงสร้างฐานข้อมูล",
  "4. ระบบจัดการผู้ใช้และสิทธิ์",
  "5. ฟีเจอร์หลักของระบบ (พร้อมภาพประกอบ)",
  "    5.1 Home Dashboard — Decision-First Design",
  "    5.2 ระบบจัดการโครงการ",
  "    5.3 ระบบโจทย์วิจัย + สายของแหล่งข้อมูล",
  "    5.4 ระบบนักวิจัย + Portal ส่วนตัว",
  "    5.5 Catalog สาขาที่ต้องการ (auto-sync)",
  "    5.6 ตัวชี้วัดความเป็นเลิศ + SDGs",
  "    5.7 ระบบที่มา · แจ้งเตือน · แผนที่",
  "    5.8 หลังบ้าน (Admin Panel)",
  "    5.9 AI Brief Generator (BYOK)",
  "6. API Endpoints",
  "7. หน้าจอ/Routes ทั้งหมด",
  "8. ระบบรักษาความปลอดภัย",
  "9. การติดตั้งและ Deployment",
  "10. สรุปสถิติโปรเจค",
  "11. การตรวจรับและลงนาม",
];
tocItems.forEach((t) => children.push(p(t, { size: 28 })));
children.push(pageBreak());

// ---- 1. ภาพรวมและขอบเขต ---------------------------------------------------
children.push(h1("1. ภาพรวมและขอบเขตของ TOR"));
children.push(h2("1.1 วัตถุประสงค์"));
children.push(
  p(
    `พัฒนาระบบเว็บแอปพลิเคชันที่รวมหน้า Dashboard และเครื่องมือวิเคราะห์ข้อมูลสำหรับกลุ่มแผนงานใต้ร่มพระบารมี ของ ${ORG} ` +
      `เพื่อช่วยผู้บริหาร / ทีมงาน / นักวิจัย ในการตัดสินใจที่ขับเคลื่อนด้วยข้อมูล ` +
      `ครอบคลุมการติดตาม KPI ตามแผน 1/2/3 ของหน่วยงาน · งบประมาณเบิกจ่าย · ผลผลิต Output/Outcome/Impact ` +
      `และตัวชี้วัด มทร.ล้านนา (Excellence + ค.ต.ป.)`
  )
);

children.push(h2("1.2 ขอบเขตงานที่ส่งมอบ"));
[
  "Web application (Next.js 14 App Router) รองรับ Desktop และ Mobile",
  "หน้า Home Dashboard ออกแบบรอบ \"การตัดสินใจ\" (Decision-First) — pyramid 4 ชั้น",
  "ระบบจัดการโครงการ — เพิ่ม/แก้/ลบ · sync งบจาก Excel ERP · auto-classify เข้า KPI",
  "ระบบโจทย์วิจัย (Briefs) + AI Brief Generator (BYOK OpenRouter)",
  "ระบบสายของแหล่งข้อมูล (Source Attribution Chain) — เครดิตผู้รายงาน 1-5",
  "ระบบนักวิจัย + Researcher Portal (Token + PIN login)",
  "Catalog สาขาที่ต้องการ — auto-sync จาก brief พร้อมคำนวณ demand_level",
  "ระบบ matching นักวิจัย ↔ โจทย์วิจัย (Jaccard similarity)",
  "ระบบหลังบ้าน (Admin Panel) ครบฟังก์ชัน",
  "เอกสารประกอบและคู่มือการใช้งาน (เอกสารฉบับนี้)",
].forEach((s) => children.push(bullet(s)));

children.push(h2("1.3 จุดเด่นที่แตกต่างจาก Dashboard ทั่วไป"));
children.push(p("ระบบนี้ออกแบบรอบ \"การตัดสินใจของผู้ใช้\" ไม่ใช่ \"ข้อมูลที่มี\" โดยใช้หลักการ:", { bold: true }));
[
  "Pyramid layered — 5-sec scan ที่ชั้นบน · drill-down ที่ชั้นล่าง",
  "ทุกเลขมีของเปรียบเทียบ — ไม่มี \"125M\" ลอย ๆ → ใช้ \"25% vs เวลา 67%\" ที่ตีความได้ทันที",
  "สีเป็นสัญญาณเตือน — 🔴 ต้องเร่ง · 🟡 เฝ้าระวัง · 🟢 ตามแผน (ไม่ใช่สีตกแต่ง)",
  "Insight Sentence อัตโนมัติ — ระบบสรุปเป็น 1 ประโยคที่ตอบ \"วันนี้ต้องทำอะไร\"",
  "Source Attribution — ทุกข้อความตอบ \"ใครรายงาน · ผ่านใคร · ต้นทาง · เกรดน่าเชื่อ\"",
].forEach((s) => children.push(bullet(s)));

children.push(pageBreak());

// ---- 2. สถาปัตยกรรม ------------------------------------------------------
children.push(h1("2. สถาปัตยกรรมและเทคโนโลยีที่ใช้"));
children.push(h2("2.1 แผนภาพสถาปัตยกรรม"));
const arch = [
  "┌──────────────────────────────────────────────────────────┐",
  "│        CLIENT (Browser / Mobile)                          │",
  "│   Next.js 14 App Router · Tailwind · React Server         │",
  "└─────────────────────┬────────────────────────────────────┘",
  "                      │ HTTPS",
  "┌─────────────────────▼────────────────────────────────────┐",
  "│        APPLICATION SERVER (Vercel / Self-host)            │",
  "│   • Server Components (RSC)                               │",
  "│   • API Routes (48 endpoints)                             │",
  "│   • Middleware Auth Gate                                  │",
  "└─────┬──────────────────────────┬─────────────────────────┘",
  "      │                          │",
  "      ▼                          ▼",
  "┌──────────────┐         ┌──────────────────┐",
  "│  Supabase    │         │  OpenRouter AI   │",
  "│  Postgres    │         │  (BYOK)          │",
  "│  + RLS       │         │  Claude / Gemini │",
  "│  19 ตาราง    │         │  Brief Generator │",
  "└──────────────┘         └──────────────────┘",
];
arch.forEach((line) =>
  children.push(
    new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: line, font: "Consolas", size: 20 })],
    })
  )
);

children.push(h2("2.2 ตารางเทคโนโลยีที่ใช้"));
const techRows = [
  ["Frontend Framework", "Next.js (App Router)", "14.2.21"],
  ["UI Library", "React", "18.x"],
  ["Styling", "Tailwind CSS", "3.x"],
  ["Language", "TypeScript", "5.x"],
  ["Database", "PostgreSQL (Supabase)", "—"],
  ["Database Client", "@supabase/supabase-js", "2.49.4"],
  ["Authentication", "Token + PIN (SHA-256)", "—"],
  ["AI Gateway", "OpenRouter API (BYOK)", "—"],
  ["Default AI Model", "anthropic/claude-sonnet-4.5", "—"],
  ["Spreadsheet Parser", "xlsx (SheetJS)", "0.18.5"],
  ["Map", "Leaflet + react-leaflet", "1.9 / 4.2"],
  ["Document Gen", "docx", "9.x"],
];
children.push(makeTable(["หมวด", "เทคโนโลยี", "เวอร์ชัน"], techRows, [3000, 4266, 2000]));

children.push(pageBreak());

// ---- 3. โครงสร้างฐานข้อมูล -----------------------------------------------
children.push(h1("3. โครงสร้างฐานข้อมูล (Supabase Postgres)"));
children.push(p("ระบบใช้ฐานข้อมูล 19 ตาราง พร้อม Row Level Security (RLS) ทุกตาราง:"));

const dbRows = [
  ["1", "projects", "โครงการหลัก พร้อม budget + sdg_tags"],
  ["2", "activities", "กิจกรรมย่อย ผูกกับโครงการ + planned_months"],
  ["3", "kpi_targets", "ตัวชี้วัดต่อโครงการ (target + actual)"],
  ["4", "activity_reports", "รายงานผลของกิจกรรม"],
  ["5", "kpi_contributions", "การสนับสนุน KPI"],
  ["6", "notifications", "ระบบแจ้งเตือน"],
  ["7", "budget_transactions", "บัญชีเบิก/รายงาน + reconciliation"],
  ["8", "project_tokens", "Token ของหัวหน้าโครงการ"],
  ["9", "reward_log", "บันทึก reward (อนาคต TRON Blockchain)"],
  ["10", "reward_balance", "ยอด reward สะสม"],
  ["11", "participants", "ผู้เข้าร่วมโครงการ"],
  ["12", "kpi_evidence", "หลักฐาน KPI"],
  ["13", "team_members", "ทีมงาน (Token+PIN auth)"],
  ["14", "research_briefs", "โจทย์วิจัย + source_chain + verification_status"],
  ["15", "brief_interests", "ความสนใจของนักวิจัย"],
  ["16", "app_settings", "การตั้งค่าระบบ (เก็บ AI API key)"],
  ["17", "rpf_researchers", "ฐานข้อมูลนักวิจัย"],
  ["18", "rpf_research_areas", "Catalog สาขา + usage_count + demand_level"],
  ["19", "reporter_trust", "เครดิตผู้รายงาน (trust_score 0-10)"],
];
children.push(makeTable(["#", "ตาราง", "คำอธิบาย"], dbRows, [800, 2800, 5666]));

children.push(
  p(
    "Migration files แยกตามวันที่ในรูปแบบ supabase/YYYY-MM-DD-feature.sql " +
      "เพื่อความง่ายในการ trace ลำดับการเปลี่ยนแปลง · RLS policy เปิดให้ anon ทำ CRUD ได้ทุก op " +
      "(admin gate อยู่ที่ API route layer ผ่าน password / Token)",
    { italics: true, color: "555555" }
  )
);

children.push(pageBreak());

// ---- 4. ระบบสิทธิ์ผู้ใช้ ---------------------------------------------------
children.push(h1("4. ระบบจัดการผู้ใช้และสิทธิ์"));
const roleRows = [
  ["ผู้เยี่ยมชม (Public)", "ดู Dashboard · โครงการ · โจทย์วิจัย · KPI · SDGs · ที่มา · ระเบียบ"],
  ["นักวิจัย (Researcher)", "Login ด้วย Token + PIN · ดู brief ที่ match · Apply · จัดการ profile"],
  ["ทีมงาน (Team Member)", "Token+PIN login · สร้าง/แก้ brief · sync excel · เพิ่มรายงาน"],
  ["ผู้ดูแลระบบ (Admin)", "Password login · เข้าถึงทุก admin route · กำหนดสิทธิ์ทีมงาน"],
];
children.push(makeTable(["บทบาท", "สิทธิ์การใช้งาน"], roleRows, [3000, 6266]));

children.push(h2("4.1 ระบบ Authentication"));
[
  "Token (8 หลัก alphanumeric) ระบุตัวบุคคล",
  "PIN 4 หลัก hashed ด้วย SHA-256 ผ่าน Web Crypto API",
  "Session ใช้ sessionStorage (auto-clear เมื่อปิด browser)",
  "Admin password เก็บที่ environment variable (ไม่อยู่ใน DB)",
  "Honeypot field สำหรับ self-registration → กัน bot",
].forEach((s) => children.push(bullet(s)));

children.push(pageBreak());

// ---- 5. ฟีเจอร์หลัก พร้อมภาพประกอบ -------------------------------------------
children.push(h1("5. ฟีเจอร์หลักของระบบ"));

// 5.1 Home Dashboard
children.push(h2("5.1 Home Dashboard — Decision-First Design"));
children.push(p("หน้าแรกของระบบ ออกแบบรอบ \"การตัดสินใจของแอดมิน/ทีมงาน\" — ตอบ 3 คำถามใน 5 วินาที:"));
[
  "Q1: งบประมาณเร่งใช้แค่ไหน? (% used vs % FY elapsed)",
  "Q2: KPI ตัวไหนยังไม่ตอบ? (count + top 3 uncovered)",
  "Q3: โครงการไหนเสี่ยง? (composite: เบิกช้า + กิจกรรม overdue)",
].forEach((s) => children.push(bullet(s)));

children.push(p(""));
children.push(p("โครงสร้าง Pyramid 4 ชั้น:", { bold: true }));
[
  "TIER 0 — Insight Sentence: 1 ประโยค คลิกได้ → ไปหน้า detail",
  "TIER 1 — 3 Health Cards: ทุกตัวมีของเปรียบเทียบ + สีเป็นสัญญาณ",
  "TIER 2 — Action Items: top 3 โครงการเสี่ยง (ไม่ใช่ทุกตัว)",
  "TIER 3 — Drill-down Links: 6 ลิงก์ไปหน้า detail",
].forEach((s) => children.push(bullet(s)));

children.push(...imageBlock("01-home-dashboard.png", "หน้า Home Dashboard (Decision-First)"));
children.push(pageBreak());

// 5.2 Projects
children.push(h2("5.2 ระบบจัดการโครงการ"));
children.push(
  p(
    "ระบบจัดการโครงการรองรับการ filter ตามสถานะ · ดูบัญชีเบิก/รายงาน · sync งบจาก Excel ERP · " +
      "auto-classify เข้า Excellence KPI ผ่าน keyword matching"
  )
);
[
  "View list — รายการทุกโครงการ พร้อม budget reconciliation",
  "Budget reconciliation — ตรวจ ERP vs รายงาน → flag pendingClearance + advancePayment",
  "Auto-classify — เข้าหมวด Excellence KPI ตาม keyword",
  "ERP code editing — admin แก้รหัสได้",
  "Cascade delete — ลบโครงการ → cascade activities + reports + tokens",
].forEach((s) => children.push(bullet(s)));
children.push(...imageBlock("02-projects-list.png", "หน้ารายการโครงการ"));
children.push(...imageBlock("13-admin-projects.png", "หน้า Admin จัดการโครงการ"));
children.push(pageBreak());

// 5.3 Briefs + Source Chain
children.push(h2("5.3 ระบบโจทย์วิจัย (Briefs) + สายของแหล่งข้อมูล"));
children.push(
  p(
    "ระบบโจทย์วิจัยรองรับการสร้างด้วย AI (BYOK OpenRouter) · " +
      "ทุก brief มี source attribution chain เพื่อตรวจสอบความน่าเชื่อของข้อมูล"
  )
);
children.push(p("โครงสร้าง source_chain (JSONB array):", { bold: true }));
[
  "claim — คำกล่าวอ้างใน problem_statement",
  "reporter — ใครเป็นคนรายงาน (researcher / staff / villager / document / ai_estimate)",
  "via — สายของคนกลาง (array)",
  "origin — ต้นทางดั้งเดิม",
  "evidence_type — direct_observation / interview / document / secondary / ai_inference",
  "credibility — เกรดน่าเชื่อ 1-5",
  "needs_verification — boolean flag",
].forEach((s) => children.push(bullet(s)));

children.push(p(""));
children.push(p("ระบบ verification_status อัตโนมัติ:", { bold: true }));
[
  "credibility ≤ 2 OR needs_verification → flagged (⚠ ต้อง verify)",
  "credibility 3-4 → pending (รอ admin review)",
  "Admin manual verify → verified (✓)",
].forEach((s) => children.push(bullet(s)));

children.push(...imageBlock("03-briefs-list.png", "หน้ารายการโจทย์วิจัย (พร้อม badge ความน่าเชื่อ)"));
children.push(
  ...imageBlock(
    "04-brief-detail-source-chain.png",
    "หน้ารายละเอียดโจทย์วิจัย + Source Attribution Panel"
  )
);
children.push(...imageBlock("11-admin-briefs.png", "หน้า Admin จัดการโจทย์วิจัย"));
children.push(pageBreak());

// 5.4 Researchers
children.push(h2("5.4 ระบบนักวิจัย + Portal ส่วนตัว"));
children.push(
  p(
    "ระบบนักวิจัยรองรับการลงทะเบียน 3 วิธี: (a) admin seed จาก projects (b) self-registration (c) admin issue token " +
      "พร้อม Portal ส่วนตัวที่ /me/researcher สำหรับดู brief ที่ match"
  )
);
[
  "Profile public — แสดง expertise tags · พื้นที่ · level",
  "Matching algorithm — Jaccard similarity (skill + พื้นที่ + level + load)",
  "Apply with note — ส่งความสนใจพร้อม note ถึง admin",
  "Status tracking — pending → shortlisted → accepted / rejected",
  "Portal authentication — Token + PIN",
].forEach((s) => children.push(bullet(s)));

children.push(...imageBlock("05-researchers.png", "หน้ารายการนักวิจัย (สาธารณะ)"));
children.push(...imageBlock("12-admin-researchers.png", "หน้า Admin จัดการนักวิจัย"));
children.push(pageBreak());

// 5.5 Research Areas
children.push(h2("5.5 Catalog สาขาที่ต้องการ (Auto-sync)"));
children.push(
  p(
    "Catalog สาขาที่ต้องการขยายตัวอัตโนมัติเมื่อ admin สร้าง brief — ระบบ extract required_skills → upsert เข้า catalog"
  )
);
[
  "skill ใหม่ → insert (auto_imported=true, category=expertise)",
  "skill มีแล้ว → bump usage_count + recompute demand_level",
  "demand_level: 1 brief=low · 2-3=medium · 4+=high",
  "ลบ brief → decrement count → ถ้า count=0 + auto_imported → ลบ catalog ตามไป",
  "AI prompt ป้อน catalog top-80 → AI ใช้ชื่อซ้ำ ลดความเพี้ยน",
].forEach((s) => children.push(bullet(s)));
children.push(...imageBlock("06-research-areas.png", "หน้า Catalog สาขาที่ต้องการ"));
children.push(pageBreak());

// 5.6 Excellence KPI + SDGs
children.push(h2("5.6 ตัวชี้วัดความเป็นเลิศ (Excellence + ค.ต.ป.) + SDGs"));
children.push(
  p(
    "ระบบติดตามตัวชี้วัด มทร.ล้านนา 26 ตัว แยกเป็น ค.ต.ป. (6) · EdPEx 7.1ก (4) · EdPEx 7.1ค (1) · " +
      "EdPEx 7.2ก (1) · อื่น ๆ พร้อม mapping เข้า 17 SDGs"
  )
);
children.push(...imageBlock("07-excellence-kpi.png", "หน้าตัวชี้วัดความเป็นเลิศ"));
children.push(...imageBlock("09-sdgs.png", "หน้า SDGs Mapping (17 เป้าหมาย)"));
children.push(...imageBlock("16-indicators.png", "หน้าตัวชี้วัด KPI ทั้งหมด"));
children.push(pageBreak());

// 5.7 Foundation + Alerts + Map
children.push(h2("5.7 ระบบที่มา · แจ้งเตือน · แผนที่"));
children.push(
  p(
    "หน้า /foundation อธิบายแผนงาน 4 ชั้น (ศาสตร์พระราชา → ใต้ร่มพระบารมี → แผนความเป็นเลิศ → SDGs)"
  )
);
children.push(...imageBlock("08-foundation.png", "หน้าที่มาและความสำคัญ"));
children.push(...imageBlock("14-alerts.png", "หน้าแจ้งเตือนกิจกรรมที่ใกล้/เลยกำหนด"));
children.push(...imageBlock("15-map.png", "หน้าแผนที่โครงการ (Leaflet)"));
children.push(pageBreak());

// 5.8 Admin
children.push(h2("5.8 หลังบ้าน (Admin Panel)"));
children.push(p("Admin Panel ครอบคลุมทุกฟังก์ชันการจัดการ:"));
[
  "/admin — Login + tabs (admin password · team member · researcher)",
  "/admin/projects — จัดการโครงการ + ลบ + แก้ ERP code",
  "/admin/briefs — สร้าง/แก้ brief + AI generate",
  "/admin/researchers — จัดการนักวิจัย + issue token + approve",
  "/admin/research-areas — จัดการ catalog สาขา",
  "/admin/team — จัดการทีมงาน + ออก Token+PIN",
  "/admin/sync-excel — Sync งบจาก Excel ERP",
  "/admin/upload-ngor9 — Upload PDF ง.9 + AI match + merge",
  "/admin/analytics — สรุปสถิติ",
].forEach((s) => children.push(bullet(s)));
children.push(...imageBlock("10-admin-login.png", "หน้า Admin Login"));
children.push(...imageBlock("17-admin-sync-excel.png", "หน้า Admin Sync งบจาก Excel ERP"));
children.push(pageBreak());

// 5.9 AI Brief Generator
children.push(h2("5.9 AI Brief Generator (BYOK)"));
children.push(
  p(
    "ระบบ AI ช่วยสร้างโจทย์วิจัยอัตโนมัติด้วย OpenRouter (Bring Your Own Key) " +
      "รองรับ Claude, Gemini, GPT, และ models อื่น ๆ ของ OpenRouter ทั้งหมด"
  )
);
children.push(p("คุณสมบัติเด่น:", { bold: true }));
[
  "BYOK — admin กรอก OpenRouter API key เอง · เก็บที่ app_settings (server) + localStorage (cache)",
  "Sequential generation — สร้างทีละ brief (ห้าม parallel) · ส่ง avoid_titles ทุก iteration → ไม่ซ้ำชื่อ",
  "Batch mode — สร้าง 1-5 brief ต่อรอบ · จัดสรรงบจาก pool ทั้งหมด",
  "Smart mode — ป้อน prioritize_kpis (KPI ที่ยังไม่มีโจทย์ตอบ) → AI ออกแบบให้ตอบ KPI เหล่านั้นก่อน",
  "Theme presets — 10 ธีม (เกษตรอัจฉริยะ, หัตถกรรม, แปรรูปอาหาร, EdTech, ...) → กระจายหัวข้อ",
  "Catalog reuse — AI prompt ป้อน catalog skills ปัจจุบัน → AI ใช้ชื่อซ้ำ ลดความเพี้ยน",
  "Source chain mandatory — AI ต้องออก source_chain 2-4 รายการต่อ brief · flag AI-estimate ชัดเจน",
  "Output validation — strict JSON schema · retry-on-mismatch",
].forEach((s) => children.push(bullet(s)));

children.push(pageBreak());

// ---- 6. API Endpoints ------------------------------------------------------
children.push(h1("6. API Endpoints"));
children.push(p("ระบบมี API routes ทั้งหมด 48 endpoints จัดเป็น 4 กลุ่ม:"));

const apiRows = [
  ["GET", "/api/projects", "รายการโครงการ"],
  ["POST", "/api/admin/auth", "Admin login"],
  ["POST", "/api/admin/team-auth", "Team member login (Token+PIN)"],
  ["POST", "/api/researcher/auth", "Researcher login"],
  ["GET/POST", "/api/admin/briefs", "List/create brief (auto-sync skills)"],
  ["PATCH/DELETE", "/api/admin/briefs/[id]", "Update/delete brief (sync skill diff)"],
  ["POST", "/api/admin/briefs/ai-generate", "AI generate brief (feed catalog)"],
  ["POST", "/api/admin/briefs/[id]/ai-ngor9", "AI generate ง.9 draft"],
  ["POST", "/api/admin/briefs/[id]/ai-rerank", "AI rerank applicants"],
  ["GET/POST", "/api/admin/briefs/[id]/interest", "Apply for brief"],
  ["GET", "/api/admin/briefs/[id]/match", "Match researchers"],
  ["GET/POST", "/api/admin/researchers", "List/create researcher"],
  ["POST", "/api/admin/researchers/[id]/issue-token", "ออก Token+PIN ให้นักวิจัย"],
  ["POST", "/api/admin/researchers/seed-from-projects", "Auto-seed จาก projects"],
  ["GET/POST", "/api/admin/research-areas", "Catalog CRUD"],
  ["GET/POST", "/api/admin/team-members", "Team CRUD"],
  ["POST", "/api/admin/settings/openrouter", "Save API key (server)"],
  ["GET", "/api/ai-models", "List OpenRouter models"],
  ["POST", "/api/openrouter/test-key", "ทดสอบ API key"],
  ["GET", "/api/researcher/[id]/matched-briefs", "ดู brief ที่ match"],
  ["POST", "/api/researchers/register", "Self-register (honeypot)"],
  ["POST", "/api/supabase/sync-excel", "Sync งบจาก Excel"],
  ["POST", "/api/supabase/parse-ngor9", "Parse PDF ง.9"],
  ["POST", "/api/supabase/match-ngor9", "Match ง.9 vs DB"],
  ["POST", "/api/supabase/save-ngor9", "Save merged ง.9"],
  ["GET", "/api/supabase/latest-reports", "รายงานล่าสุด"],
  ["POST", "/api/notify/telegram", "ส่งแจ้งเตือน Telegram"],
];
children.push(makeTable(["Method", "Path", "คำอธิบาย"], apiRows, [1500, 4000, 3766]));
children.push(
  p(
    "(แสดงเฉพาะ endpoints หลัก · มี endpoints รองอื่น ๆ อีก ~20 ตัวสำหรับ Internal use)",
    { italics: true, color: "555555", size: 22 }
  )
);
children.push(pageBreak());

// ---- 7. หน้าจอ/Routes -----------------------------------------------------
children.push(h1("7. หน้าจอ/Routes ทั้งหมด"));
const routeRows = [
  ["สาธารณะ", "/", "Home Dashboard (Decision-First)"],
  ["สาธารณะ", "/projects, /projects/[id]", "รายการ + รายละเอียดโครงการ"],
  ["สาธารณะ", "/briefs, /briefs/[id]", "รายการ + รายละเอียดโจทย์วิจัย"],
  ["สาธารณะ", "/researchers", "รายการนักวิจัย"],
  ["สาธารณะ", "/research-areas", "Catalog สาขา"],
  ["สาธารณะ", "/excellence", "ตัวชี้วัดความเป็นเลิศ"],
  ["สาธารณะ", "/sdgs, /sdgs/[goal]", "SDG mapping 17 goals"],
  ["สาธารณะ", "/foundation", "ที่มาและความสำคัญ"],
  ["สาธารณะ", "/indicators", "ตัวชี้วัด KPI ทั้งหมด"],
  ["สาธารณะ", "/staff", "บุคลากร"],
  ["สาธารณะ", "/regulations", "ระเบียบ"],
  ["สาธารณะ", "/map", "แผนที่โครงการ"],
  ["สาธารณะ", "/alerts", "แจ้งเตือน"],
  ["นักวิจัย", "/me/researcher", "Portal นักวิจัย"],
  ["นักวิจัย", "/me/briefs/matched", "Brief ที่ match"],
  ["นักวิจัย", "/researchers/register", "Self-register"],
  ["Admin", "/admin", "Login (3 tabs)"],
  ["Admin", "/admin/projects", "จัดการโครงการ"],
  ["Admin", "/admin/briefs", "จัดการ Brief + AI gen"],
  ["Admin", "/admin/researchers", "จัดการนักวิจัย"],
  ["Admin", "/admin/research-areas", "จัดการ Catalog"],
  ["Admin", "/admin/team", "จัดการทีมงาน"],
  ["Admin", "/admin/sync-excel", "Sync งบ"],
  ["Admin", "/admin/upload-ngor9", "Upload PDF ง.9"],
  ["Admin", "/admin/analytics", "Analytics"],
  ["Admin", "/admin/tokens", "จัดการ Project Tokens"],
];
children.push(makeTable(["กลุ่ม", "Route", "คำอธิบาย"], routeRows, [1500, 3500, 4266]));
children.push(pageBreak());

// ---- 8. Security ----------------------------------------------------------
children.push(h1("8. ระบบรักษาความปลอดภัย"));
children.push(h2("8.1 Authentication"));
[
  "Admin password — เก็บที่ environment variable · ไม่อยู่ใน DB",
  "Team member / Researcher — Token (8 หลัก) + PIN (4 หลัก) hashed ด้วย SHA-256",
  "Session — sessionStorage · clear เมื่อปิด browser",
  "Honeypot field — ใน /researchers/register กัน bot",
].forEach((s) => children.push(bullet(s)));

children.push(h2("8.2 Authorization"));
[
  "Admin gate — middleware ที่ API route layer ตรวจ session ก่อนเข้า admin endpoints",
  "RLS enabled — Row Level Security เปิดทุกตาราง · anon ทำ CRUD ผ่าน policy",
  "Service-role key — ไม่ expose ที่ client · ใช้เฉพาะ server-side scripts",
].forEach((s) => children.push(bullet(s)));

children.push(h2("8.3 Data Privacy"));
[
  "PII (เบอร์โทร · อีเมล) — แสดงเฉพาะใน admin/researcher dashboard",
  "AI API key — เก็บที่ app_settings ฝั่ง server เท่านั้น (read-only ที่ client)",
  "AI ไม่ส่ง PII ของผู้เกี่ยวข้อง — ใช้เฉพาะข้อมูลโครงการ + KPI ที่จำเป็น",
  "Source attribution chain — ทุก claim มีแหล่งที่มา → ป้องกัน AI hallucination",
].forEach((s) => children.push(bullet(s)));

children.push(pageBreak());

// ---- 9. Deployment ---------------------------------------------------------
children.push(h1("9. การติดตั้งและ Deployment"));
children.push(h2("9.1 Prerequisites"));
[
  "Node.js 18+ และ npm",
  "Supabase project (Postgres) — pgcrypto extension",
  "OpenRouter API key (สำหรับ admin · ตั้งใน /admin/settings)",
].forEach((s) => children.push(bullet(s)));

children.push(h2("9.2 Environment Variables (.env.local)"));
[
  "NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...",
  "SUPABASE_SERVICE_ROLE_KEY=eyJ... (server only · admin scripts)",
  "ADMIN_PASSWORD=... (password สำหรับ /admin login)",
].forEach((s) =>
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: s, font: "Consolas", size: 22, color: "555555" })],
    })
  )
);

children.push(h2("9.3 ขั้นตอนการติดตั้ง"));
[
  "1. git clone และ npm install",
  "2. รัน supabase/schema.sql ใน Supabase SQL Editor (สร้างทุก table + RLS policies)",
  "3. รัน migration files ตามลำดับ: 2026-05-12-research-areas-usage.sql → 2026-05-13-source-attribution.sql",
  "4. ตั้งค่า .env.local",
  "5. npm run dev (port 3000) หรือ npm run build && npm start สำหรับ production",
  "6. Deploy ที่ Vercel / Self-host (Next.js standalone)",
  "7. เข้า /admin ตั้งค่า OpenRouter API key",
  "8. (Optional) Seed ข้อมูลจาก /admin → \"Seed Researchers from Projects\"",
].forEach((s) => children.push(bullet(s)));

children.push(pageBreak());

// ---- 10. สรุปสถิติโปรเจค --------------------------------------------------
children.push(h1("10. สรุปสถิติโปรเจค"));
const statsRows = [
  ["หน้าจอ (Routes)", "28"],
  ["API Endpoints", "48"],
  ["React Components", "29"],
  ["Library Files", "26"],
  ["ตารางฐานข้อมูล", "19"],
  ["Migration Files", "5"],
  ["บรรทัด Source Code (TS/TSX)", "29,081"],
  ["Languages", "TypeScript + SQL + Markdown"],
  ["Test Files", "0 (Manual testing via Claude Preview + Playwright)"],
  ["AI Models รองรับ", "ทุก model ของ OpenRouter (Claude/Gemini/GPT/Llama)"],
  ["KPI Catalog (Excellence + ค.ต.ป.)", "26 ตัว"],
  ["SDG Goals", "17 (พร้อม [goal] dynamic routes)"],
  ["Plans (ใต้ร่มพระบารมี)", "3 แผน (พร้อม KPIs ต่อแผน)"],
];
children.push(makeTable(["รายการ", "จำนวน / รายละเอียด"], statsRows, [4000, 5266]));

children.push(pageBreak());

// ---- 11. ลงนาม ------------------------------------------------------------
children.push(h1("11. การตรวจรับและลงนาม"));
children.push(p("ข้าพเจ้าได้ตรวจสอบและทดสอบระบบตาม TOR ข้างต้นเรียบร้อยแล้ว และยอมรับการส่งมอบงาน"));
children.push(p(""));
children.push(p(""));

// Two signature blocks side by side via single table 2 cols
const sigCellMargins = { top: 240, bottom: 240, left: 240, right: 240 };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function sigCell(role, width) {
  return new TableCell({
    borders: noBorders,
    width: { size: width, type: WidthType.DXA },
    margins: sigCellMargins,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "ลงชื่อ ____________________________", font: FONT, size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: "(                                       )", font: FONT, size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: role, bold: true, font: FONT, size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: "ตำแหน่ง _____________________________", font: FONT, size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "วันที่ _______________________________", font: FONT, size: 28 })],
      }),
    ],
  });
}

children.push(
  new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [4633, 4633],
    rows: [
      new TableRow({
        children: [sigCell("ผู้ส่งมอบงาน", 4633), sigCell("ผู้ตรวจรับ", 4633)],
      }),
    ],
  })
);

// =============================================================================
// COMPOSE DOCUMENT
// =============================================================================
const doc = new Document({
  creator: ORG,
  title: `เอกสารตรวจรับ ${PROJECT_NAME}`,
  description: `เอกสารตรวจรับและส่งมอบงาน ภายใต้ TOR: ${TOR_NAME}`,
  styles: {
    default: { document: { run: { font: FONT, size: 28 } } },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 40, bold: true, font: FONT, color: "1B4F72" },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: "2E86C1" },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1200, bottom: 1200, left: 1440 },
        },
      },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children,
    },
  ],
});

const OUT_FILE = path.join(__dirname, `เอกสารตรวจรับ-Dashboard-ใต้ร่ม-ปี69-v${VERSION}.docx`);

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT_FILE, buf);
  const sizeMB = (buf.length / 1024 / 1024).toFixed(2);
  console.log(`✅ สร้างเอกสารเรียบร้อย`);
  console.log(`📄 ไฟล์: ${OUT_FILE}`);
  console.log(`📦 ขนาด: ${sizeMB} MB`);
});
