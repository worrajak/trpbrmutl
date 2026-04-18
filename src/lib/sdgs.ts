export interface SDGoal {
  id: number;
  name_th: string;
  name_en: string;
  color: string;
  bg: string;
  icon: string;
  keywords: string[]; // สำหรับ SEO
}

export const SDG_GOALS: SDGoal[] = [
  { id: 1,  name_th: "ขจัดความยากจน",                    name_en: "No Poverty",                              color: "#E5243B", bg: "#FDE8EB", icon: "🏠", keywords: ["poverty","ความยากจน","รายได้","ชุมชน"] },
  { id: 2,  name_th: "ขจัดความหิวโหย",                   name_en: "Zero Hunger",                             color: "#DDA63A", bg: "#FDF3DC", icon: "🌾", keywords: ["hunger","เกษตร","อาหาร","ความมั่นคงทางอาหาร"] },
  { id: 3,  name_th: "สุขภาพและความเป็นอยู่ที่ดี",        name_en: "Good Health and Well-being",              color: "#4C9F38", bg: "#E8F5E3", icon: "🏥", keywords: ["health","สุขภาพ","การแพทย์","wellness"] },
  { id: 4,  name_th: "การศึกษาที่มีคุณภาพ",               name_en: "Quality Education",                       color: "#C5192D", bg: "#FADDDF", icon: "📚", keywords: ["education","การศึกษา","เรียนรู้","วิชาการ"] },
  { id: 5,  name_th: "ความเท่าเทียมทางเพศ",               name_en: "Gender Equality",                         color: "#FF3A21", bg: "#FFE5E2", icon: "⚖️", keywords: ["gender","เพศ","สตรี","ความเท่าเทียม"] },
  { id: 6,  name_th: "น้ำสะอาดและสุขาภิบาล",              name_en: "Clean Water and Sanitation",              color: "#26BDE2", bg: "#E2F6FD", icon: "💧", keywords: ["water","น้ำ","สุขาภิบาล","สิ่งแวดล้อม"] },
  { id: 7,  name_th: "พลังงานสะอาดที่เข้าถึงได้",          name_en: "Affordable and Clean Energy",             color: "#FCC30B", bg: "#FEF6DC", icon: "⚡", keywords: ["energy","พลังงาน","solar","renewable"] },
  { id: 8,  name_th: "งานที่ดีและการเติบโตทางเศรษฐกิจ",    name_en: "Decent Work and Economic Growth",         color: "#A21942", bg: "#F5D8E2", icon: "💼", keywords: ["work","งาน","เศรษฐกิจ","อาชีพ","รายได้"] },
  { id: 9,  name_th: "นวัตกรรมและโครงสร้างพื้นฐาน",        name_en: "Industry Innovation and Infrastructure",  color: "#FD6925", bg: "#FEE9DC", icon: "🏗️", keywords: ["innovation","นวัตกรรม","อุตสาหกรรม","เทคโนโลยี"] },
  { id: 10, name_th: "ลดความไม่เสมอภาค",                  name_en: "Reduced Inequalities",                    color: "#DD1367", bg: "#FBD7E8", icon: "🤝", keywords: ["inequality","ความไม่เสมอภาค","ช่องว่าง"] },
  { id: 11, name_th: "เมืองและชุมชนที่ยั่งยืน",             name_en: "Sustainable Cities and Communities",     color: "#FD9D24", bg: "#FEF0DC", icon: "🏙️", keywords: ["cities","เมือง","ชุมชน","ยั่งยืน"] },
  { id: 12, name_th: "การผลิตและบริโภคที่ยั่งยืน",          name_en: "Responsible Consumption and Production", color: "#BF8B2E", bg: "#F7EDD8", icon: "♻️", keywords: ["consumption","การบริโภค","ขยะ","circular economy"] },
  { id: 13, name_th: "การรับมือการเปลี่ยนแปลงสภาพภูมิอากาศ",name_en: "Climate Action",                          color: "#3F7E44", bg: "#E3EEE4", icon: "🌍", keywords: ["climate","ภูมิอากาศ","โลกร้อน","carbon"] },
  { id: 14, name_th: "ชีวิตใต้น้ำ",                        name_en: "Life Below Water",                        color: "#0A97D9", bg: "#D5EEF8", icon: "🐟", keywords: ["ocean","ทะเล","น้ำ","ปลา","marine"] },
  { id: 15, name_th: "ชีวิตบนบก",                          name_en: "Life on Land",                            color: "#56C02B", bg: "#E6F6DC", icon: "🌿", keywords: ["forest","ป่า","ดิน","ความหลากหลายทางชีวภาพ"] },
  { id: 16, name_th: "ความสงบสุขยุติธรรมและสถาบันที่เข้มแข็ง",name_en: "Peace Justice and Strong Institutions",color: "#00689D", bg: "#D5EBF5", icon: "🕊️", keywords: ["peace","ยุติธรรม","สถาบัน","ธรรมาภิบาล"] },
  { id: 17, name_th: "ความร่วมมือเพื่อการพัฒนาที่ยั่งยืน",   name_en: "Partnerships for the Goals",             color: "#19486A", bg: "#D5E2EB", icon: "🌐", keywords: ["partnership","ความร่วมมือ","global","network"] },
];

export function getSdgGoal(id: number): SDGoal | undefined {
  return SDG_GOALS.find((g) => g.id === id);
}

export function sdgTagsToGoals(tags: number[]): SDGoal[] {
  return (tags || [])
    .map((id) => getSdgGoal(id))
    .filter(Boolean) as SDGoal[];
}
