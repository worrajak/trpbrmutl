/**
 * ร่างหัวข้อโครงการย่อย ง.9 ปีงบประมาณ 2570
 *
 * ที่มา: "ร่างหัวข้อโครงการย่อย-ง9-2570.pdf" (ภาคผนวกประกอบประกาศรับข้อเสนอโครงการย่อย)
 *        โฟลเดอร์ 2026-09-06_แผนงบประมาณ70/ง8-2570-v2/ร่างหัวข้อโครงการย่อย-ง9
 *        ฉบับร่างเพื่อหารือ ปรับปรุง 2 ตุลาคม 2569
 *
 * ⚠️ ยังเป็น "ร่างเพื่อหารือ" ไม่ใช่ประกาศฉบับทางการ — ต้องกำกับคำว่าร่างทุกที่ที่แสดง
 *
 * ⚠️ เลขแผนงานสลับกับปี 2569
 *    2569: ง8-1 ผลักดัน · ง8-2 ขับเคลื่อนองค์ความรู้ · ง8-3 พัฒนากำลังคน
 *    2570: แผนงาน 1 ผลักดัน · แผนงาน 2 พัฒนากำลังคน · แผนงาน 3 ขับเคลื่อนองค์ความรู้
 *    เวลาเทียบสองปีให้จับคู่ด้วย "ชื่อแผนงาน" ไม่ใช่เลข
 *
 * ตรวจแล้ว: 33 การ์ด · รับรวม 61 โครงการ · วงเงินเปิดรับ 6,200,000 บาท
 * ตรงกับหน้าภาพรวมของเอกสารทุกตัว
 */

export interface G9Topic {
  code: string;         // เช่น "1.1.1"
  plan: string;         // "1" | "2" | "3" (เลขแผนงานปี 2570)
  title: string;
  phase: string;        // "3 เดือน" | "6 เดือน" | "10 เดือน"
  months: string;       // ช่วงเดือนที่ดำเนินการ
  slots: number;        // จำนวนโครงการที่เปิดรับในหัวข้อนี้
  budgetEach: number;   // วงเงินต่อโครงการ
  track: string;        // S1 | S2 | S3
  climateCore: boolean; // ภูมิอากาศเป็นสาระหลัก (นับในสัดส่วนร้อยละ 60)
}

/** กรอบงบ ง.8 ปี 2570 รายแผนงาน (จากเอกสาร ง.8 ฉบับเสนอลงนาม) */
export const G9_PLANS: Record<string, { name: string; frame: number }> = {
  "1": { name: "ผลักดันเทคโนโลยี นวัตกรรมสู่ชุมชน", frame: 2000000 },
  "2": { name: "พัฒนากำลังคน สร้างอาชีพ ลดความเหลื่อมล้ำ", frame: 4000000 },
  "3": { name: "ขับเคลื่อนกลไกการพัฒนาองค์ความรู้", frame: 2000000 },
};

export const G9_META = {
  fiscalYear: 2570,
  status: "ร่างเพื่อหารือ",
  revised: "2 ตุลาคม 2569",
  source: "ร่างหัวข้อโครงการย่อย (ง.9) ปีงบประมาณ 2570 — ภาคผนวกประกอบประกาศรับข้อเสนอโครงการย่อย",
  note: "งบใต้ร่มพระบารมีเป็นงบประมาณแผ่นดิน หมวดเงินอุดหนุน ไม่ใช่งบวิจัย เบิกจ่ายตามระเบียบกระทรวงการคลัง",
} as const;

export const G9_TOPICS: G9Topic[] = [
  { code: "1.1.1", plan: "1", title: "เฝ้าระวังไฟป่าและหมอกควันด้วยเซนเซอร์ต้นทุนต่ำ ในพื้นที่โครงการหลวง", phase: "3 เดือน", months: "ธ.ค.–ก.พ.", slots: 2, budgetEach: 80000, track: "S1", climateCore: true },
  { code: "1.1.2", plan: "1", title: "ปรับปรุงเครื่องจักรกลเกษตรขนาดเล็ก ลดแรงงานและการสูญเสียหลังเก็บเกี่ยว", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 2, budgetEach: 120000, track: "S2", climateCore: true },
  { code: "1.1.3", plan: "1", title: "ระบบน้ำและความชื้นดินอัจฉริยะบนพื้นที่สูง รับมือแล้งและฝนทิ้งช่วง", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 1, budgetEach: 200000, track: "S3", climateCore: true },
  { code: "1.2.1", plan: "1", title: "คลินิกเทคโนโลยีและบรรจุภัณฑ์สำหรับวิสาหกิจชุมชน", phase: "3 เดือน", months: "ธ.ค.–ก.พ.", slots: 2, budgetEach: 50000, track: "S1", climateCore: false },
  { code: "1.2.2", plan: "1", title: "ผลิตภัณฑ์ต้นแบบจากพืชทนแล้งและผลผลิตนอกฤดู พร้อมทดสอบตลาด", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 2, budgetEach: 100000, track: "S2", climateCore: true },
  { code: "1.2.3", plan: "1", title: "ยกระดับกลุ่มผู้ผลิตสู่ผู้ประกอบการพื้นที่ด้วยเทคโนโลยีและข้อมูลตลาด", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 1, budgetEach: 200000, track: "S3", climateCore: false },
  { code: "1.3.1", plan: "1", title: "อบแห้งด้วยพลังงานแสงอาทิตย์หรือปั๊มความร้อน ลดการสูญเสียผลผลิต", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 3, budgetEach: 80000, track: "S1", climateCore: true },
  { code: "1.3.2", plan: "1", title: "แปรรูปและยืดอายุผลผลิตพื้นที่สูง สู่การยื่นจดทรัพย์สินทางปัญญา", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 1, budgetEach: 160000, track: "S3", climateCore: true },
  { code: "1.4.1", plan: "1", title: "ชุดตรวจคุณภาพและสารตกค้างอย่างง่าย พร้อมอบรมกลุ่มเกษตรกร", phase: "3 เดือน", months: "ธ.ค.–ก.พ.", slots: 2, budgetEach: 50000, track: "S1", climateCore: false },
  { code: "1.4.2", plan: "1", title: "ระบบตรวจย้อนกลับผลผลิตบนแพลตฟอร์มดิจิทัล", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 1, budgetEach: 100000, track: "S2", climateCore: false },
  { code: "2.1.1", plan: "2", title: "สำรวจโจทย์อาชีพและความเสี่ยงภัยภูมิอากาศของชุมชนแบบมีส่วนร่วม ป้อนข้อมูล LifeDB", phase: "3 เดือน", months: "ธ.ค.–ก.พ.", slots: 4, budgetEach: 50000, track: "S1", climateCore: true },
  { code: "2.1.2", plan: "2", title: "สืบสานภูมิปัญญาท้องถิ่นด้วยการวิจัยแบบมีส่วนร่วม สู่ชุดองค์ความรู้", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 2, budgetEach: 100000, track: "S2", climateCore: false },
  { code: "2.1.3", plan: "2", title: "ชุมชนพื้นที่สูงเข้มแข็งรับมือภัยภูมิอากาศ แผนชุมชนและทักษะรับมือ", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 1, budgetEach: 200000, track: "S3", climateCore: true },
  { code: "2.2.1", plan: "2", title: "หลักสูตรระยะสั้นอาชีพทางเลือกช่วงแล้งและหลังน้ำหลาก", phase: "3 เดือน", months: "", slots: 5, budgetEach: 80000, track: "S1", climateCore: true },
  { code: "2.2.2", plan: "2", title: "หลักสูตรอาชีพตามมาตรฐานสมรรถนะ ประเมินโดยหน่วยรับรองภายนอก", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 2, budgetEach: 150000, track: "S2", climateCore: false },
  { code: "2.2.3", plan: "2", title: "นักศึกษาลงปฏิบัติงานแก้โจทย์ชุมชนผ่านรายวิชาโครงงานและสหกิจ", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 3, budgetEach: 80000, track: "S1", climateCore: false },
  { code: "2.2.4", plan: "2", title: "ช่างเทคนิคพื้นที่สูงด้านพลังงาน สูบน้ำ และระบบเตือนภัย ต่อยอดหลักสูตรวิศวกรรมพื้นที่สูง", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 2, budgetEach: 200000, track: "S3", climateCore: true },
  { code: "2.2.5", plan: "2", title: "ค่ายอาชีพเยาวชนพื้นที่สูงช่วงปิดภาคเรียน", phase: "3 เดือน", months: "มี.ค.–พ.ค.", slots: 1, budgetEach: 60000, track: "S1", climateCore: false },
  { code: "2.3.1", plan: "2", title: "ออกแบบผลิตภัณฑ์และบรรจุภัณฑ์จากภูมิปัญญาและงานศิลปาชีพ", phase: "3 เดือน", months: "ธ.ค.–ก.พ.", slots: 2, budgetEach: 60000, track: "S1", climateCore: false },
  { code: "2.3.2", plan: "2", title: "ผลิตภัณฑ์ชุมชนสู่มาตรฐานและช่องทางตลาด", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 2, budgetEach: 140000, track: "S2", climateCore: false },
  { code: "2.3.3", plan: "2", title: "บ่มเพาะกลุ่มอาชีพสู่ผู้ประกอบการพื้นที่ที่เลี้ยงตัวได้", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 2, budgetEach: 150000, track: "S2", climateCore: false },
  { code: "2.4.1", plan: "2", title: "ฟื้นฟูระบบพลังงานแสงอาทิตย์ชุมชนเดิม พร้อมอบรมช่างชุมชน", phase: "3 เดือน", months: "ธ.ค.–ก.พ.", slots: 2, budgetEach: 60000, track: "S1", climateCore: false },
  { code: "2.4.2", plan: "2", title: "ระบบเตือนภัยน้ำหลาก ดินถล่ม ไฟป่า ระดับชุมชน พร้อมแผนอพยพ", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 2, budgetEach: 130000, track: "S2", climateCore: true },
  { code: "2.4.3", plan: "2", title: "พลังงานหมุนเวียนเพื่อการผลิตบนพื้นที่สูง สูบน้ำ อบแห้ง เก็บรักษา", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 1, budgetEach: 120000, track: "S2", climateCore: true },
  { code: "3.1.1", plan: "3", title: "สื่อดิจิทัลและคู่มือสั้น ศาสตร์พระราชาด้านการจัดการน้ำและรับมือภัย", phase: "3 เดือน", months: "ธ.ค.–ก.พ.", slots: 2, budgetEach: 50000, track: "S1", climateCore: true },
  { code: "3.1.2", plan: "3", title: "หลักสูตรบูรณาการ SDGs เน้นเป้าหมายที่ 13 สำหรับโรงเรียนและชุมชน", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 2, budgetEach: 100000, track: "S2", climateCore: true },
  { code: "3.2.1", plan: "3", title: "RG4 อนุรักษ์พันธุกรรมและเมล็ดพันธุ์พระราชทานสายพันธุ์ทนแล้ง", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 1, budgetEach: 150000, track: "S3", climateCore: true },
  { code: "3.2.2", plan: "3", title: "RG2 เฝ้าระวังการเจริญเติบโตและสถานีตรวจอากาศ ข้อมูลครบฤดู", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 1, budgetEach: 150000, track: "S2", climateCore: true },
  { code: "3.2.3", plan: "3", title: "RG3 อารักขาพืชและปรับปฏิทินการจัดการแปลงในฤดูและนอกฤดู", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 1, budgetEach: 100000, track: "S2", climateCore: true },
  { code: "3.2.4", plan: "3", title: "RG1 สกัดสารสำคัญจากหางไหลด้วยสนามไฟฟ้า ไม่ใช้ความร้อน", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 1, budgetEach: 100000, track: "S2", climateCore: false },
  { code: "3.3.1", plan: "3", title: "ปรับปรุงแหล่งเรียนรู้เกษตรทฤษฎีใหม่ให้พร้อมขึ้นทะเบียนแหล่งเรียนรู้ตลอดชีวิต", phase: "3 เดือน", months: "ธ.ค.–ก.พ.", slots: 2, budgetEach: 70000, track: "S1", climateCore: true },
  { code: "3.3.2", plan: "3", title: "จัดการน้ำแปลงโคก หนอง นา รับมือแล้งและน้ำหลาก", phase: "6 เดือน", months: "ธ.ค.–พ.ค.", slots: 2, budgetEach: 80000, track: "S1", climateCore: true },
  { code: "3.3.3", plan: "3", title: "ประเมินผลลัพธ์ทางสังคมของแปลงเกษตรทฤษฎีใหม่ ต่อยอดสู่ทุนเชิงพื้นที่", phase: "10 เดือน", months: "ธ.ค.–ก.ย.", slots: 1, budgetEach: 200000, track: "S3", climateCore: false },
];

/** สรุปยอดจากรายการจริง ไม่พิมพ์มือ */
export function summarizeG9() {
  const slots = G9_TOPICS.reduce((s, t) => s + t.slots, 0);
  const budget = G9_TOPICS.reduce((s, t) => s + t.slots * t.budgetEach, 0);
  const climate = G9_TOPICS.filter((t) => t.climateCore).reduce((s, t) => s + t.slots * t.budgetEach, 0);
  const frame = Object.values(G9_PLANS).reduce((s, p) => s + p.frame, 0);

  const byPlan = Object.entries(G9_PLANS).map(([id, p]) => {
    const rows = G9_TOPICS.filter((t) => t.plan === id);
    return {
      id,
      name: p.name,
      frame: p.frame,
      topics: rows.length,
      slots: rows.reduce((s, t) => s + t.slots, 0),
      budget: rows.reduce((s, t) => s + t.slots * t.budgetEach, 0),
    };
  });

  const byPhase = ["3 เดือน", "6 เดือน", "10 เดือน"].map((ph) => ({
    phase: ph,
    slots: G9_TOPICS.filter((t) => t.phase === ph).reduce((s, t) => s + t.slots, 0),
  }));

  return {
    topics: G9_TOPICS.length,
    slots,
    budget,
    frame,
    central: frame - budget,
    climateBudget: climate,
    climatePercent: budget > 0 ? (climate / budget) * 100 : 0,
    byPlan,
    byPhase,
  };
}
