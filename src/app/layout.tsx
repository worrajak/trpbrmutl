import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPF - ระบบติดตามโครงการย่อย มูลนิธิโครงการหลวง",
  description:
    "ระบบติดตามโครงการย่อยและรายงานผลตัวชี้วัด งบประมาณปี 2569 มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <nav className="bg-royal-700 text-white shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <a href="/" className="text-lg font-bold">
                RPF | ระบบติดตามโครงการ
              </a>
              <div className="flex gap-6 text-sm">
                <a href="/" className="hover:text-royal-100">
                  ภาพรวม
                </a>
                <a href="/projects" className="hover:text-royal-100">
                  โครงการย่อย
                </a>
                <a href="/indicators" className="hover:text-royal-100">
                  ตัวชี้วัด
                </a>
                <a href="/staff" className="hover:text-royal-100">
                  บุคลากร
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        <footer className="border-t bg-white py-4 text-center text-xs text-gray-500">
          มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา | งบประมาณปี พ.ศ. 2569
        </footer>
      </body>
    </html>
  );
}
