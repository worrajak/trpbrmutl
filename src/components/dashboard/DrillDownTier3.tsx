/**
 * DrillDownTier3 — links ไปยังหน้า detail ต่างๆ
 *
 * ตามหลัก pyramid: top tier สั้น · drill-down อยู่ในหน้าแยก
 * ไม่โชว์ทุก KPI / SDG / รายงาน บนหน้าแรก
 */
import Link from "next/link";

const LINKS = [
  { href: "/excellence", icon: "📊", title: "KPI 26 ตัวเต็ม", desc: "Excellence + ค.ต.ป. · ดู mapping" },
  { href: "/projects", icon: "📂", title: "โครงการทั้งหมด", desc: "ทุกสถานะ · filter · บัญชีเบิก" },
  { href: "/research-areas", icon: "📚", title: "สาขาที่ต้องการ", desc: "Catalog · auto-sync จาก brief" },
  { href: "/briefs", icon: "📢", title: "Brief วิจัย", desc: "โจทย์เปิด · verify แหล่งข้อมูล" },
  { href: "/sdgs", icon: "🌐", title: "SDG mapping", desc: "17 goals · ดูโครงการต่อเป้า" },
  { href: "/alerts", icon: "🔔", title: "แจ้งเตือน", desc: "กิจกรรมเลยกำหนด · เคลียร์บิล" },
];

export default function DrillDownTier3() {
  return (
    <section>
      <h2 className="text-sm font-bold text-slate-700 mb-2 px-1">🔍 เจาะเข้าไปดูรายละเอียด</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg bg-white ring-1 ring-slate-200 p-3 hover:ring-cyan-300 hover:bg-cyan-50/30 transition"
          >
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>{l.icon}</span>
              <span>{l.title}</span>
            </p>
            <p className="mt-0.5 text-[0.7rem] text-slate-500 leading-snug">{l.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
