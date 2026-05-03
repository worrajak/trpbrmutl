/**
 * Foundation Data — ที่มาและความสำคัญของกลุ่มแผนงานใต้ร่มพระบารมี
 *
 * Source PDFs (ในโฟลเดอร์ /data/):
 *   - แผนงานที่ 1 ผลักดันเทคโนโลยี (2025-04)
 *   - แผนงานที่ 2 พัฒนากำลังคน (2025-04)
 *   - แผนงานที่ 3 ขับเคลื่อนกลไกการพัฒนาองค์ความรู้ (2568-05)
 *
 * ⚠ Note ลำดับ:
 *   ใน DB main_program ลำดับเป็น 1.ผลักดันเทคโน, 2.ขับเคลื่อนกลไก, 3.พัฒนากำลังคน
 *   ใน PDF เอกสาร เรียงเป็น แผน 1 ผลักดันเทคโน, แผน 2 พัฒนากำลังคน, แผน 3 ขับเคลื่อนกลไก
 *   → ใช้ PLAN_TO_DB_PROGRAM map ด้านล่างแปลงสองทิศ
 */

// ========================================================================
// 1. ลำดับ Plan → DB main_program string
// ========================================================================
export const PLAN_TO_DB_PROGRAM: Record<number, string> = {
  1: "1.ผลักดันเทคโนโลยี",
  2: "3.พัฒนากำลังคน", // PDF แผน 2 = DB main_program 3
  3: "2.ขับเคลื่อนกลไก", // PDF แผน 3 = DB main_program 2
};

// ========================================================================
// 2. 5 กรอบที่เรายึด (Frameworks)
// ========================================================================
export interface Framework {
  id: string;
  icon: string;
  name: string;
  shortDesc: string; // 2-3 บรรทัด
  detail: string; // ขยายความเมื่อ hover/expand
  externalLink?: string;
  color: string; // tailwind gradient
  level: number; // 1-5 ตามลำดับ priority (1 = สำคัญสุด)
}

export const FRAMEWORKS: Framework[] = [
  {
    id: "royal-philosophy",
    icon: "👑",
    name: "ศาสตร์พระราชา",
    shortDesc:
      'หลัก "เข้าใจ เข้าถึง พัฒนา" + ปรัชญาเศรษฐกิจพอเพียง 3 ห่วง 2 เงื่อนไข — รากของทุกการดำเนินงาน',
    detail:
      "พระราชดำริของพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร · ปรัชญาเศรษฐกิจพอเพียง: ความพอประมาณ + ความมีเหตุผล + การมีภูมิคุ้มกันที่ดี · เงื่อนไข: ความรู้ + คุณธรรม",
    color: "from-amber-500 via-orange-500 to-red-600",
    level: 1,
  },
  {
    id: "trpb-strategy",
    icon: "🏛",
    name: "ยุทธศาสตร์ใต้ร่มพระบารมี",
    shortDesc:
      "สืบสาน รักษา ต่อยอด · 6 เป้าหมายมูลนิธิโครงการหลวง ระยะ 5 ปี (2566-2570) · พื้นที่สูง+ใต้ร่มพระบารมี",
    detail:
      "1) วิจัย พัฒนา นวัตกรรมที่สร้างรายได้  2) ขับเคลื่อนการจัดตั้งสถาบันการเรียนรู้  3) พัฒนาชุมชนอยู่ดีมีสุข  4) เสริมสร้างอาชีพ+กระจายรายได้  5) พัฒนาระบบจัดการผลผลิต/ตลาด  6) พัฒนาระบบบริหารงาน",
    externalLink: "https://royalprojectthailand.com/",
    color: "from-rose-500 via-pink-500 to-fuchsia-600",
    level: 2,
  },
  {
    id: "rmutl-excellence",
    icon: "🏆",
    name: "แผนความเลิศ มทร.ล้านนา",
    shortDesc:
      "ค.ต.ป. + EdPEx · ยุทธศาสตร์ 2 (วิจัย+นวัตกรรม) และ 5 (สืบสานศาสตร์พระราชา) · KPI 19-22, 37-41",
    detail:
      "ยุทธศาสตร์ 5 กลยุทธ์ 1: ส่งเสริมและพัฒนาชุมชน สืบสาน รักษา ต่อยอด · ตัวชี้วัดที่ 37 (พึงพอใจฐานข้อมูล), 38 (โครงการสนับสนุนอาชีพชุมชน), 39 (Outlet/MarketPlace), 40 (กิจกรรมจิตอาสา), 41 (สื่อองค์ความรู้/ภูมิปัญญา)",
    color: "from-blue-500 via-indigo-500 to-violet-600",
    level: 3,
  },
  {
    id: "ktpp",
    icon: "📋",
    name: "ค.ต.ป. (คำรับรองปฏิบัติราชการ)",
    shortDesc:
      "คำรับรองการปฏิบัติราชการประจำปี · ตัวชี้วัด KPI ระดับสถาบัน · ผูก performance ของกลุ่มแผนงาน",
    detail:
      "ค.ต.ป. = คำรับรองการปฏิบัติราชการ ของผู้บริหารระดับสำนักงาน/สถาบัน · กลุ่มแผนงานใต้ร่มพระบารมีรับผิดชอบหลัก KPI ที่เกี่ยวข้องกับการแปลงองค์ความรู้สู่ชุมชน (KPI #40) และระบบนิเวศวิจัย (KPI #15)",
    externalLink: "/excellence",
    color: "from-emerald-500 via-teal-500 to-cyan-600",
    level: 4,
  },
  {
    id: "sdgs",
    icon: "🌍",
    name: "SDGs (Sustainable Development Goals)",
    shortDesc:
      "10 จาก 17 เป้าหมายโลก · SDG 1, 2, 4, 6, 8, 9, 11, 12, 13, 17 · กรอบสากลของ UN",
    detail:
      "เป้าหมายการพัฒนาที่ยั่งยืน 17 เป้า โดย UN · กลุ่มแผนงานใต้ร่มพระบารมีตอบ 10 เป้า โดยเน้น SDG 4 (การศึกษา), SDG 8 (เศรษฐกิจ), SDG 9 (นวัตกรรม), SDG 11 (เมือง+ชุมชน)",
    externalLink: "/sdgs",
    color: "from-green-500 via-lime-500 to-emerald-600",
    level: 5,
  },
];

// ========================================================================
// 3. 4 มิติผลกระทบ (Impact Dimensions)
// ========================================================================
export interface ImpactDimension {
  id: string;
  icon: string;
  name: string;
  description: string;
  color: string;
  // Field ที่ใช้คำนวณ (จะ inject จากข้อมูลจริง)
  computeStatLabel: (stats: ImpactStats) => string;
}

export interface ImpactStats {
  totalProjects: number;
  totalCommunities: number; // นับจาก site
  totalParticipants: number; // ประชาชน + นศ + บุคลากร
  totalSdgs: number; // unique SDGs ที่ tag
  totalLearningSpaces: number; // จาก KPI หรือ activities
  budgetTotal: number;
}

export const IMPACT_DIMENSIONS: ImpactDimension[] = [
  {
    id: "community",
    icon: "🏘",
    name: "ชุมชน",
    description: "เข้าถึงและพัฒนาชุมชนพื้นที่สูง+ใต้ร่มพระบารมี",
    color: "bg-emerald-50 ring-emerald-200 text-emerald-800",
    computeStatLabel: (s) => `${s.totalProjects} โครงการ · ${s.totalCommunities} พื้นที่`,
  },
  {
    id: "society",
    icon: "👥",
    name: "สังคม",
    description: "ถ่ายทอดสู่ประชาชนทั่วไป + สร้างพื้นที่เรียนรู้",
    color: "bg-blue-50 ring-blue-200 text-blue-800",
    computeStatLabel: (s) =>
      `${s.totalParticipants.toLocaleString()} คน · ${s.totalLearningSpaces} แหล่งเรียนรู้`,
  },
  {
    id: "students-staff",
    icon: "🎓",
    name: "นักศึกษา-บุคลากร",
    description: "การมีส่วนร่วมของอาจารย์ บุคลากร นักศึกษา ลงพื้นที่จริง",
    color: "bg-violet-50 ring-violet-200 text-violet-800",
    computeStatLabel: () => "เป้ารวม 350+ คน · 3 แผน",
  },
  {
    id: "sustainability",
    icon: "♻",
    name: "ยั่งยืน",
    description: "ตอบ SDGs · เน้นต่อยอดเกินปีงบประมาณ",
    color: "bg-amber-50 ring-amber-200 text-amber-800",
    computeStatLabel: (s) => `${s.totalSdgs}/17 SDGs · ${(s.budgetTotal / 1_000_000).toFixed(1)}M งบ`,
  },
];

// ========================================================================
// 4. 3 แผนงานหลัก × Sub-KPIs × Sub-projects
// ========================================================================
export interface PlanKpi {
  id: number;
  name: string;
  unit: string;
  target: number;
  // ทำเครื่องหมาย "highlight" เพื่อแสดงเป็น sub-feature
  highlight?: boolean;
}

export interface SubProject {
  name: string;
  budget: number;
  responsible: string;
  strategy?: string;
}

export interface Plan {
  number: number;
  title: string;
  shortTitle: string;
  budget: number; // บาท
  description: string;
  objective: string; // อิงจากวัตถุประสงค์หลัก
  kpis: PlanKpi[];
  subProjects: SubProject[];
  // อ้างอิงยุทธศาสตร์ มทร. + ตัวชี้วัด
  rmutlStrategies: { name: string; kpiCodes: string[] }[];
  // SDGs ที่ตอบ
  sdgs: number[];
  pdfPath: string; // ลิงก์ไฟล์ PDF
  color: string; // tailwind
}

export const PLANS: Plan[] = [
  {
    number: 1,
    title: "โครงการผลักดันเทคโนโลยี นวัตกรรมสู่ชุมชน ตามเป้าหมายการพัฒนาอย่างยั่งยืน",
    shortTitle: "ผลักดันเทคโนโลยี",
    budget: 2_000_000,
    description:
      "วิจัย+พัฒนาเทคโนโลยี นวัตกรรม สิ่งประดิษฐ์ สำหรับชุมชนพื้นที่สูง+ใต้ร่มพระบารมี · 4 โครงการย่อย · เน้นเกษตรแม่นยำ การแปรรูป ความปลอดภัยผลผลิต",
    objective:
      "ส่งเสริมงานวิจัย+นวัตกรรมที่สอดคล้องกับบริบทของชุมชน · พัฒนาเทคโนโลยีรับมือภัยพิบัติ+สิ่งแวดล้อม · บ่มเพาะกลุ่มอาชีพ/ผู้ประกอบการชุมชน",
    kpis: [
      { id: 1, name: "โครงการวิจัย/บริการวิชาการ ผลักดันเทคโนโลยีสู่ชุมชน", unit: "โครงการ", target: 4 },
      { id: 2, name: "ผลงานวิชาการ/เทคโน/สิ่งประดิษฐ์ในพื้นที่", unit: "ผลงาน", target: 4 },
      { id: 3, name: "ผลงานลดต้นทุน/เพิ่มประสิทธิภาพอาชีพชุมชน", unit: "%", target: 50 },
      { id: 4, name: "สถานประกอบการที่ได้รับถ่ายทอด+ใช้จริง", unit: "%", target: 20 },
      { id: 5, name: "สถานประกอบการที่ยกระดับสมรรถนะ", unit: "%", target: 8 },
      { id: 6, name: "สถานประกอบการที่พัฒนาผลิตภัณฑ์ด้วยสร้างสรรค์", unit: "%", target: 40 },
      { id: 7, name: "สถานประกอบการชุมชน เพิ่มมูลค่า/ลดต้นทุน", unit: "%", target: 10 },
      { id: 8, name: "ประชาชนมีส่วนร่วม", unit: "คน", target: 100, highlight: true },
      { id: 9, name: "อาจารย์/บุคลากร/นักศึกษามีส่วนร่วม", unit: "คน", target: 50, highlight: true },
      { id: 10, name: "แหล่งเรียนรู้/Social Lab", unit: "พื้นที่", target: 1, highlight: true },
    ],
    subProjects: [
      {
        name: "โครงการวิจัยเทคโนโลยี/นวัตกรรมการผลิต และเกษตรแม่นยำ เพื่อเพิ่มประสิทธิภาพการผลิตและลดผลกระทบจากภัยพิบัติ",
        budget: 700_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 1.1 — วิจัย/พัฒนา เทคโนสร้างรายได้",
      },
      {
        name: "โครงการวิจัย พัฒนา เทคโนโลยีและนวัตกรรมการสร้างมูลค่าเพิ่มตลอดห่วงโซ่คุณค่า",
        budget: 500_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 1.1",
      },
      {
        name: "โครงการวิจัยและพัฒนาเทคโนโลยีการแปรรูปเพื่อสร้างมูลค่าเพิ่มสินค้าเกษตรบนพื้นที่สูง",
        budget: 600_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 2.1 — ส่งเสริมอาชีพ+ตลาด",
      },
      {
        name: "โครงการวิจัยและพัฒนา เทคโนโลยีและนวัตกรรม เพื่อพัฒนาระบบบริหารจัดการและความปลอดภัยของผลผลิต",
        budget: 200_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 2.2 — ความปลอดภัยอาหาร",
      },
    ],
    rmutlStrategies: [
      { name: "ยุทธ 2: พัฒนางานวิจัยและนวัตกรรมอย่างมืออาชีพ", kpiCodes: ["19", "20", "21", "22"] },
      { name: "ยุทธ 5: สืบสาน รักษา ต่อยอด ปรัชญาและศาสตร์พระราชา", kpiCodes: ["37", "38", "39", "40", "41"] },
    ],
    sdgs: [2, 4, 8, 9, 12, 13, 17],
    pdfPath: "/data/2025-04-ใต้ร่มพระบารมี 69_แผนงานที่ 1 โครงการผลักดันเทคโนโลยี.pdf",
    color: "from-cyan-500 to-blue-600",
  },
  {
    number: 2,
    title: "โครงการพัฒนากำลังคน",
    shortTitle: "พัฒนากำลังคน",
    budget: 4_000_000,
    description:
      "พัฒนาทักษะอาชีพ + หลักสูตรระยะสั้น+กลาง+ยาว · บ่มเพาะนักวิจัย/บุคลากร/นักศึกษา · ครอบคลุม 6 เขตพื้นที่ของ มทร.ล้านนา · งบสูงสุดของ 3 แผน",
    objective:
      'ส่งเสริมบุคลากร+นักศึกษาในการพัฒนางานวิจัยและสร้างนวัตกรรมขับเคลื่อนการดำเนินงานพื้นที่สูงและพื้นที่สนองงานใต้ร่มพระบารมี ภายใต้แนวคิด "กินได้ ใช้ได้ ขายได้" + แนวคิด "ล้านนาสร้างสรรค์"',
    kpis: [
      { id: 1, name: "โครงการสนับสนุนพัฒนากำลังคน/สร้างอาชีพ", unit: "โครงการ", target: 10 },
      { id: 2, name: "ผลงานวิชาการ/เทคโน/สิ่งประดิษฐ์", unit: "ผลงาน", target: 10 },
      { id: 3, name: "เทคโนฯ ลดต้นทุน/เพิ่มประสิทธิภาพ", unit: "%", target: 20 },
      { id: 4, name: "ชุดองค์ความรู้สร้างทักษะอาชีพ", unit: "เรื่อง", target: 5, highlight: true },
      { id: 5, name: "หลักสูตรพัฒนาทักษะอาชีพ", unit: "หลักสูตร", target: 5, highlight: true },
      { id: 6, name: "อาจารย์/บุคลากร/นักศึกษามีส่วนร่วม", unit: "คน", target: 200, highlight: true },
      { id: 7, name: "ประชาชนได้รับพัฒนาทักษะอาชีพ", unit: "คน", target: 200, highlight: true },
      { id: 8, name: "ชุมชนเพิ่มมูลค่า/รายได้สูงขึ้น", unit: "%", target: 8 },
      { id: 9, name: "แหล่งเรียนรู้/Social Lab", unit: "แห่ง", target: 3, highlight: true },
      { id: 10, name: "ความพึงพอใจของผู้ร่วมโครงการ", unit: "%", target: 85 },
    ],
    subProjects: [
      {
        name: "โครงการวิจัยความเข้มแข็งทางสังคม ชุมชน และภูมิปัญญาท้องถิ่นบนพื้นที่สูง",
        budget: 300_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 1.1 — วิจัย+พัฒนาเทคโนสร้างรายได้",
      },
      {
        name: "โครงการพัฒนากระบวนการวิจัยแบบมีส่วนร่วมในระดับพื้นที่",
        budget: 600_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 1.2 — วิจัยแบบมีส่วนร่วมทุกภาคส่วน",
      },
      {
        name: "โครงการส่งเสริมการพัฒนา เทคโนโลยี นวัตกรรม และผลิตภัณฑ์ ภูมิปัญญา/วัฒนธรรมท้องถิ่น (กินได้ ใช้ได้ ขายได้ อยู่ได้)",
        budget: 450_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 2.1 — ส่งเสริมอาชีพ+ตลาด",
      },
      {
        name: "โครงการพัฒนา ต่อยอดภูมิปัญญาและวัฒนธรรมท้องถิ่น สู่งานศิลปาชีพเพื่อสร้างรายได้",
        budget: 200_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 2.1",
      },
    ],
    rmutlStrategies: [
      {
        name: "ยุทธ 5: สืบสาน รักษา ต่อยอด ปรัชญาและศาสตร์พระราชา",
        kpiCodes: ["37", "38", "39", "40", "41"],
      },
    ],
    sdgs: [1, 2, 4, 6, 8, 9, 11, 12, 13, 17],
    pdfPath: "/data/2025-04-ใต้ร่มพระบารมี 69_แผนงานที่ 2 โครงการพัฒนากำลังคน.pdf",
    color: "from-violet-500 to-purple-600",
  },
  {
    number: 3,
    title: "โครงการขับเคลื่อนกลไกการพัฒนาองค์ความรู้เพื่อยกระดับคุณภาพชีวิต",
    shortTitle: "ขับเคลื่อนกลไก",
    budget: 2_000_000,
    description:
      "ขับเคลื่อนกลไกพัฒนาองค์ความรู้ + ศูนย์พัฒนาพันธุ์พืชจักรพันธุ์เพ็ญศิริ + เกษตรทฤษฎีใหม่ + งานรับเสด็จฯ · ผูกตรงกับศาสตร์พระราชา",
    objective:
      "ขับเคลื่อนกลไกการพัฒนาองค์ความรู้และยกระดับคุณภาพชีวิต ในพื้นที่สนองงานใต้ร่มพระบารมีและพื้นที่โดยรอบมหาวิทยาลัย",
    kpis: [
      { id: 1, name: "โครงการสนับสนุนกลไกพัฒนาองค์ความรู้", unit: "โครงการ", target: 4 },
      { id: 2, name: "การพัฒนาองค์ความรู้/แหล่งเรียนรู้สู่ใช้ประโยชน์", unit: "เรื่อง/พื้นที่", target: 2 },
      { id: 3, name: "ประชาชนเข้าร่วม (ฐานศาสตร์พระราชา)", unit: "คน", target: 300, highlight: true },
      { id: 4, name: "อาจารย์/บุคลากร/นักศึกษามีส่วนร่วม", unit: "คน", target: 100, highlight: true },
      { id: 5, name: "โครงการรับเสด็จฯ สมเด็จพระกนิษฐาธิราชเจ้าฯ", unit: "กิจกรรม", target: 2, highlight: true },
    ],
    subProjects: [
      {
        name: "โครงการพัฒนาหลักสูตร องค์ความรู้แบบบูรณาการเพื่อการถ่ายทอดความรู้ SDGs สู่ชุมชน สังคม",
        budget: 250_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 3.1 — เสริมสร้างความเข้มแข็งชุมชน",
      },
      {
        name: "โครงการสนับสนุนการดำเนินงานศูนย์พัฒนาพันธุ์พืชจักรพันธุ์เพ็ญศิริ",
        budget: 450_000,
        responsible: "มทร.ล้านนา เชียงราย/สวก.ลำปาง/กลุ่มแผนงานใต้ร่มฯ",
        strategy: "ยุทธ 3.1",
      },
      {
        name: "โครงการพัฒนาพื้นที่เกษตรทฤษฎีใหม่ ตามหลักปรัชญาเศรษฐกิจพอเพียง",
        budget: 800_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 3.1",
      },
      {
        name: "โครงการเตรียมความพร้อม สร้างคุณค่า และต่อยอดการรับเสด็จอย่างยั่งยืน",
        budget: 500_000,
        responsible: "เปิดรับข้อเสนอโครงการ",
        strategy: "ยุทธ 5.1 — ขับเคลื่อนกลไกปฏิบัติงาน",
      },
    ],
    rmutlStrategies: [
      {
        name: "ยุทธ 5: สืบสาน รักษา ต่อยอด ปรัชญาและศาสตร์พระราชา",
        kpiCodes: ["37", "38", "39", "40", "41"],
      },
    ],
    sdgs: [1, 4, 8, 11, 17],
    pdfPath: "/data/2568-05-ใต้ร่มพระบารมี 69_แผนงานที่ 3 ขับเคลื่อนกลไกการพัฒนาองค์ความรู้.pdf",
    color: "from-emerald-500 to-teal-600",
  },
];

// ========================================================================
// 5. Helpers
// ========================================================================

/** นับโครงการต่อแผน — โดยใช้ map main_program ใน DB */
export function countProjectsPerPlan(
  projects: Array<{ main_program?: string | null }>
): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const p of projects) {
    const mp = p.main_program?.trim() || "";
    for (const planNum of [1, 2, 3]) {
      if (mp === PLAN_TO_DB_PROGRAM[planNum]) {
        counts[planNum]++;
        break;
      }
    }
  }
  return counts;
}

/** คำนวณ ImpactStats จากข้อมูลจริง */
export function computeImpactStats(
  projects: Array<{
    site?: string | null;
    sdg_tags?: number[] | null;
    budget_total?: number | string | null;
  }>
): ImpactStats {
  const sites = new Set<string>();
  const sdgs = new Set<number>();
  let budgetTotal = 0;
  for (const p of projects) {
    const site = (p.site || "").trim();
    if (site) sites.add(site.toLowerCase());
    for (const s of p.sdg_tags || []) sdgs.add(s);
    budgetTotal += Number(p.budget_total || 0);
  }
  // เป้ารวมจาก sub-KPI ทั้ง 3 แผน (highlight rows ที่มี participants/learning space)
  const totalParticipants =
    100 + 50 + // แผน 1
    200 + 200 + // แผน 2
    300 + 100; // แผน 3 = 950
  const totalLearningSpaces = 1 + 3 + 2; // 6 (รวมแผน 3 ที่ count ผ่าน "เรื่อง/พื้นที่")
  return {
    totalProjects: projects.length,
    totalCommunities: sites.size,
    totalParticipants,
    totalSdgs: sdgs.size,
    totalLearningSpaces,
    budgetTotal,
  };
}

/** Build connection table: 3 แผน × KPI ที่ตอบ × กรอบที่อ้างอิง */
export interface ConnectionRow {
  planNumber: number;
  planTitle: string;
  budget: number;
  rmutlKpis: string[]; // codes ของ KPI มทร.
  sdgs: number[];
  frameworks: string[]; // ids ของ framework ที่อ้าง
}

export function buildConnectionTable(): ConnectionRow[] {
  return PLANS.map((p) => ({
    planNumber: p.number,
    planTitle: p.shortTitle,
    budget: p.budget,
    rmutlKpis: p.rmutlStrategies.flatMap((s) => s.kpiCodes),
    sdgs: p.sdgs,
    // ทุกแผนยึด 5 กรอบ (ตามคอนเซ็ปต์ของ /foundation)
    frameworks: ["royal-philosophy", "trpb-strategy", "rmutl-excellence", "ktpp", "sdgs"],
  }));
}
