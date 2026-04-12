"use client";

import { useState } from "react";
import Logo from "@/components/Logo";

const navLinks = [
  { href: "/", label: "ภาพรวม" },
  { href: "/projects", label: "โครงการ" },
  { href: "/indicators", label: "ตัวชี้วัด" },
  { href: "/alerts", label: "🔔 แจ้งเตือน" },
  { href: "/map", label: "แผนที่" },
  { href: "/staff", label: "บุคลากร" },
  { href: "/regulations", label: "ระเบียบ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

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
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}
                className="rounded px-2 py-1 text-white/90 transition hover:bg-white/10 hover:text-white">
                {l.label}
              </a>
            ))}
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
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}
                onClick={() => setOpen(false)}
                className="rounded px-3 py-2 text-white/90 text-sm transition hover:bg-white/10 hover:text-white">
                {l.label}
              </a>
            ))}
            <a href="/admin"
              onClick={() => setOpen(false)}
              className="rounded border border-gold-400/50 px-3 py-2 text-gold-300 text-sm transition hover:bg-gold-500/20 hover:text-gold-200">
              Admin
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
