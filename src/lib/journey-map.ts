/**
 * Journey map — ผลงานรายปีบนแผนที่: ปีไหน ทำอะไร ที่ไหน ใครเป็นหัวหน้าโครงการ
 *
 * ใช้คู่กับหน้า /journey และเสริมแผนที่เดิมใน /map
 * ทุกรายการมาจากเอกสาร ไม่เดา — ถ้าเอกสารไม่ระบุหัวหน้าโครงการ ใช้ "กลุ่มแผนงานใต้ร่มพระบารมี"
 * ถ้าเอกสารไม่ระบุพื้นที่รายศูนย์ (เช่น "38 สถานี") ไม่ปักหมุด แต่ยังแสดงในรายการรายปี
 *
 * แหล่ง
 *   [PURPLE] "สรุปผลการดำเนินงานสนับสนุนงานมูลนิธิโครงการหลวง 2550–2555" (เล่มม่วง) — รหัส [A-A3-1] ฯลฯ
 *   [V3]     "สรุปโครงการตามปีงบประมาณ - V3.xlsx" — มีชื่อผู้รับผิดชอบเฉพาะปี 2550–2551
 *   [Y56]    "สรุปงบประมาณโครงการประจำปี 2556.xlsx" — รายการเดินทางระบุพื้นที่
 *   [Y60]    "ผลการดำเนินงานสนับสนุนมูลนิธิโครงการหลวง เดือนมกราคม 2560"
 *   [DB]     ฐานข้อมูลระบบติดตามโครงการ ปีงบ 2569 (เฉพาะโครงการที่ชื่อหรือ site ระบุพื้นที่)
 *
 * พิกัด
 *   ศูนย์/สถานีโครงการหลวง 28 แห่ง → data/royal-project-stations.csv (ผู้ใช้ให้มา 16 ต.ค. 2569)
 *   ที่เหลือ → ค้นจาก OpenStreetMap (Nominatim) 16 ต.ค. 2569
 *   precise=true  → ตำแหน่งของศูนย์/สถานที่นั้นเอง
 *   precise=false → ไม่มีพิกัดรายศูนย์ ใช้จุดกลางอำเภอแทน (แสดงคำเตือนใน popup)
 */

export const LEAD_FALLBACK = "กลุ่มแผนงานใต้ร่มพระบารมี";

export type JourneySource = "PURPLE" | "V3" | "Y56" | "Y60" | "DB";

export const JOURNEY_SOURCES: Record<JourneySource, string> = {
  PURPLE: "เล่มสรุปผลการดำเนินงาน 2550–2555 (เล่มม่วง)",
  V3: "สรุปโครงการตามปีงบประมาณ (V3)",
  Y56: "สรุปงบประมาณโครงการประจำปี 2556",
  Y60: "สรุปผลการดำเนินงาน มกราคม 2560",
  DB: "ฐานข้อมูลระบบติดตามโครงการ ปี 2569",
};

export interface JourneyPlace {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  precise: boolean;
}

export const JOURNEY_PLACES: JourneyPlace[] = [
  { id: "angkhang", name: "สถานีเกษตรหลวงอ่างขาง", province: "เชียงใหม่", lat: 19.9019, lng: 99.0399, precise: true },
  { id: "huailuek", name: "ศูนย์พัฒนาโครงการหลวงห้วยลึก", province: "เชียงใหม่", lat: 19.5314, lng: 99.0549, precise: true },
  { id: "nongkhiao", name: "ศูนย์พัฒนาโครงการหลวงหนองเขียว", province: "เชียงใหม่", lat: 19.6841, lng: 98.8214, precise: true },
  { id: "kaenoi", name: "ศูนย์พัฒนาโครงการหลวงแกน้อย", province: "เชียงใหม่", lat: 19.6787, lng: 98.7905, precise: true },
  { id: "mokcham", name: "ศูนย์พัฒนาโครงการหลวงหมอกจ๋าม", province: "เชียงใหม่", lat: 20.0541, lng: 99.2141, precise: true },
  { id: "nonghoi", name: "ศูนย์พัฒนาโครงการหลวงหนองหอย", province: "เชียงใหม่", lat: 18.9312, lng: 98.8241, precise: true },
  { id: "maesamai", name: "ศูนย์พัฒนาโครงการหลวงแม่สาใหม่", province: "เชียงใหม่", lat: 18.9321, lng: 98.8954, precise: true },
  { id: "maelod", name: "ศูนย์พัฒนาโครงการหลวงแม่หลอด", province: "เชียงใหม่", lat: 19.1542, lng: 98.7412, precise: true },
  { id: "thungroeng", name: "ศูนย์พัฒนาโครงการหลวงทุ่งเริง", province: "เชียงใหม่", lat: 18.7891, lng: 98.8324, precise: true },
  { id: "thungrao", name: "ศูนย์พัฒนาโครงการหลวงทุ่งเรา", province: "เชียงใหม่", lat: 18.9102, lng: 98.8541, precise: true },
  { id: "pangda", name: "สถานีเกษตรหลวงปางดะ", province: "เชียงใหม่", lat: 18.8789, lng: 98.6653, precise: true },
  { id: "watchan", name: "ศูนย์พัฒนาโครงการหลวงวัดจันทร์", province: "เชียงใหม่", lat: 19.1214, lng: 98.1542, precise: true },
  { id: "inthanon", name: "สถานีเกษตรหลวงอินทนนท์", province: "เชียงใหม่", lat: 18.5531, lng: 98.5242, precise: true },
  { id: "khunwang", name: "ศูนย์พัฒนาโครงการหลวงขุนวาง", province: "เชียงใหม่", lat: 18.4902, lng: 98.5083, precise: true },
  { id: "maehae", name: "ศูนย์พัฒนาโครงการหลวงแม่แฮ", province: "เชียงใหม่", lat: 18.5214, lng: 98.3214, precise: true },
  { id: "khunpae", name: "ศูนย์พัฒนาโครงการหลวงขุนแปะ", province: "เชียงใหม่", lat: 18.3116, lng: 98.4801, precise: true },
  { id: "thungluang", name: "ศูนย์พัฒนาโครงการหลวงทุ่งหลวง", province: "เชียงใหม่", lat: 18.8241, lng: 98.5982, precise: true },
  { id: "khunhuaihaeng", name: "ศูนย์พัฒนาโครงการหลวงขุนห้วยแห้ง", province: "เชียงใหม่", lat: 18.5739, lng: 98.3593, precise: false },
  { id: "maesapok", name: "ศูนย์พัฒนาโครงการหลวงแม่สะป๊อก", province: "เชียงใหม่", lat: 18.7841, lng: 98.5841, precise: true },
  { id: "monngo", name: "ศูนย์พัฒนาโครงการหลวงม่อนเงาะ", province: "เชียงใหม่", lat: 19.1245, lng: 98.7854, precise: true },
  { id: "huainamkhun", name: "ศูนย์พัฒนาโครงการหลวงห้วยน้ำขุ่น", province: "เชียงราย", lat: 19.5214, lng: 99.5412, precise: true },
  { id: "huaisompoi", name: "ศูนย์พัฒนาโครงการหลวงห้วยส้มป่อย", province: "เชียงใหม่", lat: 18.4521, lng: 98.5421, precise: true },
  { id: "huaisiao", name: "ศูนย์พัฒนาโครงการหลวงห้วยเสี้ยว", province: "เชียงใหม่", lat: 18.7421, lng: 98.8741, precise: true },
  { id: "maepunluang", name: "ศูนย์พัฒนาโครงการหลวงแม่ปูนหลวง", province: "เชียงใหม่", lat: 19.333, lng: 99.3139, precise: true },
  { id: "huainamrin", name: "ศูนย์พัฒนาโครงการหลวงห้วยน้ำริน", province: "เชียงราย", lat: 19.3214, lng: 99.5214, precise: true },
  { id: "sango", name: "ศูนย์พัฒนาโครงการหลวงสะโง๊ะ", province: "เชียงราย", lat: 20.3214, lng: 100.0214, precise: true },
  { id: "phatang", name: "ศูนย์พัฒนาโครงการหลวงผาตั้ง", province: "เชียงราย", lat: 20.3541, lng: 100.2145, precise: true },
  { id: "huailaeng", name: "ศูนย์พัฒนาโครงการหลวงห้วยแล้ง", province: "เชียงราย", lat: 20.2841, lng: 100.3542, precise: true },
  { id: "pangkha", name: "ศูนย์พัฒนาโครงการหลวงปังค่า", province: "พะเยา", lat: 19.4521, lng: 100.3214, precise: true },
  { id: "chakkraphan", name: "ศูนย์พัฒนาพันธุ์พืชจักรพันธ์เพ็ญศิริ", province: "เชียงราย", lat: 20.4398, lng: 99.883, precise: false },
  { id: "factory1", name: "โรงงานหลวงอาหารสำเร็จรูปที่ 1 (ฝาง)", province: "เชียงใหม่", lat: 19.9098, lng: 99.1393, precise: false },
  { id: "factory2", name: "โรงงานหลวงอาหารสำเร็จรูปที่ 2 (แม่จัน)", province: "เชียงราย", lat: 20.1471, lng: 99.8532, precise: false },
  { id: "omkoi", name: "อำเภออมก๋อย (ศศช.แม่ฟ้าหลวง)", province: "เชียงใหม่", lat: 17.6451, lng: 98.3157, precise: false },
  { id: "maetuen", name: "บ้านแม่ตื่น อ.อมก๋อย", province: "เชียงใหม่", lat: 17.4021, lng: 98.4577, precise: true },
  { id: "banyang", name: "บ้านยาง ต.แม่งอน อ.ฝาง", province: "เชียงใหม่", lat: 19.9098, lng: 99.1393, precise: false },
  { id: "boklua", name: "อำเภอบ่อเกลือ", province: "น่าน", lat: 19.1259, lng: 101.1637, precise: false },
  { id: "phufa", name: "ศูนย์ภูฟ้าพัฒนา อ.บ่อเกลือ", province: "น่าน", lat: 19.1259, lng: 101.1637, precise: false },
  { id: "khunnamsanian", name: "ศูนย์การเรียนรู้ขุนน้ำสะเนียน อ.เมืองน่าน", province: "น่าน", lat: 18.865, lng: 100.6596, precise: false },
  { id: "huaihongkrai", name: "ศูนย์ศึกษาการพัฒนาห้วยฮ่องไคร้ฯ", province: "เชียงใหม่", lat: 18.8781, lng: 99.2183, precise: true },
  { id: "chattrakan", name: "ต.ป่าแดง อ.ชาติตระการ", province: "พิษณุโลก", lat: 17.2754, lng: 100.6016, precise: true },
  { id: "maesariang", name: "อ.แม่สะเรียง", province: "แม่ฮ่องสอน", lat: 18.2968, lng: 97.7668, precise: false },
  { id: "rmutl-nan", name: "มทร.ล้านนา น่าน", province: "น่าน", lat: 18.8111, lng: 100.7902, precise: true },
  { id: "rmutl-cm", name: "มทร.ล้านนา เชียงใหม่", province: "เชียงใหม่", lat: 18.796, lng: 98.9717, precise: true },
  { id: "nan", name: "จังหวัดน่าน", province: "น่าน", lat: 18.865, lng: 100.6596, precise: false },
];

export interface JourneyWork {
  /** ปีงบประมาณ */
  year: number;
  title: string;
  /** ว่าง = เอกสารไม่ระบุพื้นที่รายศูนย์ ไม่ปักหมุด */
  places: string[];
  /** ไม่ระบุ = LEAD_FALLBACK */
  lead?: string;
  budget?: number;
  /** หมายเหตุพื้นที่ที่ปักหมุดไม่ได้ เช่น "และศูนย์/สถานีอีก 34 แห่ง" */
  scope?: string;
  source: JourneySource;
  ref?: string;
}

const STATIONS_19 = [
  "angkhang", "huailuek", "nongkhiao", "kaenoi", "mokcham",
  "nonghoi", "maesamai", "maelod", "thungroeng", "thungrao", "pangda", "watchan",
  "inthanon", "khunwang", "maehae", "khunpae", "thungluang", "khunhuaihaeng", "maesapok",
];
const CHIANGRAI_4 = ["sango", "phatang", "huailaeng", "pangkha"];

export const JOURNEY_WORKS: JourneyWork[] = [
  // ===== 2550–2552 · ทุน มจธ. — ซ่อมบำรุงเชิงป้องกันและโรงงานชา =====
  // ชื่อหัวหน้าโครงการปี 2550–2551 มาจาก [V3] ส่วนรายละเอียดมาจาก [PURPLE]
  { year: 2550, title: "ซ่อมบำรุงเชิงป้องกันเคลื่อนที่ (PM) อบรมช่างประจำศูนย์ 19 ศูนย์ 173 คน", places: STATIONS_19,
    lead: "อ.ยุทธนา สิงห์ประพันธ์ และ อ.เกียรติธนา จะราจา", budget: 1_120_000, source: "PURPLE", ref: "A-A3-1" },
  { year: 2551, title: "ซ่อมบำรุงเชิงป้องกันและวางระบบ TPM ในโรงงานชา", places: ["monngo", "khunwang", "angkhang"],
    lead: "อ.วรจักร์ เมืองใจ และคณะ", budget: 500_000, source: "V3", ref: "A-A3-2" },
  { year: 2552, title: "สนับสนุนโรงงานหลวงอาหารสำเร็จรูป โรงงานชา และศูนย์การเรียนรู้ชุมชนชาวไทยภูเขา ด้านวิศวกรรม พลังงาน สิ่งแวดล้อม",
    places: ["monngo", "khunwang", "angkhang", "huainamkhun", "factory1", "factory2", "omkoi"],
    budget: 1_000_000, scope: "และศูนย์/สถานีรวม 39 แห่ง", source: "PURPLE", ref: "A-A3-6" },
  { year: 2552, title: "ที่ปรึกษามาตรฐาน GMP อาคารคัดบรรจุและระบบบำรุงรักษาทวีผล",
    places: ["maepunluang", "angkhang", "huailuek", "inthanon", "thungluang", "maehae", "nonghoi"],
    budget: 325_600, source: "PURPLE", ref: "A-A4-1" },
  { year: 2552, title: "ประชุมวิชาการ วิศวกรรม พลังงานและสิ่งแวดล้อมเพื่องานเกษตรกรรม ครั้งที่ 1", places: [],
    budget: 500_000, source: "PURPLE", ref: "C-C4-1" },

  // ===== 2553–2555 · งบแผ่นดิน ผ่านส่วนสนับสนุนมูลนิธิโครงการหลวง =====
  { year: 2553, title: "ซ่อมบำรุงเชิงป้องกันและวางแผนการซ่อมบำรุงเคลื่อนที่", places: ["factory1"],
    budget: 500_000, scope: "และศูนย์/สถานีอีก 34 แห่ง", source: "PURPLE", ref: "A-A3-3" },
  { year: 2553, title: "สนับสนุนกิจกรรมโครงการหลวงและโรงงานแปรรูป", places: ["factory1", "factory2"],
    budget: 1_000_000, source: "PURPLE", ref: "A-A3-7" },
  { year: 2554, title: "ซ่อมบำรุงเชิงป้องกันและวางแผนการซ่อมบำรุง", places: [],
    budget: 1_000_000, scope: "ศูนย์/สถานี 38 แห่ง", source: "PURPLE", ref: "A-A3-4" },
  { year: 2554, title: "สนับสนุนกิจกรรมโครงการหลวงและโรงงานหลวงอาหารสำเร็จรูป", places: ["factory1", "factory2"],
    budget: 2_000_000, scope: "และศูนย์/สถานี 39 แห่ง", source: "PURPLE", ref: "A-A3-8" },
  { year: 2554, title: "พัฒนาวิสาหกิจชุมชนภายใต้เศรษฐกิจสองระบบ ชุมชนบ้านยาง", places: ["banyang"],
    budget: 300_000, source: "PURPLE", ref: "C-C4-2" },
  { year: 2554, title: "หมู่บ้านเพาะเลี้ยงปลาพื้นที่สูง บ้านนาบง ต.บ่อเกลือใต้", places: ["boklua"], source: "PURPLE", ref: "C-C3-1" },
  { year: 2554, title: "พัฒนาศักยภาพนักศึกษาทุนในพระราชานุเคราะห์ฯ", places: [], source: "PURPLE", ref: "C-C2-2" },
  { year: 2555, title: "ซ่อมบำรุงเชิงป้องกันและวางแผนการซ่อมบำรุงเคลื่อนที่เพื่อมูลนิธิโครงการหลวง", places: [],
    budget: 2_000_000, scope: "เขตพื้นที่เชียงราย น่าน", source: "PURPLE", ref: "A-A3-5" },
  { year: 2555, title: "สนับสนุนกิจกรรมโครงการหลวงและโรงงานหลวงอาหารสำเร็จรูป", places: ["factory1", "factory2", "omkoi", "boklua"],
    budget: 2_000_000, source: "PURPLE", ref: "A-A3-9" },
  { year: 2555, title: "ระบบจัดการพลังงาน ISO 50001 โรงงานหลวงแม่จัน", places: ["factory2"], budget: 20_000, source: "PURPLE", ref: "A-A3-10" },
  { year: 2555, title: "ปรับปรุงกระบวนการผลิตกลุ่มวิสาหกิจชุมชนแปรรูปผลไม้ บ้านยาง", places: ["banyang"], budget: 101_400, source: "PURPLE", ref: "A-A3-11" },
  { year: 2555, title: "เขียนแผนผังระบบไฟฟ้าภายในศูนย์ฯ เขตเชียงราย–พะเยา", places: CHIANGRAI_4, source: "PURPLE", ref: "A-A4-2" },
  { year: 2555, title: "ก่อสร้างหอพักนักศึกษาทุนพระราชทาน อ.บ่อเกลือ", places: ["boklua"], budget: 3_500_000, source: "PURPLE", ref: "A-A4-3" },
  { year: 2555, title: "เปิดโลกทัศน์ด้านอาชีพและการเรียนต่อของนักเรียนมัธยมปลาย", places: ["boklua"], source: "PURPLE", ref: "C-C2-1" },
  { year: 2555, title: "อบรมการใช้อุปกรณ์สำนักงานด้านคอมพิวเตอร์ ให้เจ้าหน้าที่ศูนย์ฯ", places: CHIANGRAI_4, budget: 25_000, source: "PURPLE", ref: "C-C2-3" },
  { year: 2555, title: "อบรมเพาะชำกล้าไม้และจัดภูมิทัศน์ ศูนย์ภูฟ้า", places: ["phufa"], source: "PURPLE", ref: "C-C3-2" },
  { year: 2555, title: "สร้างอาชีพให้กลุ่มผู้นำเยาวชน อ.อมก๋อย", places: ["omkoi"], budget: 64_730, source: "PURPLE", ref: "C-C3-3" },
  { year: 2555, title: "ส่งเสริมการเรียนรู้เชิงปฏิบัติการด้านทักษะช่างแบบบูรณาการ", places: ["rmutl-nan"], budget: 399_700, source: "PURPLE", ref: "C-C3-4" },
  { year: 2555, title: "หลักสูตรส่งเสริมศักยภาพความเป็นครูมืออาชีพ รุ่นที่ 4", places: ["pangda"], budget: 146_570, source: "PURPLE", ref: "C-C4-3" },
  { year: 2555, title: "สำรวจแผนที่ภูมิประเทศบริเวณศูนย์ฯ", places: ["pangkha"], budget: 17_760, source: "PURPLE", ref: "C-C4-4" },
  { year: 2555, title: "บูรณาการการเรียนการสอนด้านวิจัยและพัฒนาเครื่องจักรกล", places: ["factory1", "factory2", "omkoi", "boklua"],
    budget: 150_000, scope: "และศูนย์/สถานี 38 แห่ง", source: "PURPLE", ref: "C-C4-5" },
  { year: 2555, title: "อบรมการทำตะบันน้ำพื้นที่สูงขนาดเล็ก", places: ["sango"], budget: 20_000, source: "PURPLE", ref: "D-D4-1" },
  { year: 2555, title: "สำรวจและพัฒนาคุณภาพน้ำบริโภค", places: ["huailaeng"], budget: 25_000, source: "PURPLE", ref: "D-D4-2" },
  { year: 2555, title: "ต้นแบบเตาเผาถ่านชีวมวลชนิดแบชท์", places: [], budget: 54_400, source: "PURPLE", ref: "D-D5-1" },
  { year: 2555, title: "ทำถุงแก๊สชีวภาพ", places: ["sango"], budget: 35_000, source: "PURPLE", ref: "D-D5-2" },
  { year: 2555, title: "จัดการพลังงานและแก๊สชีวมวล โรงงานหลวงแม่จัน", places: ["factory2"], budget: 20_000, source: "PURPLE", ref: "D-D5-3" },
  { year: 2555, title: "วิจัยและพัฒนาผลิตภัณฑ์แปรรูปผลผลิตทางการเกษตร บ้านห้วยโป่ง", places: ["omkoi"], budget: 300_000, source: "PURPLE", ref: "E-E1-1" },
  { year: 2555, title: "จัดการองค์ความรู้ระบบการผลิตพืชและแปรรูปอาหาร", places: ["factory1", "factory2", "omkoi", "nan"],
    budget: 100_000, scope: "และศูนย์/สถานี 38 แห่ง", source: "PURPLE", ref: "E-E1-2" },
  { year: 2555, title: "ระบบผลิตน้ำอุปโภคช่วยผู้ประสบอุทกภัยภาคกลาง", places: [], budget: 99_000, source: "PURPLE", ref: "A-A1-1" },

  // ===== 2556 =====
  { year: 2556, title: "ซ่อมบำรุงเชิงป้องกันเคลื่อนที่ (ออกตรวจ PM ตามศูนย์)", places: ["khunwang", "pangda", "thungluang", "huailuek"], source: "Y56" },
  { year: 2556, title: "กังหันน้ำผลิตไฟฟ้าขนาดเล็ก ศูนย์การเรียนรู้ขุนน้ำสะเนียน–ห้วยลู่", places: ["khunnamsanian"], budget: 222_660, source: "Y56" },
  { year: 2556, title: "เตรียมความพร้อมชุมชนเพื่อการท่องเที่ยวเชิงอนุรักษ์ และค่ายทักษะเยาวชน", places: ["boklua"], source: "V3" },
  { year: 2556, title: "ค่ายอาสาพัฒนาทักษะเยาวชน บ้านแม่ตื่น", places: ["maetuen"], source: "V3" },
  { year: 2556, title: "บริหารจัดการ 5ส. ต้นทุนการผลิต และสมรรถนะเครื่องยนต์ใช้แก๊สชีวมวล", places: [], source: "Y56" },

  // ===== 2560 =====
  { year: 2560, title: "วิเคราะห์ปริมาณผลผลิตต่อพื้นที่ของเกษตรกร", places: ["thungluang", "maehae", "nonghoi", "khunwang", "huaisompoi"], source: "Y60" },
  { year: 2560, title: "บำรุงรักษาทวีผล (TPM) โรงชาขุนแม่วาก และโรงชาปงตอง", places: ["khunwang", "monngo"], source: "Y60" },
  { year: 2560, title: "ปรับปรุงโรงเรือนปลูกเห็ดหลินจือ", places: ["monngo"], source: "Y60" },
  { year: 2560, title: "ฐานข้อมูลจัดการพลังงานไฟฟ้าในอาคารผลิตผล", places: ["thungluang"], source: "Y60" },
  { year: 2560, title: "ให้คำปรึกษาปรับภูมิทัศน์สถานี", places: ["pangda"], source: "Y60" },

  // ===== 2569 · เฉพาะโครงการที่ระบุพื้นที่ =====
  { year: 2569, title: "เครื่องสลัดน้ำผักตามอัตลักษณ์ของศูนย์ฯ", places: ["thungluang"], lead: "ผศ.เดือนแรม แพ่งเกี่ยว", budget: 78_580, source: "DB" },
  { year: 2569, title: "ตู้อบลมร้อนดอกเก๊กฮวยระบบปั๊มความร้อน", places: ["pangda"], lead: "ผศ.ดร.ไกรลาศ ดอนชัย", budget: 175_000, source: "DB" },
  { year: 2569, title: "เพิ่มมูลค่าสินค้าเกษตรและพัฒนาสื่อด้วย AI เขตปฏิรูปที่ดิน", places: ["chattrakan"], lead: "อ.สุริยาพร นิพรรัมย์", budget: 50_000, source: "DB" },
  { year: 2569, title: "สนับสนุนการดำเนินงานศูนย์พัฒนาพันธุ์พืชจักรพันธ์เพ็ญศิริ", places: ["chakkraphan"], lead: "รศ.ดร.วิเชษฐ ทิพย์ประเสริฐ", budget: 450_000, source: "DB" },
  { year: 2569, title: "ผลิตเมล็ดพันธุ์และปรับปรุงพันธุ์พืช", places: ["chakkraphan"], lead: "นายศิริชัย แซ่ท้าว", budget: 100_000, source: "DB" },
  { year: 2569, title: "ความเข้มแข็งทางสังคมในการวางแผนการใช้น้ำของชุมชน", places: ["khunpae"], lead: "นายวัชระ กิตติวรเชฏฐ์", budget: 86_720, source: "DB" },
  { year: 2569, title: "ยกระดับห่วงโซ่คุณค่าห้อมพื้นถิ่น สู่ผลิตภัณฑ์ย้อมสีธรรมชาติ", places: ["pangkha"], lead: "ดร.จุฑามาศ ดอนอ่อนเบ้า", budget: 100_000, source: "DB" },
  { year: 2569, title: "สมบัติเชิงกลของเส้นใยกัญชงจากการอบลมร้อน", places: ["huainamrin"], lead: "อ.ธีระยุทธ ขอดแก้ว", budget: 50_000, source: "DB" },
  { year: 2569, title: "ต้นแบบเครื่องนวดงาขี้ม่อน (งาหอม)", places: ["huainamrin"], lead: "ผศ.วรเชษฐ์ หวานเสียง", budget: 174_992, source: "DB" },
  { year: 2569, title: "Royal Rose Sensation Giftset ผลิตภัณฑ์จากสวนกุหลาบหลวง", places: ["thungroeng"], lead: "อ.ณัฐธินี สาลี", budget: 198_159, source: "DB" },
  { year: 2569, title: "เครือข่าย LoRa mesh เตือนภัยธรรมชาติ (ระดับน้ำ ฝุ่นควัน ฝน)", places: ["thungroeng"], lead: "นายณัฐวัฒน์ พัลวัล", budget: 100_000, source: "DB" },
  { year: 2569, title: "เครือข่าย LoRa mesh ตรวจจับความร้อนป้องกันไฟป่า", places: ["huaihongkrai"], lead: "นายณัฐวัฒน์ พัลวัล", budget: 100_000, source: "DB" },
  { year: 2569, title: "เครื่องล้างเมล็ดงาดำแบบกึ่งอัตโนมัติ", places: ["huaisiao"], lead: "ผศ.ขัติพงษ์ จิโนสุวัตร์", budget: 150_000, source: "DB" },
  { year: 2569, title: "สกัดน้ำมันอะโวคาโดด้วยเทคโนโลยีการสกัดแบบไฮดรอลิก", places: ["huaisiao"], lead: "นางสาวพิมลพรรณ เลิศบัวบาน", budget: 133_002, source: "DB" },
  { year: 2569, title: "บำรุงรักษาระบบผลิตไฟฟ้าผสมผสานพลังน้ำและแสงอาทิตย์ พื้นที่พระราชดำริ", places: ["maetuen"], lead: "นายศรีธร อุปคำ", budget: 48_150, source: "DB" },
  { year: 2569, title: "พัฒนาการเรียนรู้ภาษาไทยพื้นที่ถิ่นทุรกันดาร", places: ["maesariang"], lead: "นายรัตนพล พนมวัน ณ อยุธยา", budget: 50_000, source: "DB" },
  { year: 2569, title: "เพาะขยายพันธุ์ปลาเลียหินเพื่ออนุรักษ์ปลาท้องถิ่น", places: ["nan"], lead: "นายจุลทรรศน์ คีรีแลง", budget: 82_400, source: "DB" },
  { year: 2569, title: "การจัดการภูมิทัศน์ผ่านประสบการณ์จริงนอกห้องเรียน", places: ["nan"], lead: "อ.ภาณุพงศ์ สิทธิวุฒิ", budget: 129_050, source: "DB" },
  { year: 2569, title: "นิทรรศการน้อมถวายรายงานในการรับเสด็จ", places: ["rmutl-nan"], lead: "น.ส.สุภัควดี พิมพ์มาศ", budget: 250_000, source: "DB" },
  { year: 2569, title: "นำร่อง SkillChain ระบบรับรองทักษะช่างบน Blockchain", places: ["rmutl-cm"], lead: "นางสาวพิมลพรรณ เลิศบัวบาน", budget: 62_800, source: "DB" },
];

/** ช่วงปีสำหรับปุ่มกรอง — ตรงกับระยะใน journey.ts */
export const JOURNEY_PERIODS = [
  { key: "all", label: "ทุกปี", from: 0, to: 9999, color: "#0e7490" },
  { key: "p2", label: "2550–2554", from: 2550, to: 2554, color: "#64748b" },
  { key: "p3", label: "2555–2559", from: 2555, to: 2559, color: "#0891b2" },
  { key: "p4", label: "2560–2565", from: 2560, to: 2565, color: "#7c3aed" },
  { key: "p5", label: "2566–2569", from: 2566, to: 2569, color: "#d97706" },
] as const;

export function periodColor(year: number): string {
  const p = JOURNEY_PERIODS.slice(1).find((x) => year >= x.from && year <= x.to);
  return p ? p.color : "#0e7490";
}
