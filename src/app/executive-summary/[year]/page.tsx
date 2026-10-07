/**
 * /executive-summary/[year] — บทสรุปผู้บริหารแยกรายปีงบ
 *
 * ปีที่ปิดแล้วจะค้างอยู่ที่ URL ของตัวเอง ไม่ถูกปีใหม่ทับ
 * รับเฉพาะปีที่อยู่ใน AVAILABLE_FY เท่านั้น ปีอื่นคืน 404
 */
import { notFound } from "next/navigation";
import ExecutiveSummaryView from "@/components/ExecutiveSummaryView";
import { AVAILABLE_FY, parseFiscalYear } from "@/lib/fiscal-year";

export const revalidate = 60;

export function generateStaticParams() {
  return AVAILABLE_FY.map((y) => ({ year: String(y) }));
}

export function generateMetadata({ params }: { params: { year: string } }) {
  const fy = parseFiscalYear(params.year);
  return {
    title: `บทสรุปผู้บริหาร ปีงบประมาณ ${fy ?? params.year} · กลุ่มแผนงานใต้ร่มพระบารมี`,
    description: `สรุปผลการดำเนินงานปีงบประมาณ ${fy ?? params.year} สำหรับผู้บริหาร`,
  };
}

export default function Page({ params }: { params: { year: string } }) {
  const fy = parseFiscalYear(params.year);
  if (fy === null) notFound();
  return <ExecutiveSummaryView fy={fy} />;
}
