"use client";

import { useState, useRef, useEffect } from "react";
import Logo from "@/components/Logo";

/**
 * Navbar — แบ่งเป็น 2 ระดับ:
 *  - Top-level (visible) — งานหลัก ใช้บ่อย
 *  - Dropdown "เกี่ยวกับ" — ข้อมูลพื้นฐาน + อ้างอิง
 */

const mainLinks = [
  { href: "/", label: "ภาพรวม" },
  { href: "/projects", label: "โครงการ" },
  { href: "/research-areas", label: "📚 สาขาที่ต้องการ" },
  { href: "/researchers", label: "🔬 นักวิจัย" },
  { href: "/briefs", label: "📢 โจทย์วิจัย" },
  { href: "/alerts", label: "🔔 แจ้งเตือน" },
];

const aboutLinks = [
  { href: "/foundation", label: "📖 ที่มา" },
  { href: "/indicators", label: "📊 ตัวชี้วัด" },
  { href: "/sdgs", label: "🌐 SDGs" },
  { href: "/staff", label: "👥 บุคลากร" },
  { href: "/map", label: "🗺 แผนที่" },
  { href: "/regulations", label: "📜 ระเบียบ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutRef = useRef<HTMLDivElement>(null);

  // Close dropdown เมื่อคลิกนอก
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node)) {
        setAboutOpen(false);
      }
    }
    if (aboutOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [aboutOpen]);

  return (
    <nav className="bg-royal-gradient shadow-lg">
      <div className="h-1 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3">
            <Logo className="h-12 w-auto" />
            <div>
              <p className="text-lg font-bold text-white leading-tight">ใต้ร่มพระบารมี</p>
              <p className="text-[10px] text-gold-300">ระบบติดตามโครงการ | มทร.ล้านนา</p>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-1 text-sm">
            {mainLinks.map((l) => (
              <a key={l.href} href={l.href}
                className="rounded px-2 py-1 text-white/90 transition hover:bg-white/10 hover:text-white">
                {l.label}
              </a>
            ))}

            {/* About dropdown */}
            <div ref={aboutRef} className="relative">
              <button
                onClick={() => setAboutOpen(!aboutOpen)}
                className={`rounded px-2 py-1 transition flex items-center gap-1 ${
                  aboutOpen ? "bg-white/15 text-white" : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>ℹ เกี่ยวกับ</span>
                <span className={`text-[10px] transition-transform ${aboutOpen ? "rotate-180" : ""}`}>▼</span>
              </button>
              {aboutOpen && (
                <div className="absolute right-0 top-full mt-1 min-w-[180px] rounded-lg bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden z-50">
                  {aboutLinks.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setAboutOpen(false)}
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-royal-50 hover:text-royal-700 transition"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <a href="/admin"
              className="ml-1 rounded border border-gold-400/50 px-2 py-1 text-gold-300 transition hover:bg-gold-500/20 hover:text-gold-200">
              Admin
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden flex flex-col justify-center items-center gap-1.5 p-2 rounded hover:bg-white/10 transition"
            onClick={() => setOpen(!open)}
            aria-label="เมนู"
          >
            <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="sm:hidden mt-2 pb-2 border-t border-white/20 pt-2 flex flex-col gap-1">
            {mainLinks.map((l) => (
              <a key={l.href} href={l.href}
                onClick={() => setOpen(false)}
                className="rounded px-3 py-2 text-white/90 text-sm transition hover:bg-white/10 hover:text-white">
                {l.label}
              </a>
            ))}
            {/* About section in mobile */}
            <p className="mt-2 px-3 text-[10px] uppercase font-bold text-gold-300">ℹ เกี่ยวกับ</p>
            {aboutLinks.map((l) => (
              <a key={l.href} href={l.href}
                onClick={() => setOpen(false)}
                className="rounded px-3 py-2 text-white/80 text-sm transition hover:bg-white/10 hover:text-white">
                {l.label}
              </a>
            ))}
            <a href="/admin"
              onClick={() => setOpen(false)}
              className="mt-2 rounded border border-gold-400/50 px-3 py-2 text-gold-300 text-sm transition hover:bg-gold-500/20 hover:text-gold-200">
              Admin
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
