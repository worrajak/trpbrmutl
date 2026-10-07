/**
 * Year Transition — ข้อมูลการ์ดเปลี่ยนผ่าน 2569 → 2570
 *
 * โครงสร้างสามช่อง
 *   ซ้าย  = ปีงบประมาณ 2569 ที่ปิดแล้ว (ผลที่เกิดขึ้นจริง)
 *   กลาง  = ทิศทางใหม่ — อะไรลากไปต่อ อะไรต้องแก้
 *   ขวา   = ปีงบประมาณ 2570 ที่กำลังเริ่ม (เป้าหมาย + งานต่อเนื่อง + โจทย์ที่จะเรียก ง.9)
 *
 * ตัวเลขฝั่งซ้ายและงานต่อเนื่องคำนวณจาก ExecutiveSummary (ฐานข้อมูลสด)
 * ฝั่งขวายังไม่มีกรอบงบประมาณจากมหาวิทยาลัย จึงเสนอเป็น "เป้าหมายเชิงกระบวนการ"
 * ซึ่งมาจากข้อเสนอในบทที่ 7 ของรายงานฉบับสมบูรณ์
 */
import type { ExecutiveSummary } from "./executive-summary";

export const NEXT_FY = 2570;

export interface CarryForward {
  title: string;
  why: string;
}

export interface FixItem {
  title: string;
  problem: string;
  action: string;
  metric: string;
}

export interface BriefCandidate {
  id: string;
  title: string;
  location: string | null;
  planNumber: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  kpis: string[];
}

export interface YearTransition {
  from: {
    fy: number;
    label: string;
    status: string;
    stats: { k: string; v: string; sub?: string }[];
    byInitiative: { label: string; percent: number; spent: number }[];
  };
  carryForward: CarryForward[];
  fixes: FixItem[];
  to: {
    fy: number;
    label: string;
    status: string;
    budgetNote: string;
    carryover: { count: number; amount: number };
    targets: { k: string; v: string }[];
  };
  briefs: BriefCandidate[];
}

const baht = (n: number) => Math.round(n).toLocaleString("th-TH");

export function buildYearTransition(
  exec: ExecutiveSummary,
  briefs: BriefCandidate[]
): YearTransition {
  const primary = exec.kpis.find((k) => k.isPrimary);
  const lowKpis = exec.kpis.filter((k) => !k.isPrimary && k.percent < 20);
  const fullyDisbursed = exec.faculties.filter((f) => f.percent >= 99.5).length;
  const lagging = exec.faculties.filter((f) => f.percent < 80);

  return {
    // ---------------- ซ้าย: ปีที่ปิดแล้ว ----------------
    from: {
      fy: exec.meta.fiscalYear,
      label: `ปีงบประมาณ ${exec.meta.fiscalYear}`,
      status: "ปิดปีแล้ว",
      stats: [
        {
          k: "เบิกจ่ายทั้งปี",
          v: `${exec.budget.percentOfFrame.toFixed(1)}%`,
          sub: `${baht(exec.budget.spent)} จากกรอบ ${baht(exec.budget.frame)} บาท`,
        },
        {
          k: "รายการโครงการ",
          v: `${exec.counts.projects}`,
          sub: `${exec.counts.faculties} หน่วยงาน · เบิกครบ ${fullyDisbursed} หน่วยงาน`,
        },
        {
          k: primary ? `ตัวชี้วัดที่ ${primary.code.replace("KPI-", "")}` : "ตัวชี้วัดหลัก",
          v: primary ? `${primary.percent.toFixed(0)}%` : "—",
          sub: primary ? `รับมา ${primary.committed} จากเป้า ${primary.target}` : undefined,
        },
        {
          k: "รายงานผลรายกิจกรรม",
          v: `${exec.counts.activityReports}/${exec.counts.activities}`,
          sub: "ไม่มีการบันทึกเลยตลอดปี",
        },
      ],
      byInitiative: exec.initiatives.map((i) => ({
        // "ง8-1 ผลักดันเทคโนโลยี นวัตกรรมสู่ชุมชน" -> "ง8-1 ผลักดันเทคโนโลยี"
        label: i.label.split(" ").slice(0, 2).join(" "),
        percent: i.percent,
        spent: i.spent,
      })),
    },

    // ---------------- กลาง: ลากไปต่อ ----------------
    carryForward: [
      {
        title: "รายงานที่ชี้เป้ารายหน่วยงานและรายวงเงิน",
        why: "รายงานรอบ 10 เดือนระบุชัดว่าใครช้าและต้องเร่งเท่าไร ผลคือ 55 วันสุดท้ายเบิกเพิ่มได้ 2,986,462 บาท จนปิดปีเหนือเป้า",
      },
      {
        title: "ระบบติดตามที่กระทบยอดตรงงบการเงิน",
        why: "ยอดในระบบตรงกับงบการเงินของมหาวิทยาลัยครบทุกระดับ ทำให้ทุกตัวเลขในรายงานตรวจย้อนกลับได้",
      },
      {
        title: "การกระจายงานข้ามหน่วยงาน",
        why: `${exec.counts.faculties} หน่วยงานร่วมดำเนินการ และ ${fullyDisbursed} หน่วยงานเบิกจ่ายได้เต็มจำนวน ผลไม่ผูกกับหน่วยงานใดหน่วยงานหนึ่ง`,
      },
      {
        title: "ภารกิจหลักตามพระราชดำริที่เกือบเต็มเป้า",
        why: primary
          ? `ตัวชี้วัดที่ ${primary.code.replace("KPI-", "")} อยู่ที่ ${primary.percent.toFixed(0)}% แสดงว่าเนื้องานตอบโจทย์พื้นที่จริง`
          : "เนื้องานตอบโจทย์พื้นที่จริง",
      },
    ],

    // ---------------- กลาง: ต้องแก้ ----------------
    fixes: [
      {
        title: "การรายงานผลรายกิจกรรม",
        problem: `ทั้งปีไม่มีการบันทึกผลเลย (${exec.counts.activityReports} จาก ${exec.counts.activities} กิจกรรม) ตัวชี้วัดจึงเป็นค่าที่รับมา มิใช่ผลที่ตรวจรับ`,
        action: "ผูกการเบิกจ่ายงวดที่สองเข้ากับการบันทึกผลพร้อมหลักฐานในระบบ",
        metric: "รายงานผลเข้าระบบไม่น้อยกว่า 80%",
      },
      {
        title: "จังหวะการเบิกจ่าย",
        problem: "ประมาณ 40% ของยอดทั้งปีเกิดขึ้นใน 55 วันสุดท้าย เสี่ยงทั้งเรื่องทันเวลาและคุณภาพงาน",
        action: "กำหนดเพดานเบิกจ่ายขั้นต่ำสะสมรายไตรมาส ติดตามรายหน่วยงานเป็นรายเดือน",
        metric: "สิ้นไตรมาส 3 เบิกจ่ายไม่น้อยกว่า 70%",
      },
      {
        title: "ตัวชี้วัดที่ไม่ตรงลักษณะงาน",
        problem:
          lowKpis.length > 0
            ? `${lowKpis.map((k) => `ที่ ${k.code.replace("KPI-", "")} (${k.percent.toFixed(0)}%)`).join(" · ")} ไม่ขยับแม้ในช่วงเร่งรัด เพราะไม่ได้ออกแบบไว้ในเนื้องานตั้งแต่ต้น`
            : "ตัวชี้วัดบางกลุ่มไม่สอดคล้องกับลักษณะงานพัฒนาชุมชน",
        action: "ทบทวนตัวชี้วัดกลุ่มนี้ หรือจัดโครงการเฉพาะที่มุ่งตัวชี้วัดกลุ่มนี้ตั้งแต่ต้นปี",
        metric: "ตัวชี้วัดกลุ่มนี้เหนือ 40%",
      },
      {
        title: "กระบวนการพัสดุรายหน่วยงาน",
        problem:
          lagging.length > 0
            ? `${lagging.map((f) => `${f.name} (${f.percent.toFixed(0)}%)`).join(" · ")} ติดกระบวนการพัสดุ มิใช่เนื้องาน`
            : "บางหน่วยงานติดกระบวนการพัสดุ",
        action: "จัดทีมพี่เลี้ยงด้านพัสดุให้หน่วยงานที่เบิกจ่ายต่ำกว่า 70% ในปีก่อน",
        metric: "ไม่มีหน่วยงานใดปิดปีต่ำกว่า 80%",
      },
      {
        title: "ข้อมูล SDG และพื้นที่รายโครงการ",
        problem: "ไม่ได้บันทึกไว้ในฐานข้อมูล ทำให้รายงานระดับสากลต้องวิเคราะห์ย้อนหลัง",
        action: "บังคับกรอก SDG และพื้นที่ตั้งแต่ขั้นเสนอโครงการในแบบ ง.9",
        metric: "ทุกโครงการมี SDG ในระบบ",
      },
    ],

    // ---------------- ขวา: ปีที่กำลังเริ่ม ----------------
    to: {
      fy: NEXT_FY,
      label: `ปีงบประมาณ ${NEXT_FY}`,
      status: "เริ่มแล้ว",
      budgetNote:
        "ยังไม่ได้รับกรอบงบประมาณและตัวชี้วัดอย่างเป็นทางการ ตัวเลขฝั่งนี้จึงเป็นเป้าหมายเชิงกระบวนการจากข้อเสนอในบทที่ 7",
      carryover: { count: exec.outlook.items.length, amount: exec.outlook.total },
      targets: [
        { k: "รายงานผลเข้าระบบ", v: "ไม่น้อยกว่า 80% ของกิจกรรม" },
        { k: "เบิกจ่ายสิ้นไตรมาส 3", v: "ไม่น้อยกว่า 70%" },
        { k: "หน่วยงานที่ปิดปีต่ำกว่า 80%", v: "ไม่มี" },
        { k: "ตัวชี้วัดเครือข่ายและเชิงพาณิชย์", v: "เหนือ 40%" },
        { k: "SDG และพื้นที่รายโครงการ", v: "ครบทุกโครงการ" },
      ],
    },

    briefs,
  };
}
