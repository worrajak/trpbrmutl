/**
 * แผนความเป็นเลิศ มทร.ล้านนา — KPI ที่ "ใต้ร่มพระบารมี" ตอบสนอง
 *
 * Source: PerformanceEvaluation-System (สถช.) · KPI_Analysis.md
 * เลือกเฉพาะ KPI ที่กลุ่มแผนงานใต้ร่มพระบารมีรับผิดชอบโดยตรง
 * หรือสนับสนุนผ่านโครงการ (จาก ง9 + Excel ERP)
 *
 * Auto-classify โครงการเข้า KPI ด้วย keyword matching
 * Admin override ได้ผ่าน /admin/projects → field excellence_kpis
 */

export type KpiCategory = "ktpp" | "edpex_71_a" | "edpex_71_c" | "edpex_72_a";

export interface ExcellenceKpi {
  code: string; // รหัสในเอกสาร (6, 15, 35, 7.1ก-1, ...)
  name: string;
  unit: string; // หน่วยนับ
  target_university: number | null; // เป้า มทร.
  target_team: number | null; // เป้าทีมใต้ร่มพระบารมี
  responsible: string;
  category: KpiCategory;
  category_label: string;
  // Auto-classify keywords (ในชื่อโครงการ + organization)
  keywords: string[];
  description?: string;
  color: string; // สี Tailwind
  icon: string;
}

export const EXCELLENCE_KPIS: ExcellenceKpi[] = [
  // ===== ค.ต.ป. (คำรับรองปฏิบัติราชการ) =====
  {
    code: "40",
    name: "องค์ความรู้แปลงสู่ชุมชน",
    unit: "เรื่อง",
    target_university: 100,
    target_team: 20,
    responsible: "ทีมงานใต้ร่มพระบารมี",
    category: "ktpp",
    category_label: "ค.ต.ป.",
    keywords: [
      "องค์ความรู้",
      "ถ่ายทอด",
      "ชุมชน",
      "หลักสูตร",
      "อบรม",
      "พัฒนา",
      "ฝึกอบรม",
    ],
    description: "องค์ความรู้ที่ทีมใต้ร่มพระบารมีแปลงสู่ชุมชน/สังคม",
    color: "from-rose-500 to-pink-600",
    icon: "📚",
  },
  {
    code: "36",
    name: "แหล่งเรียนรู้ตลอดชีวิต",
    unit: "แห่ง",
    target_university: 15,
    target_team: 1,
    responsible: "สิงหล/คเชนทร์/เอกพงษ์",
    category: "ktpp",
    category_label: "ค.ต.ป.",
    keywords: [
      "ศูนย์เรียนรู้",
      "ศูนย์การเรียนรู้",
      "lifelong",
      "เรียนรู้ตลอดชีวิต",
      "พิพิธภัณฑ์",
    ],
    color: "from-amber-500 to-orange-600",
    icon: "🏛",
  },
  {
    code: "38",
    name: "สถานประกอบการที่ได้รับถ่ายทอดเทคโน",
    unit: "สถาน",
    target_university: 100,
    target_team: null,
    responsible: "หนึ่งฤทัย",
    category: "ktpp",
    category_label: "ค.ต.ป.",
    keywords: [
      "สถานประกอบการ",
      "ผู้ประกอบการ",
      "วิสาหกิจ",
      "SME",
      "อุตสาหกรรม",
      "ถ่ายทอดเทคโนโลยี",
    ],
    color: "from-violet-500 to-purple-600",
    icon: "🏭",
  },
  {
    code: "35",
    name: "บุคลากรนำเทคโนโลยีพัฒนาชุมชน",
    unit: "อาจารย์",
    target_university: 400,
    target_team: null,
    responsible: "คณะ/วทส/พื้นที่",
    category: "ktpp",
    category_label: "ค.ต.ป.",
    keywords: [
      "อาจารย์",
      "บุคลากร",
      "เทคโนโลยี",
      "นวัตกรรม",
      "พัฒนา",
    ],
    color: "from-cyan-500 to-blue-600",
    icon: "👨‍🏫",
  },
  {
    code: "15",
    name: "ระบบนิเวศวิจัย+นวัตกรรม",
    unit: "Ecosystem",
    target_university: 5,
    target_team: 1,
    responsible: "วิษณุลักษณ์",
    category: "ktpp",
    category_label: "ค.ต.ป.",
    keywords: [
      "ระบบนิเวศ",
      "ecosystem",
      "เครือข่าย",
      "platform",
      "แพลตฟอร์ม",
    ],
    color: "from-teal-500 to-emerald-600",
    icon: "🌐",
  },
  {
    code: "6",
    name: "หลักสูตรระยะสั้น (Up/Re/New-Skill)",
    unit: "หลักสูตร",
    target_university: 20,
    target_team: 3,
    responsible: "วธัญญู/ศราวุธ/สิงหล/คเชนทร์",
    category: "ktpp",
    category_label: "ค.ต.ป.",
    keywords: [
      "หลักสูตร",
      "อบรม",
      "upskill",
      "reskill",
      "new skill",
      "non-degree",
    ],
    color: "from-indigo-500 to-blue-600",
    icon: "🎓",
  },
  // ===== EdPEx หมวด 7.1 ก. (ผลสัมฤทธิ์ด้านบริการวิชาการ) =====
  {
    code: "7.1ก-1",
    name: "ชุมชนที่ได้รับการถ่ายทอด",
    unit: "ชุมชน",
    target_university: 40,
    target_team: 14,
    responsible: "หนึ่งฤทัย",
    category: "edpex_71_a",
    category_label: "EdPEx 7.1ก",
    keywords: [
      "ชุมชน",
      "หมู่บ้าน",
      "ตำบล",
      "อบต",
      "เทศบาล",
    ],
    color: "from-emerald-500 to-green-600",
    icon: "🏘",
  },
  {
    code: "7.1ก-2",
    name: "ภาคีเครือข่ายภายนอก",
    unit: "หน่วยงาน",
    target_university: 40,
    target_team: 28,
    responsible: "เสาวลักษณ์",
    category: "edpex_71_a",
    category_label: "EdPEx 7.1ก",
    keywords: [
      "ภาคีเครือข่าย",
      "เครือข่าย",
      "ความร่วมมือ",
      "มูลนิธิ",
      "MOU",
    ],
    color: "from-blue-500 to-cyan-600",
    icon: "🤝",
  },
  {
    code: "7.1ก-3",
    name: "ผู้เข้าอบรมเซรามิก/ฝึกอาชีพ",
    unit: "คน",
    target_university: 500,
    target_team: 100,
    responsible: "สิงหล/คเชนทร์",
    category: "edpex_71_a",
    category_label: "EdPEx 7.1ก",
    keywords: [
      "เซรามิก",
      "ceramic",
      "ฝึกอาชีพ",
      "ฝึกทักษะ",
      "หัตถกรรม",
      "ดอกไม้",
      "งานหัตถ",
    ],
    color: "from-pink-500 to-rose-600",
    icon: "🏺",
  },
  {
    code: "7.1ก-4",
    name: "ประชาชนที่รับการอบรม/ถ่ายทอดทั่วไป",
    unit: "คน",
    target_university: 1000,
    target_team: 1000,
    responsible: "วธัญญู/ศราวุธ/สิงหล/คเชนทร์",
    category: "edpex_71_a",
    category_label: "EdPEx 7.1ก",
    keywords: [
      "ประชาชน",
      "อบรม",
      "ถ่ายทอด",
      "เกษตรกร",
      "ผู้สนใจ",
    ],
    color: "from-yellow-500 to-amber-600",
    icon: "👥",
  },
  // ===== EdPEx หมวด 7.1 ค. =====
  {
    code: "7.1ค-3",
    name: "โครงการถ่ายทอดองค์ความรู้+นวัตกรรม",
    unit: "โครงการ",
    target_university: 40,
    target_team: 10,
    responsible: "เสงี่ยม",
    category: "edpex_71_c",
    category_label: "EdPEx 7.1ค",
    keywords: [
      "นวัตกรรม",
      "เทคโนโลยี",
      "วิจัย",
      "องค์ความรู้",
    ],
    color: "from-purple-500 to-fuchsia-600",
    icon: "💡",
  },
  // ===== EdPEx หมวด 7.2 ก. =====
  {
    code: "7.2ก-4",
    name: "ลูกค้าเก่ากลับมาใช้บริการ",
    unit: "%",
    target_university: 90,
    target_team: 100,
    responsible: "หนึ่งฤทัย",
    category: "edpex_72_a",
    category_label: "EdPEx 7.2ก",
    keywords: ["บริการต่อเนื่อง", "ลูกค้าประจำ"],
    color: "from-orange-500 to-red-600",
    icon: "🔁",
  },
];

/** จัด KPI เข้าหมวด */
export function getKpisByCategory(): Record<string, ExcellenceKpi[]> {
  const groups: Record<string, ExcellenceKpi[]> = {};
  for (const k of EXCELLENCE_KPIS) {
    const key = k.category_label;
    if (!groups[key]) groups[key] = [];
    groups[key].push(k);
  }
  return groups;
}

/**
 * Auto-classify โครงการเข้า KPI ด้วย keyword matching
 * Returns: array of KPI codes ที่โครงการนี้สนับสนุน
 */
export function classifyProject(text: {
  project_name?: string | null;
  organization?: string | null;
  responsible?: string | null;
  main_program?: string | null;
}): string[] {
  const haystack = [
    text.project_name || "",
    text.organization || "",
    text.responsible || "",
    text.main_program || "",
  ]
    .join(" ")
    .toLowerCase();

  const matched: string[] = [];
  for (const kpi of EXCELLENCE_KPIS) {
    if (kpi.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      matched.push(kpi.code);
    }
  }
  return matched;
}

/**
 * นับโครงการต่อ KPI (สำหรับ dashboard)
 * - Auto-classify ทุกโครงการ → return Map<kpi_code, count>
 */
export function countProjectsByKpi(
  projects: Array<{
    project_name?: string | null;
    organization?: string | null;
    responsible?: string | null;
    main_program?: string | null;
    excellence_kpis?: string[] | null;
  }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of projects) {
    // ถ้า admin override แล้ว ใช้ของนั้น มิฉะนั้น auto-classify
    const codes =
      p.excellence_kpis && p.excellence_kpis.length > 0
        ? p.excellence_kpis
        : classifyProject(p);
    for (const c of codes) {
      counts[c] = (counts[c] || 0) + 1;
    }
  }
  return counts;
}
