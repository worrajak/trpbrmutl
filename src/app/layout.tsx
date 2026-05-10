import type { Metadata } from "next";
import Script from "next/script";
import { Sarabun } from "next/font/google";
import "./globals.css";
import PageTracker from "@/components/PageTracker";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";

// Sarabun: Google Font Thai สวย รองรับครบทั้ง Latin + Thai
// แก้ปัญหา system font ที่ render Thai char ขนาดเล็กไม่ชัด (เช่น "ก" → คล้าย "n")
const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sarabun",
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export const metadata: Metadata = {
  title: "ใต้ร่มพระบารมี - ระบบติดตามโครงการ มทร.ล้านนา",
  description:
    "ระบบติดตามโครงการย่อยและรายงานผลตัวชี้วัด งบประมาณปี 2569 มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className={`${sarabun.className} bg-gray-50 text-gray-900 antialiased`}>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        <PageTracker />

        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>

        {/* Footer */}
        <footer className="bg-royal-gradient mt-8">
          <div className="h-0.5 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2">
                <Logo className="h-8 w-auto opacity-80" alt="" />
                <div>
                  <p className="text-sm font-medium text-white/90">กลุ่มแผนงานใต้ร่มพระบารมี</p>
                  <p className="text-xs text-white/50">มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา</p>
                </div>
              </div>
              <p className="text-xs text-white/40">งบประมาณปี พ.ศ. 2569 | Powered by Supabase + TRON Blockchain</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
