/**
 * research-areas-seed.ts — Sample 14 research areas
 *
 * curated จาก:
 *  - 3 แผนงาน (foundation.ts) + KPI ของแต่ละแผน
 *  - 20 expertise tags (researcher-tags.ts)
 *  - บริบทพื้นที่สูง + ใต้ร่มพระบารมี + โครงการหลวง
 */

export type AreaCategory = "research" | "academic_service" | "expertise" | "other";
export type DemandLevel = "high" | "medium" | "low";

export interface ResearchAreaSeed {
  name: string;
  icon: string;
  category: AreaCategory;
  description: string;
  related_skills: string[];
  related_kpis: string[];
  related_plans: number[];
  demand_level: DemandLevel;
  notes?: string;
}

export const AREA_CATEGORY_META: Record<AreaCategory, { label: string; color: string; emoji: string }> = {
  research: {
    label: "สาขาวิจัย",
    color: "bg-blue-50 text-blue-800 ring-blue-200",
    emoji: "🔬",
  },
  academic_service: {
    label: "งานบริการวิชาการ",
    color: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    emoji: "🤝",
  },
  expertise: {
    label: "ความถนัดเฉพาะทาง",
    color: "bg-violet-50 text-violet-800 ring-violet-200",
    emoji: "💡",
  },
  other: {
    label: "อื่นๆ",
    color: "bg-slate-50 text-slate-800 ring-slate-200",
    emoji: "🎯",
  },
};

export const DEMAND_META: Record<DemandLevel, { label: string; color: string; emoji: string }> = {
  high: { label: "ต้องการสูง", color: "bg-red-50 text-red-700 ring-red-200", emoji: "🔥" },
  medium: { label: "ปานกลาง", color: "bg-amber-50 text-amber-700 ring-amber-200", emoji: "📈" },
  low: { label: "เพิ่มเติม", color: "bg-slate-50 text-slate-700 ring-slate-200", emoji: "🟢" },
};

export const SAMPLE_AREAS: ResearchAreaSeed[] = [
  // ===== แผน 1: ผลักดันเทคโนโลยี =====
  {
    name: "เกษตรแม่นยำสำหรับพืชผลที่สูง",
    icon: "🌾",
    category: "research",
    description: "วิจัย/พัฒนา ระบบ IoT + AI ติดตามแปลงเกษตรพื้นที่สูง · ตอบ KPI #19, #21",
    related_skills: ["precision-ag", "iot-sensor", "ai-ml"],
    related_kpis: ["19", "21", "38"],
    related_plans: [1],
    demand_level: "high",
    notes: "ตรงกับความต้องการของศูนย์โครงการหลวง · มีอุปกรณ์ทดสอบให้",
  },
  {
    name: "ระบบเตือนภัยธรรมชาติด้วย LoRa-Mesh",
    icon: "📡",
    category: "research",
    description: "พัฒนาเครือข่าย sensor ตรวจวัดดิน/น้ำ/ไฟป่า สำหรับชุมชนในพื้นที่ใต้ร่มฯ",
    related_skills: ["iot-sensor", "clean-energy", "smart-building"],
    related_kpis: ["19", "13"],
    related_plans: [1],
    demand_level: "high",
    notes: "ขยายผลโครงการเก่า · มีพื้นที่ทดลอง 3 แห่ง",
  },
  {
    name: "เทคโนโลยีแปรรูปสินค้าเกษตรพื้นที่สูง",
    icon: "🍱",
    category: "research",
    description: "วิจัย/พัฒนาเทคโนแปรรูป กาแฟ ชา สมุนไพร · เพิ่มมูลค่า ลดต้นทุน",
    related_skills: ["food-processing", "product-design"],
    related_kpis: ["7.1ก-3", "38", "21"],
    related_plans: [1],
    demand_level: "high",
  },
  {
    name: "Blockchain ระบบสอบกลับสินค้าเกษตรอินทรีย์",
    icon: "⛓",
    category: "research",
    description: "Track-and-trace ผลผลิต พิสูจน์ source · เพิ่มความเชื่อมั่นผู้บริโภค",
    related_skills: ["blockchain", "iot-sensor"],
    related_kpis: ["19", "20"],
    related_plans: [1],
    demand_level: "medium",
  },
  // ===== แผน 2: พัฒนากำลังคน =====
  {
    name: "หลักสูตร Re-skill ชุมชน — เซรามิก + หัตถกรรม",
    icon: "🏺",
    category: "academic_service",
    description: "พัฒนาหลักสูตรระยะสั้น 30-60 ชม. ฝึกอาชีพให้คนในพื้นที่",
    related_skills: ["short-course", "ceramic-craft", "wisdom-culture"],
    related_kpis: ["6", "7.1ก-3"],
    related_plans: [2],
    demand_level: "high",
    notes: "เป้า 5 หลักสูตร / 100 คน",
  },
  {
    name: "การบ่มเพาะนักวิจัยใหม่ (New Academic Staff)",
    icon: "🌱",
    category: "academic_service",
    description: "ติดตาม mentor บุคลากรใหม่ · workshop + คู่ senior-junior",
    related_skills: ["mentor-coach", "evaluation"],
    related_kpis: ["35"],
    related_plans: [2],
    demand_level: "high",
    notes: "เน้น mentorship mode ใน brief library",
  },
  {
    name: "EdTech Platform สำหรับชุมชน",
    icon: "💻",
    category: "research",
    description: "พัฒนา e-learning platform ที่ใช้บนพื้นที่สูง · offline-first",
    related_skills: ["edtech", "ai-ml", "mentor-coach"],
    related_kpis: ["6", "36"],
    related_plans: [2],
    demand_level: "medium",
  },
  {
    name: "การถ่ายทอดเทคโนโลยีเชิงพาณิชย์",
    icon: "💼",
    category: "academic_service",
    description: "บ่มเพาะวิสาหกิจชุมชน + ผู้ประกอบการเทคโน · ถ่ายทอด IP มหาวิทยาลัย",
    related_skills: ["product-design", "community-economy"],
    related_kpis: ["38", "7.1ค-3"],
    related_plans: [2],
    demand_level: "high",
  },
  // ===== แผน 3: ขับเคลื่อนกลไก =====
  {
    name: "พัฒนาศูนย์เรียนรู้ตามศาสตร์พระราชา",
    icon: "🏛",
    category: "academic_service",
    description: "พัฒนาพื้นที่เรียนรู้ตลอดชีวิต ในชุมชนพื้นที่สูง · เกษตรทฤษฎีใหม่",
    related_skills: ["wisdom-culture", "community-engagement", "resource-mgmt"],
    related_kpis: ["36", "40", "41"],
    related_plans: [3],
    demand_level: "high",
    notes: "ผูกกับศูนย์พัฒนาพันธุ์พืชจักรพันธุ์เพ็ญศิริ + เกษตรทฤษฎีใหม่",
  },
  {
    name: "รับเสด็จฯ + ถ่ายทอดศาสตร์พระราชา",
    icon: "👑",
    category: "academic_service",
    description: "เตรียมความพร้อม สร้างคุณค่า ต่อยอดการรับเสด็จ · งานสำคัญที่สุดของกลุ่ม",
    related_skills: ["community-engagement", "wisdom-culture"],
    related_kpis: ["40", "41"],
    related_plans: [3],
    demand_level: "high",
  },
  {
    name: "การพัฒนาภูมิปัญญา → งานศิลปาชีพ",
    icon: "🪔",
    category: "research",
    description: "ต่อยอดภูมิปัญญาท้องถิ่น เป็นผลิตภัณฑ์มูลค่าสูง สร้างรายได้ชุมชน",
    related_skills: ["wisdom-culture", "product-design", "ceramic-craft"],
    related_kpis: ["41", "40", "7.1ก-3"],
    related_plans: [2, 3],
    demand_level: "medium",
  },
  // ===== ความถนัดทั่วไป =====
  {
    name: "Climate Action + การจัดการสิ่งแวดล้อม",
    icon: "🌍",
    category: "expertise",
    description: "งานวิจัย climate change · พลังงานสะอาด · ลดคาร์บอนชุมชน",
    related_skills: ["climate-env", "clean-energy", "resource-mgmt"],
    related_kpis: ["13", "15"],
    related_plans: [1, 3],
    demand_level: "medium",
  },
  {
    name: "การวิเคราะห์ข้อมูลพื้นที่ (GIS + Remote Sensing)",
    icon: "🗺",
    category: "expertise",
    description: "ใช้ดาวเทียม + drone + GIS ติดตามการเปลี่ยนแปลงพื้นที่",
    related_skills: ["ai-ml", "iot-sensor", "resource-mgmt"],
    related_kpis: ["19", "13"],
    related_plans: [1],
    demand_level: "low",
    notes: "เพิ่งเริ่มต้น · มี dataset แล้ว",
  },
  {
    name: "Community Engagement + Action Research",
    icon: "🤝",
    category: "expertise",
    description: "งานวิจัยแบบมีส่วนร่วม · เก็บข้อมูลชุมชน · pilot กิจกรรม",
    related_skills: ["community-engagement", "evaluation"],
    related_kpis: ["7.1ก-1", "40"],
    related_plans: [2, 3],
    demand_level: "high",
  },
];
