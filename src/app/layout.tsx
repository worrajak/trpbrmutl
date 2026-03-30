import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import PageTracker from "@/components/PageTracker";

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
    <html lang="th">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {/* Google Analytics 4 */}
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

        {/* Navbar */}
        <nav className="bg-royal-gradient shadow-lg">
          {/* Gold accent line */}
          <div className="h-1 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            <div className="flex items-center justify-between">
              {/* Logo + Title */}
              <a href="/" className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="ใต้ร่มพระบารมี"
                  className="h-12 w-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div>
                  <p className="text-lg font-bold text-white leading-tight">
                    ใต้ร่มพระบารมี
                  </p>
                  <p className="text-[10px] text-gold-300">
                    ระบบติดตามโครงการ | มทร.ล้านนา
                  </p>
                </div>
              </a>

              {/* Menu */}
              <div className="flex flex-wrap gap-1 text-sm sm:gap-3">
                <a
                  href="/"
                  className="rounded px-2 py-1 text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  ภาพรวม
                </a>
                <a
                  href="/projects"
                  className="rounded px-2 py-1 text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  โครงการ
                </a>
                <a
                  href="/indicators"
                  className="rounded px-2 py-1 text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  ตัวชี้วัด
                </a>
                <a
                  href="/map"
                  className="rounded px-2 py-1 text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  แผนที่
                </a>
                <a
                  href="/staff"
                  className="rounded px-2 py-1 text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  บุคลากร
                </a>
                <a
                  href="/regulations"
                  className="rounded px-2 py-1 text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  ระเบียบ
                </a>
                <a
                  href="/admin"
                  className="rounded border border-gold-400/50 px-2 py-1 text-gold-300 transition hover:bg-gold-500/20 hover:text-gold-200"
                >
                  Admin
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>

        {/* Footer */}
        <footer className="bg-royal-gradient mt-8">
          <div className="h-0.5 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt=""
                  className="h-8 w-auto opacity-80"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-white/90">
                    กลุ่มแผนงานใต้ร่มพระบารมี
                  </p>
                  <p className="text-xs text-white/50">
                    มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/40">
                งบประมาณปี พ.ศ. 2569 | Powered by Supabase + TRON Blockchain
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
