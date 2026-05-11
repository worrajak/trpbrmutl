/**
 * Researcher Tags — preset 20 tags + custom field
 *
 * แบ่งเป็น 4 หมวด หมวดละ 5 tag — ตรงกับ KPI ของแผน 1-3
 *  A. เทคโนโลยี (Tech) — ตอบ KPI #19-22 (ผลักดันเทคโน)
 *  B. นวัตกรรมสายอาชีพ (Innovation) — ตอบ KPI #38, #6, #7.1ก-3
 *  C. การเรียน-การสอน (Teaching) — ตอบ KPI #6, #36
 *  D. การพัฒนาชุมชน (Community) — ตอบ KPI #40, #7.1ก-1, #41
 *
 * Tag = slug (snake-kebab case) สำหรับ DB, label = ภาษาไทยสำหรับ UI
 */

export type TagCategory = "tech" | "innovation" | "teaching" | "community";

export interface ExpertiseTag {
  slug: string;
  label: string;
  category: TagCategory;
  emoji: string;
  color: string; // tailwind: bg-* + text-* + ring-*
  /** KPI codes ที่ tag นี้น่าจะตอบได้ */
  relatedKpis?: string[];
}

const TAG_COLOR: Record<TagCategory, string> = {
  tech: "bg-blue-50 text-blue-800 ring-blue-200",
  innovation: "bg-rose-50 text-rose-800 ring-rose-200",
  teaching: "bg-violet-50 text-violet-800 ring-violet-200",
  community: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export const EXPERTISE_TAGS: ExpertiseTag[] = [
  // ===== A. เทคโนโลยี (5) =====
  {
    slug: "precision-ag",
    label: "เกษตรแม่นยำ",
    category: "tech",
    emoji: "🌾",
    color: TAG_COLOR.tech,
    relatedKpis: ["19", "21", "38"],
  },
  {
    slug: "iot-sensor",
    label: "IoT / Sensor",
    category: "tech",
    emoji: "📡",
    color: TAG_COLOR.tech,
    relatedKpis: ["19", "21"],
  },
  {
    slug: "ai-ml",
    label: "AI / Machine Learning",
    category: "tech",
    emoji: "🤖",
    color: TAG_COLOR.tech,
    relatedKpis: ["19", "20"],
  },
  {
    slug: "robotics",
    label: "Robotics / Automation",
    category: "tech",
    emoji: "⚙",
    color: TAG_COLOR.tech,
    relatedKpis: ["19", "21"],
  },
  {
    slug: "blockchain",
    label: "Blockchain / Smart Contract",
    category: "tech",
    emoji: "⛓",
    color: TAG_COLOR.tech,
    relatedKpis: ["19", "22"],
  },

  // ===== B. นวัตกรรมสายอาชีพ (5) =====
  {
    slug: "ceramic-craft",
    label: "เซรามิก / หัตถกรรม",
    category: "innovation",
    emoji: "🏺",
    color: TAG_COLOR.innovation,
    relatedKpis: ["7.1ก-3", "38"],
  },
  {
    slug: "food-processing",
    label: "แปรรูปอาหาร",
    category: "innovation",
    emoji: "🍱",
    color: TAG_COLOR.innovation,
    relatedKpis: ["7.1ก-3", "38", "21"],
  },
  {
    slug: "clean-energy",
    label: "พลังงานสะอาด",
    category: "innovation",
    emoji: "⚡",
    color: TAG_COLOR.innovation,
    relatedKpis: ["19", "13"],
  },
  {
    slug: "product-design",
    label: "การออกแบบผลิตภัณฑ์",
    category: "innovation",
    emoji: "🎨",
    color: TAG_COLOR.innovation,
    relatedKpis: ["38", "7.1ค-3"],
  },
  {
    slug: "smart-building",
    label: "Smart Building / Green Architecture",
    category: "innovation",
    emoji: "🏗",
    color: TAG_COLOR.innovation,
    relatedKpis: ["19", "13"],
  },

  // ===== C. การเรียน-การสอน (5) =====
  {
    slug: "short-course",
    label: "หลักสูตร Up/Re/New-Skill",
    category: "teaching",
    emoji: "🎓",
    color: TAG_COLOR.teaching,
    relatedKpis: ["6"],
  },
  {
    slug: "community-training",
    label: "การฝึกอบรมชุมชน",
    category: "teaching",
    emoji: "👥",
    color: TAG_COLOR.teaching,
    relatedKpis: ["7.1ก-3", "7.1ก-4"],
  },
  {
    slug: "edtech",
    label: "E-Learning / EdTech",
    category: "teaching",
    emoji: "💻",
    color: TAG_COLOR.teaching,
    relatedKpis: ["6", "36"],
  },
  {
    slug: "mentor-coach",
    label: "Mentor / Coach",
    category: "teaching",
    emoji: "🎯",
    color: TAG_COLOR.teaching,
    relatedKpis: ["6", "35"],
  },
  {
    slug: "evaluation",
    label: "การวัดประเมินผล",
    category: "teaching",
    emoji: "📊",
    color: TAG_COLOR.teaching,
    relatedKpis: ["7.1ข-1"],
  },

  // ===== D. การพัฒนาชุมชน (5) =====
  {
    slug: "community-economy",
    label: "เศรษฐกิจชุมชน",
    category: "community",
    emoji: "💼",
    color: TAG_COLOR.community,
    relatedKpis: ["40", "7.1ก-1"],
  },
  {
    slug: "resource-mgmt",
    label: "การจัดการทรัพยากร",
    category: "community",
    emoji: "🌳",
    color: TAG_COLOR.community,
    relatedKpis: ["40", "13"],
  },
  {
    slug: "climate-env",
    label: "Climate / สิ่งแวดล้อม",
    category: "community",
    emoji: "🌍",
    color: TAG_COLOR.community,
    relatedKpis: ["13", "15"],
  },
  {
    slug: "wisdom-culture",
    label: "ภูมิปัญญา / วัฒนธรรม",
    category: "community",
    emoji: "🪔",
    color: TAG_COLOR.community,
    relatedKpis: ["41", "40"],
  },
  {
    slug: "community-engagement",
    label: "Community Engagement",
    category: "community",
    emoji: "🤝",
    color: TAG_COLOR.community,
    relatedKpis: ["7.1ก-1", "40"],
  },
];

/** Lookup tag by slug */
export function getTag(slug: string): ExpertiseTag | undefined {
  return EXPERTISE_TAGS.find((t) => t.slug === slug);
}

/** Group tags ตามหมวด */
export function getTagsByCategory(): Record<TagCategory, ExpertiseTag[]> {
  const groups: Record<TagCategory, ExpertiseTag[]> = {
    tech: [],
    innovation: [],
    teaching: [],
    community: [],
  };
  for (const t of EXPERTISE_TAGS) groups[t.category].push(t);
  return groups;
}

/** Render label จาก slug — ถ้าเป็น custom (ไม่มีใน preset) คืน slug ตรงๆ */
export function renderTag(slug: string): { label: string; color: string; emoji: string } {
  const t = getTag(slug);
  if (t) return { label: t.label, color: t.color, emoji: t.emoji };
  // custom tag fallback
  return {
    label: slug,
    color: "bg-slate-100 text-slate-700 ring-slate-200",
    emoji: "🏷",
  };
}

/** Category label (ภาษาไทย) */
export const CATEGORY_LABEL: Record<TagCategory, string> = {
  tech: "เทคโนโลยี",
  innovation: "นวัตกรรมสายอาชีพ",
  teaching: "การเรียน-การสอน",
  community: "การพัฒนาชุมชน",
};

/** Level metadata */
export const LEVEL_META = {
  junior: { label: "Junior", color: "bg-blue-50 text-blue-700 ring-blue-200", emoji: "🌱" },
  mid: { label: "Mid", color: "bg-amber-50 text-amber-700 ring-amber-200", emoji: "🌿" },
  senior: { label: "Senior", color: "bg-emerald-50 text-emerald-700 ring-emerald-200", emoji: "🌳" },
} as const;

/** 5 sample researchers (admin จะ seed ผ่าน UI ปุ่ม "Seed Sample") */
export interface SampleResearcher {
  name: string;
  title?: string;
  faculty?: string;
  email?: string;
  expertise_tags: string[];
  areas: string[];
  level: "junior" | "mid" | "senior";
  bio?: string;
}

export const SAMPLE_RESEARCHERS: SampleResearcher[] = [
  {
    name: "ผศ.ดร. ตัวอย่าง วิจัย-เกษตรแม่นยำ",
    title: "ผศ.ดร.",
    faculty: "คณะวิศวกรรมศาสตร์",
    email: "sample1@rmutl.ac.th",
    expertise_tags: ["precision-ag", "iot-sensor", "ai-ml"],
    areas: ["เชียงใหม่", "ลำปาง", "พื้นที่สูง"],
    level: "senior",
    bio: "เชี่ยวชาญด้านระบบ IoT + AI สำหรับเกษตรแม่นยำ มีโครงการกับศูนย์โครงการหลวงหลายแห่ง",
  },
  {
    name: "นาย ตัวอย่าง วิจัย-LoRa",
    title: "อาจารย์",
    faculty: "คณะวิศวกรรมศาสตร์",
    email: "sample2@rmutl.ac.th",
    expertise_tags: ["iot-sensor", "clean-energy", "smart-building"],
    areas: ["เชียงราย", "พื้นที่ใต้ร่มฯ"],
    level: "senior",
    bio: "ผู้เชี่ยวชาญเครือข่าย LoRa-mesh สำหรับเตือนภัยและสิ่งแวดล้อม",
  },
  {
    name: "ผศ. ตัวอย่าง วิจัย-แปรรูป",
    title: "ผศ.",
    faculty: "คณะวิทยาศาสตร์และเทคโนโลยีการเกษตร",
    email: "sample3@rmutl.ac.th",
    expertise_tags: ["food-processing", "ceramic-craft", "product-design"],
    areas: ["เชียงราย", "เชียงใหม่"],
    level: "senior",
    bio: "เชี่ยวชาญแปรรูปสินค้าเกษตรภูมิปัญญาท้องถิ่นเป็นผลิตภัณฑ์มูลค่าสูง",
  },
  {
    name: "ดร. ตัวอย่าง วิจัย-Blockchain",
    title: "ดร.",
    faculty: "คณะบริหารธุรกิจและศิลปศาสตร์",
    email: "sample4@rmutl.ac.th",
    expertise_tags: ["blockchain", "edtech", "evaluation"],
    areas: ["เชียงใหม่"],
    level: "senior",
    bio: "วิจัย Blockchain สำหรับระบบรับรองทักษะอาชีพ + EdTech",
  },
  {
    name: "อาจารย์ ตัวอย่าง วิจัย-ชุมชน",
    title: "อาจารย์",
    faculty: "คณะศิลปกรรมและสถาปัตยกรรมศาสตร์",
    email: "sample5@rmutl.ac.th",
    expertise_tags: ["wisdom-culture", "community-economy", "community-engagement"],
    areas: ["พื้นที่ใต้ร่มฯ", "เชียงใหม่"],
    level: "mid",
    bio: "พัฒนาภูมิปัญญาท้องถิ่นและสร้างมูลค่าทางวัฒนธรรมในชุมชนพื้นที่สูง",
  },
];
