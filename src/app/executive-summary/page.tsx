/**
 * /executive-summary — บทสรุปผู้บริหารของปีงบปัจจุบัน
 *
 * เนื้อหาอยู่ใน ExecutiveSummaryView ซึ่งใช้ร่วมกับ /executive-summary/[year]
 * ลิงก์เดิมที่แจกไปแล้วจึงยังใช้ได้ และชี้ไปปีล่าสุดเสมอ
 */
import ExecutiveSummaryView from "@/components/ExecutiveSummaryView";
import { CURRENT_FY } from "@/lib/fiscal-year";

export const revalidate = 60;

export const metadata = {
  title: "บทสรุปผู้บริหาร · กลุ่มแผนงานใต้ร่มพระบารมี",
  description: `สรุปผลการดำเนินงานปีงบประมาณ ${CURRENT_FY} สำหรับผู้บริหาร`,
};

export default function Page() {
  return <ExecutiveSummaryView fy={CURRENT_FY} />;
}
