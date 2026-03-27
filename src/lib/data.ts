import { Indicator, MainProject, SubProject, RoyalProjectSite, Staff } from "./types";

// ===== ตัวชี้วัด (KPIs) =====
export const indicators: Indicator[] = [
  {
    id: "kpi-10",
    code: "ตัวชี้วัดที่ 10",
    name: "จำนวนเครือข่ายความร่วมมือกับหน่วยงานภายนอก",
    target: 50,
    unit: "เครือข่าย",
    description:
      "จำนวนเครือข่ายที่มหาวิทยาลัยมีกิจกรรมความร่วมมือกับหน่วยงานภายนอกทั้งในและต่างประเทศ เพื่อสนับสนุนและพัฒนาเทคโนโลยีและนวัตกรรม และงานสร้างสรรค์",
    source: "rmutl",
  },
  {
    id: "kpi-35",
    code: "ตัวชี้วัดที่ 35",
    name: "จำนวนคณาจารย์/บุคลากรที่นำเทคโนโลยีไปพัฒนาชุมชน",
    target: 400,
    unit: "คน",
    description:
      "จำนวนคณาจารย์และบุคลากรที่นำเทคโนโลยี นวัตกรรม งานสร้างสรรค์ และองค์ความรู้ไปพัฒนาในภาคอุตสาหกรรม ชุมชน สังคม",
    source: "rmutl",
  },
  {
    id: "kpi-36",
    code: "ตัวชี้วัดที่ 36",
    name: "แหล่งเรียนรู้ตลอดชีวิตของสังคม",
    target: 15,
    unit: "แหล่งเรียนรู้",
    description: "แหล่งเรียนรู้ตลอดชีวิตของสังคม (นับซ้ำ)",
    source: "rmutl",
  },
  {
    id: "kpi-40",
    code: "ตัวชี้วัดที่ 40",
    name: "องค์ความรู้เทคโนโลยีและนวัตกรรมที่ยกระดับคุณภาพชีวิตชุมชน",
    target: 100,
    unit: "องค์ความรู้",
    description:
      "จำนวนองค์ความรู้เทคโนโลยีและนวัตกรรมที่ไปยกระดับคุณภาพชีวิตให้กับชุมชน สังคม",
    source: "rmutl",
  },
  {
    id: "kpi-39",
    code: "ตัวชี้วัดที่ 39 (ใต้ร่ม)",
    name: "องค์ความรู้ที่นำไปใช้ในโครงการหลวง/พระราชดำริ",
    target: 60,
    unit: "องค์ความรู้",
    description:
      "จำนวนองค์ความรู้เทคโนโลยีและนวัตกรรมที่นำไปใช้ในโครงการหลวง โครงการตามพระราชดำริ หรือชุมชนที่สามารถลดต้นทุนหรือเพิ่มประสิทธิภาพ",
    source: "rmutl",
  },
];

// ===== พื้นที่โครงการหลวง =====
export const sites: RoyalProjectSite[] = [
  { id: "site-01", name: "ศูนย์พัฒนาโครงการหลวงขุนแปะ", province: "เชียงใหม่" },
  { id: "site-02", name: "ศูนย์พัฒนาโครงการหลวงทุ่งหลวง", province: "เชียงใหม่" },
  { id: "site-03", name: "ศูนย์พัฒนาโครงการหลวงทุ่งเริง", province: "เชียงใหม่" },
  { id: "site-04", name: "ศูนย์พัฒนาโครงการหลวงหนองเขียว", province: "เชียงใหม่" },
  { id: "site-05", name: "ศูนย์พัฒนาโครงการหลวงปังค่า", province: "พะเยา" },
  { id: "site-06", name: "ศูนย์พัฒนาโครงการหลวงผาตั้ง", province: "เชียงราย" },
  { id: "site-07", name: "ศูนย์พัฒนาโครงการหลวงพระบาทห้วยต้ม", province: "ลำพูน" },
  { id: "site-08", name: "ศูนย์พัฒนาโครงการหลวงแม่สาใหม่", province: "เชียงใหม่" },
  { id: "site-09", name: "ศูนย์พัฒนาโครงการหลวงหมอกจ๋าม", province: "เชียงใหม่" },
  { id: "site-10", name: "ศูนย์พัฒนาโครงการหลวงห้วยน้ำริน", province: "เชียงราย" },
  { id: "site-11", name: "ศูนย์พัฒนาโครงการหลวงห้วยโป่ง", province: "เชียงราย" },
  { id: "site-12", name: "สถานีเกษตรหลวงปางดะ", province: "เชียงใหม่" },
  { id: "site-13", name: "ศูนย์วิจัยและพัฒนาการเกษตรโครงการหลวงชนกาธิเบศรดำริ", province: "เชียงใหม่" },
  { id: "site-14", name: "ศูนย์พัฒนาพันธุ์พืชจักรพันธ์เพ็ญศิริ", province: "เชียงราย" },
];

// ===== โครงการหลัก =====
export const mainProjects: MainProject[] = [
  // --- โครงการขับเคลื่อนกลไก (2,000,000 บาท) ---
  {
    id: "mp-kk-311",
    code: "3.1.1",
    name: "โครงการพัฒนาหลักสูตร/องค์ความรู้แบบบูรณาการเพื่อการถ่ายทอดความรู้ SDGs สู่ชุมชน สังคม",
    budget: 495000,
    strategy: "ยุทธศาสตร์ที่ 3 การเสริมสร้างความเข้มแข็งของชุมชน",
    plan: "แผนงานที่ 3.1 ยกระดับคุณภาพชีวิตและเสริมสร้างความเข้มแข็งของชุมชนอยู่ดีมีสุขตามศาสตร์พระราชา",
    source: "ขับเคลื่อนกลไก",
  },
  {
    id: "mp-kk-312",
    code: "3.1.2",
    name: "โครงการสนับสนุนการดำเนินงานศูนย์พัฒนาพันธุ์พืชจักรพันธ์เพ็ญศิริ",
    budget: 450000,
    strategy: "ยุทธศาสตร์ที่ 3 การเสริมสร้างความเข้มแข็งของชุมชน",
    plan: "แผนงานที่ 3.1 ยกระดับคุณภาพชีวิตและเสริมสร้างความเข้มแข็งของชุมชนอยู่ดีมีสุขตามศาสตร์พระราชา",
    source: "ขับเคลื่อนกลไก",
  },
  {
    id: "mp-kk-313",
    code: "3.1.3",
    name: "โครงการพัฒนาพื้นที่เกษตรทฤษฎีใหม่ ตามหลักปรัชญาเศรษฐกิจพอเพียง",
    budget: 555000,
    strategy: "ยุทธศาสตร์ที่ 3 การเสริมสร้างความเข้มแข็งของชุมชน",
    plan: "แผนงานที่ 3.1 ยกระดับคุณภาพชีวิตและเสริมสร้างความเข้มแข็งของชุมชนอยู่ดีมีสุขตามศาสตร์พระราชา",
    source: "ขับเคลื่อนกลไก",
  },
  {
    id: "mp-kk-511",
    code: "5.1.1",
    name: "โครงการเตรียมความพร้อม สร้างคุณค่า และต่อยอดการรับเสด็จอย่างยั่งยืน",
    budget: 500000,
    strategy: "ยุทธศาสตร์ที่ 5 การเพิ่มประสิทธิภาพบริหารจัดการ",
    plan: "แผนงานที่ 5.1 ขับเคลื่อนกลไกการปฏิบัติงานอย่างมีส่วนร่วมสู่การพัฒนาที่ยั่งยืน",
    source: "ขับเคลื่อนกลไก",
  },
  // --- โครงการ สวพส. (ผลักดันเทคโนโลยี / พัฒนากำลังคน) ---
  {
    id: "mp-swps-1",
    code: "กิจกรรมที่ 1-2",
    name: "โครงการวิจัยเทคโนโลยีการผลิตเพื่อเพิ่มประสิทธิภาพการผลิตบนพื้นที่สูง",
    budget: 800000,
    strategy: "ยุทธศาสตร์ที่ 1 การวิจัยสนับสนุนการพัฒนาชุมชนบนพื้นที่สูง",
    plan: "แผนงานที่ 1.1 วิจัย พัฒนานวัตกรรมที่สร้างรายได้",
    source: "ผลักดันเทคโนโลยี",
  },
  {
    id: "mp-swps-2",
    code: "กิจกรรมที่ 3-4",
    name: "โครงการวิจัยความเข้มแข็งทางสังคม ชุมชน และพัฒนากระบวนการวิจัยแบบมีส่วนร่วม",
    budget: 900000,
    strategy: "ยุทธศาสตร์ที่ 1 การวิจัยสนับสนุนการพัฒนาชุมชนบนพื้นที่สูง",
    plan: "แผนงานที่ 1.2 พัฒนาโจทย์วิจัยแก้ปัญหาเชิงพื้นที่",
    source: "พัฒนากำลังคน",
  },
];

// ===== โครงการย่อย =====
export const subProjects: SubProject[] = [
  // ===== โครงการขับเคลื่อนกลไก - 3.1.1 (SDGs) =====
  {
    id: "sp-3111",
    code: "3.1.1.1",
    name: "โครงการการถ่ายทอดองค์ความรู้เรื่องการจัดการขยะแบบยั่งยืน ระดับชุมชนและระดับมหาวิทยาลัย",
    mainProjectId: "mp-kk-311",
    budget: 50000,
    responsible: "ดร. วนิดา สุริยานนท์",
    responsibleOrg: "นอกกลุ่มแผนงานฯ",
    site: "วิทยาลัยฯ มทร.ล้านนา",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-40", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
      { indicatorId: "kpi-39", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
    ],
  },
  {
    id: "sp-3112",
    code: "3.1.1.2",
    name: "โครงการพัฒนาแหล่งเรียนรู้และถ่ายทอดองค์ความรู้เทคโนโลยีการพัฒนาผลิตภัณฑ์เซรามิก",
    mainProjectId: "mp-kk-311",
    budget: 200000,
    responsible: "อ.ศรีธร",
    responsibleOrg: "สถช.",
    site: "ศูนย์เรียนรู้เซรามิก",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-40", target: 2, actual: 0, unit: "องค์ความรู้", description: "2 องค์ความรู้" },
      { indicatorId: "kpi-39", target: 2, actual: 0, unit: "องค์ความรู้", description: "2 องค์ความรู้" },
    ],
  },
  {
    id: "sp-3113",
    code: "3.1.1.3",
    name: "โครงการอบรมเชิงปฏิบัติการถ่ายทอดองค์ความรู้เทคนิคการสร้างแม่พิมพ์เพื่อการขึ้นรูปพัฒนาผลิตภัณฑ์เซรามิก",
    mainProjectId: "mp-kk-311",
    budget: 50000,
    responsible: "นายคเชนทร์ เครือสาร",
    responsibleOrg: "สถช.",
    site: "ศูนย์เรียนรู้เซรามิก",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-40", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
      { indicatorId: "kpi-39", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
    ],
  },
  {
    id: "sp-3114",
    code: "3.1.1.4",
    name: "โครงการประยุกต์ใช้การคำนวนสูตรอาหารไก่ไข่ต้นทุนต่ำด้วยโปรแกรมสำเร็จรูปร่วมกับวัตถุดิบในท้องถิ่น",
    mainProjectId: "mp-kk-311",
    budget: 50000,
    responsible: "อ.อุษณีย์ภรณ์ สร้อยเพ็ชร์",
    responsibleOrg: "พิษณุโลก",
    site: "อ.วังทอง จ.พิษณุโลก",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-40", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
      { indicatorId: "kpi-39", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
    ],
  },
  {
    id: "sp-3115",
    code: "3.1.1.5",
    name: "โครงการสำรวจและพัฒนาระบบไฟฟ้าเพื่อการจัดการเรียนการสอนที่เหมาะสมสำหรับเด็กและเยาวชนในถิ่นทุรกันดาร จ.ตาก",
    mainProjectId: "mp-kk-311",
    budget: 45000,
    responsible: "ผศ.ทนงศักดิ์ ยาทะเล",
    responsibleOrg: "",
    site: "จังหวัดตาก",
    status: "revision",
    budgetApproved: false,
    inProcess: false,
    needsRevision: true,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-40", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
      { indicatorId: "kpi-39", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
    ],
  },
  {
    id: "sp-3116",
    code: "3.1.1.6",
    name: "โครงการถ่ายทอดองค์ความรู้และนวัตกรรมการยกระดับวัสดุเพาะเห็ดเศรษฐกิจจากวัสดุเหลือใช้ทางการเกษตร",
    mainProjectId: "mp-kk-311",
    budget: 50000,
    responsible: "อ.ภควัต หุ่นฉัตร์",
    responsibleOrg: "พิษณุโลก",
    site: "ต.เกาะตาเลี้ยง อ.ศรีสำโรง จ.สุโขทัย",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-40", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
      { indicatorId: "kpi-39", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
    ],
  },
  {
    id: "sp-3117",
    code: "3.1.1.7",
    name: "โครงการเพิ่มมูลค่าสินค้าเกษตรและการพัฒนาสื่อด้วย AI พื้นที่เขตปฏิรูปที่ดิน ต.ป่าแดง อ.ชาติตระการ จ.พิษณุโลก",
    mainProjectId: "mp-kk-311",
    budget: 50000,
    responsible: "อ.สุริยาพร นิพรรัมย์",
    responsibleOrg: "พิษณุโลก",
    site: "ต.ป่าแดง อ.ชาติตระการ จ.พิษณุโลก",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-40", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
      { indicatorId: "kpi-39", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
    ],
  },
  // ===== 3.1.2 ศูนย์จักรพันธ์เพ็ญศิริ =====
  {
    id: "sp-3121",
    code: "3.1.2.1",
    name: "โครงการสนับสนุนการดำเนินงานศูนย์พัฒนาพันธุ์พืชจักรพันธ์เพ็ญศิริ อ.แม่สาย จ.เชียงราย",
    mainProjectId: "mp-kk-312",
    budget: 450000,
    responsible: "รศ.ดร.วิเชษฐ ทิพย์ประเสริฐ",
    responsibleOrg: "นอกกลุ่มแผนงานฯ",
    site: "ศูนย์ฯจักรพันธ์เพ็ญศิริ",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-36", target: 1, actual: 0, unit: "แหล่งเรียนรู้", description: "ศูนย์ฯจักรพันธ์เพ็ญศิริ" },
      { indicatorId: "kpi-40", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
      { indicatorId: "kpi-39", target: 3, actual: 0, unit: "องค์ความรู้", description: "3 องค์ความรู้" },
    ],
  },
  // ===== 3.1.3 เกษตรทฤษฎีใหม่ =====
  {
    id: "sp-3131",
    code: "3.1.3.1",
    name: "โครงการพัฒนาพื้นที่เรียนรู้ศาสตร์พระราชา เพื่อยกระดับศักยภาพพื้นที่ด้วยเทคโนโลยีที่เหมาะสม",
    mainProjectId: "mp-kk-313",
    budget: 400000,
    responsible: "สามารถ สาลี",
    responsibleOrg: "งานใต้ร่มพระบารมี",
    site: "ศูนย์ฯเรียนรู้เศรษฐกิจพอเพียง ดอยสะเก็ด",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-36", target: 1, actual: 0, unit: "แหล่งเรียนรู้", description: "พื้นที่โคกหนองนาเขตพื้นที่" },
      { indicatorId: "kpi-40", target: 2, actual: 0, unit: "องค์ความรู้", description: "2 องค์ความรู้" },
      { indicatorId: "kpi-39", target: 2, actual: 0, unit: "องค์ความรู้", description: "2 องค์ความรู้" },
    ],
  },
  {
    id: "sp-3133",
    code: "3.1.3.3",
    name: "โครงการพัฒนาพื้นที่ต้นแบบ โคก หนอง นา เพื่อการเรียนรู้ด้านเกษตรอินทรีย์ ตามศาสตร์พระราชา",
    mainProjectId: "mp-kk-313",
    budget: 55000,
    responsible: "ผศ.ทนงศักดิ์ ยาทะเล",
    responsibleOrg: "",
    site: "พื้นที่โคกหนองนา",
    status: "revision",
    budgetApproved: false,
    inProcess: false,
    needsRevision: true,
    indicatorContributions: [
      { indicatorId: "kpi-10", target: 1, actual: 0, unit: "เครือข่าย", description: "1 เครือข่าย" },
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-36", target: 1, actual: 0, unit: "แหล่งเรียนรู้", description: "พื้นที่โคกหนองนาเขตพื้นที่" },
      { indicatorId: "kpi-39", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
    ],
  },
  {
    id: "sp-3135",
    code: "3.1.3.5",
    name: "โครงการบริหารจัดการโครงการผลิตเมล็ดพันธุ์และปรับปรุงพันธุ์พืชให้กับศูนย์พัฒนาพันธุ์พืชจักรพันธ์เพ็ญศิริ",
    mainProjectId: "mp-kk-313",
    budget: 100000,
    responsible: "นายศิริชัย แซ่ท้าว",
    responsibleOrg: "สวก.",
    site: "ศูนย์ฯจักรพันธ์เพ็ญศิริ",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-36", target: 1, actual: 0, unit: "แหล่งเรียนรู้", description: "พื้นที่โคกหนองนาเขตพื้นที่" },
      { indicatorId: "kpi-39", target: 1, actual: 0, unit: "องค์ความรู้", description: "1 องค์ความรู้" },
    ],
  },
  // ===== 5.1.1 เตรียมความพร้อมรับเสด็จ =====
  {
    id: "sp-5111",
    code: "5.1.1.1",
    name: "โครงการพัฒนาแหล่งเรียนรู้เกษตรอันเนื่องมาจากพระราชดำริ วิถีธรรมชาติ",
    mainProjectId: "mp-kk-511",
    budget: 118960,
    responsible: "รศ.ดร.วิเชษฐ ทิพย์ประเสริฐ",
    responsibleOrg: "นอกกลุ่มแผนงานฯ",
    site: "มทร.ล้านนา เชียงราย",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
      { indicatorId: "kpi-36", target: 1, actual: 0, unit: "แหล่งเรียนรู้", description: "1 แหล่งเรียนรู้ตลอดชีวิต" },
    ],
  },
  {
    id: "sp-5112",
    code: "5.1.1.2",
    name: "โครงการพัฒนาศักยภาพการเรียนรู้ ด้านการจัดการภูมิทัศน์ ผ่านประสบการณ์จริงนอกห้องเรียน จ.น่าน",
    mainProjectId: "mp-kk-511",
    budget: 129050,
    responsible: "อ.ภาณุพงศ์",
    responsibleOrg: "",
    site: "พระตำหนักธงน้อย จ.น่าน",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
    ],
  },
  {
    id: "sp-5113",
    code: "5.1.1.3",
    name: "การจัดนิทรรศการเพื่อน้อมถวายรายงานในการรับเสด็จฯ ณ มทร.ล้านนา น่าน (ครั้งที่ 1)",
    mainProjectId: "mp-kk-511",
    budget: 125000,
    responsible: "น.ส.สุภัควดี",
    responsibleOrg: "",
    site: "มทร.ล้านนา น่าน",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
    ],
  },
  {
    id: "sp-5114",
    code: "5.1.1.4",
    name: "การจัดนิทรรศการเพื่อน้อมถวายรายงานในการรับเสด็จฯ ณ มทร.ล้านนา น่าน (ครั้งที่ 2)",
    mainProjectId: "mp-kk-511",
    budget: 125000,
    responsible: "น.ส.สุภัควดี",
    responsibleOrg: "",
    site: "มทร.ล้านนา น่าน",
    status: "approved",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    indicatorContributions: [
      { indicatorId: "kpi-35", target: 5, actual: 0, unit: "คน", description: "กลุ่มวิจัย 5 คน + นักศึกษา" },
    ],
  },
  // ===== โครงการ สวพส. =====
  {
    id: "sp-swps-11",
    code: "1.1",
    name: "โครงการพัฒนาเครื่องตัดแต่งหัว-ท้ายฝักข้าวโพดหวานสองสี",
    mainProjectId: "mp-swps-1",
    budget: 190000,
    responsible: "",
    responsibleOrg: "มทร.ล้านนา",
    site: "สถานีเกษตรหลวงปางดะ",
    status: "completed",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    budgetUsed: 190000,
    budgetRemaining: 0,
    kpiText: "เทคโนโลยีเครื่องตัดแต่งหัว-ท้ายฝักข้าวโพดหวานสองสี จำนวน 1 เทคโนโลยี",
    indicatorContributions: [
      { indicatorId: "kpi-39", target: 1, actual: 1, unit: "เทคโนโลยี", description: "เครื่องตัดแต่งหัว-ท้ายฝักข้าวโพดหวานสองสี" },
    ],
  },
  {
    id: "sp-swps-12",
    code: "1.2",
    name: "โครงการประยุกต์เทคโนโลยีสลัดน้ำผักด้วยระบบลมเย็น ศูนย์พัฒนาโครงการหลวงทุ่งหลวง",
    mainProjectId: "mp-swps-1",
    budget: 185840,
    responsible: "",
    responsibleOrg: "มทร.ล้านนา",
    site: "ศูนย์พัฒนาโครงการหลวงทุ่งหลวง",
    status: "completed",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    budgetUsed: 184180,
    budgetRemaining: 1660,
    kpiText: "ต้นแบบเทคโนโลยีสลัดน้ำผักด้วยลมเย็น จำนวน 1 เทคโนโลยี",
    indicatorContributions: [
      { indicatorId: "kpi-39", target: 1, actual: 1, unit: "เทคโนโลยี", description: "ต้นแบบเทคโนโลยีสลัดน้ำผักด้วยลมเย็น" },
    ],
  },
  {
    id: "sp-swps-14",
    code: "1.4",
    name: "โครงการพัฒนาต้นแบบเครื่องมือประเมินคุณภาพผลิตผลมะม่วงโดยเทคนิคแบบไม่ทำลาย",
    mainProjectId: "mp-swps-1",
    budget: 100000,
    responsible: "",
    responsibleOrg: "มทร.ล้านนา",
    site: "ศูนย์พัฒนาโครงการหลวงหมอกจ๋าม",
    status: "completed",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    budgetUsed: 77140,
    budgetRemaining: 22860,
    kpiText: "ต้นแบบเครื่องมือประเมินคุณภาพผลิตผลมะม่วง จำนวน 1 เทคโนโลยี",
    indicatorContributions: [
      { indicatorId: "kpi-39", target: 1, actual: 1, unit: "เทคโนโลยี", description: "ต้นแบบเครื่องมือประเมินคุณภาพผลิตผลมะม่วง" },
    ],
  },
  {
    id: "sp-swps-21",
    code: "2.1",
    name: "โครงการขยายผลการพัฒนาเทคโนโลยีเครื่องแยกแกนกัญชง ศูนย์พัฒนาโครงการหลวงห้วยน้ำริน",
    mainProjectId: "mp-swps-1",
    budget: 150000,
    responsible: "",
    responsibleOrg: "มทร.ล้านนา",
    site: "ศูนย์พัฒนาโครงการหลวงห้วยน้ำริน",
    status: "completed",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    budgetUsed: 131600,
    budgetRemaining: 18400,
    kpiText: "เทคโนโลยีเครื่องแยกแกนต้นกัญชง จำนวน 1 เทคโนโลยี",
    indicatorContributions: [
      { indicatorId: "kpi-39", target: 1, actual: 1, unit: "เทคโนโลยี", description: "เทคโนโลยีเครื่องแยกแกนต้นกัญชง" },
    ],
  },
  {
    id: "sp-swps-22",
    code: "2.2",
    name: "โครงการขยายผลการพัฒนาเทคโนโลยีเตาอบแห้งสำหรับเส้นใยกัญชง ศูนย์พัฒนาโครงการหลวงห้วยน้ำริน",
    mainProjectId: "mp-swps-1",
    budget: 150000,
    responsible: "",
    responsibleOrg: "มทร.ล้านนา",
    site: "ศูนย์พัฒนาโครงการหลวงห้วยน้ำริน",
    status: "completed",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    budgetUsed: 149860,
    budgetRemaining: 140,
    kpiText: "เทคโนโลยีเตาอบแห้งเส้นใยกัญชง จำนวน 1 เทคโนโลยี",
    indicatorContributions: [
      { indicatorId: "kpi-39", target: 1, actual: 1, unit: "เทคโนโลยี", description: "เทคโนโลยีเตาอบแห้งเส้นใยกัญชง" },
    ],
  },
  {
    id: "sp-swps-23",
    code: "2.3",
    name: "โครงการพัฒนานวัตกรรมและสร้างมูลค่าเพิ่มจากทรัพยากรธรรมชาติสู่ผลิตภัณฑ์เครื่องแต่งกายเชิงวัฒนธรรม",
    mainProjectId: "mp-swps-1",
    budget: 100000,
    responsible: "",
    responsibleOrg: "มทร.ล้านนา",
    site: "ศูนย์พัฒนาโครงการหลวงแม่สาใหม่",
    status: "completed",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    budgetUsed: 100000,
    budgetRemaining: 0,
    kpiText: "ผลิตภัณฑ์เสื้อผ้าและเครื่องแต่งกายผลิตจากเส้นใยกัญชงย้อมสีธรรมชาติ จำนวน 5 รูปแบบ",
    indicatorContributions: [
      { indicatorId: "kpi-39", target: 5, actual: 5, unit: "ผลิตภัณฑ์", description: "ผลิตภัณฑ์เครื่องแต่งกายจากเส้นใยกัญชง" },
    ],
  },
  {
    id: "sp-swps-24",
    code: "2.4",
    name: "โครงการจัดการหลังการเก็บเกี่ยว เครื่องขัดไลเคนบนผิวผลอะโวคาโด ศูนย์พัฒนาโครงการหลวงขุนแปะ",
    mainProjectId: "mp-swps-1",
    budget: 200000,
    responsible: "",
    responsibleOrg: "มทร.ล้านนา",
    site: "ศูนย์พัฒนาโครงการหลวงขุนแปะ",
    status: "completed",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    budgetUsed: 166140,
    budgetRemaining: 23860,
    kpiText: "เทคโนโลยีต้นแบบเครื่องขัดผิวผลอะโวคาโด จำนวน 1 เทคโนโลยี",
    indicatorContributions: [
      { indicatorId: "kpi-39", target: 1, actual: 1, unit: "เทคโนโลยี", description: "ต้นแบบเครื่องขัดผิวผลอะโวคาโด" },
    ],
  },
  {
    id: "sp-swps-25",
    code: "2.5",
    name: "โครงการพัฒนาผลิตภัณฑ์อาหารจากอะโวคาโด ศูนย์พัฒนาโครงการหลวงหนองเขียว",
    mainProjectId: "mp-swps-1",
    budget: 150000,
    responsible: "",
    responsibleOrg: "มทร.ล้านนา",
    site: "ศูนย์พัฒนาโครงการหลวงหนองเขียว",
    status: "completed",
    budgetApproved: true,
    inProcess: false,
    needsRevision: false,
    budgetUsed: 127630,
    budgetRemaining: 22370,
    kpiText: "ต้นแบบผลิตภัณฑ์อาหารจากอะโวคาโด จำนวน 2 ผลิตภัณฑ์",
    indicatorContributions: [
      { indicatorId: "kpi-39", target: 2, actual: 2, unit: "ผลิตภัณฑ์", description: "ผลิตภัณฑ์ไอศกรีม และเพียวเร่อะโวคาโด" },
    ],
  },
];

// ===== Helper functions =====
export function getSubProjectsByMainProject(mainProjectId: string): SubProject[] {
  return subProjects.filter((sp) => sp.mainProjectId === mainProjectId);
}

export function getIndicatorById(id: string): Indicator | undefined {
  return indicators.find((i) => i.id === id);
}

export function getMainProjectById(id: string): MainProject | undefined {
  return mainProjects.find((mp) => mp.id === id);
}

export function getSubProjectById(id: string): SubProject | undefined {
  return subProjects.find((sp) => sp.id === id);
}

export function getIndicatorSummary(): IndicatorSummary[] {
  return indicators.map((indicator) => {
    const contributions: IndicatorSummary["contributions"] = [];
    let totalTarget = 0;
    let totalActual = 0;

    subProjects.forEach((sp) => {
      sp.indicatorContributions.forEach((ic) => {
        if (ic.indicatorId === indicator.id) {
          contributions.push({
            subProjectId: sp.id,
            subProjectName: sp.name,
            target: ic.target,
            actual: ic.actual,
          });
          totalTarget += ic.target;
          totalActual += ic.actual;
        }
      });
    });

    return {
      indicatorId: indicator.id,
      indicatorName: indicator.name,
      overallTarget: totalTarget,
      totalActual: totalActual,
      unit: indicator.unit,
      percentage: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0,
      contributions,
    };
  });
}

// ===== บุคลากรกลุ่มแผนงานใต้ร่มพระบารมี (จาก trpb.rmutl.ac.th) =====
export const staff: Staff[] = [
  {
    id: "staff-01",
    name: "รองศาสตราจารย์วิเชษฐ์ ทิพย์ประเสริฐ",
    position: "ที่ปรึกษาโครงการ",
    role: "ที่ปรึกษา",
    email: "wichet_thip@rmutl.ac.th",
    phone: "0 5392 1444 ต่อ 1000",
  },
  {
    id: "staff-02",
    name: "ผศ.ดร จัตตุฤทธิ์ ทองปรอน",
    position: "ที่ปรึกษาโครงการ",
    role: "ที่ปรึกษา",
  },
  {
    id: "staff-03",
    name: "ผศ.ดร.วรจักร์ เมืองใจ",
    position: "หัวหน้ากลุ่มแผนงานใต้ร่มพระบารมี",
    role: "ผู้บริหาร",
  },
  {
    id: "staff-04",
    name: "ผศ.ดร.ธีระศักดิ์ สมศักดิ์",
    position: "ที่ปรึกษากลุ่มแผนงานใต้ร่มพระบารมี",
    role: "ที่ปรึกษา",
  },
  {
    id: "staff-05",
    name: "ผศ. มนตรี เงาเดช",
    position: "ที่ปรึกษากลุ่มแผนงานใต้ร่มพระบารมี",
    role: "ที่ปรึกษา",
  },
  {
    id: "staff-06",
    name: "นายนริศ กำแพงแก้ว",
    position: "ที่ปรึกษากลุ่มแผนงานใต้ร่มพระบารมี",
    role: "ที่ปรึกษา",
  },
  {
    id: "staff-07",
    name: "นางปวีณา ทองปรอน",
    position: "รักษาการในตำแหน่งหัวหน้าสำนักงาน",
    role: "ผู้บริหาร",
  },
  {
    id: "staff-08",
    name: "นายวรัญญู วรรณพรหม",
    position: "นักวิจัย ปฏิบัติการ",
    role: "คณะทำงาน",
  },
  {
    id: "staff-09",
    name: "นางสาวพิมลพรรณ เลิศบัวบาน",
    position: "นักวิจัย",
    role: "คณะทำงาน",
  },
  {
    id: "staff-10",
    name: "นายวัชระ กิตติวรเชฏฐ์",
    position: "วิศวกร",
    role: "คณะทำงาน",
  },
  {
    id: "staff-11",
    name: "นายสามารถ สาลี",
    position: "วิศวกร",
    role: "คณะทำงาน",
  },
  {
    id: "staff-12",
    name: "นางสาวรัตนวลี วรรณพรหม",
    position: "เจ้าหน้าที่วิจัย",
    role: "เจ้าหน้าที่",
  },
  {
    id: "staff-13",
    name: "นายวรรธนพงศ์ เทียนนิมิตร",
    position: "เจ้าหน้าที่ช่วยโครงการ",
    role: "เจ้าหน้าที่",
  },
];

// Re-export for convenience
import type { IndicatorSummary } from "./types";
