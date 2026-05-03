import type { Config } from "tailwindcss";

/**
 * Tailwind config — Unified Theme 2026
 *
 * Palette คอนเซ็ปต์: "ใต้ร่มพระบารมี" — earthy + royal + sustainable
 *  - Forest (emerald) — สีหลัก สื่อยั่งยืน
 *  - Royal Gold (amber) — accent ทอง พระบรมฉายาลักษณ์
 *  - Stone (slate) — neutral ทุกที่ใช้แทน gray
 *
 * IMPORTANT: safelist gradient classes เพราะ Tailwind purge ตัด dynamic classes ออก
 * (ที่อยู่ใน string interpolation เช่น `from-${color}-500`)
 */

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Safelist: บังคับให้ gradient classes ทั้งหมดถูกสร้าง CSS แม้ใช้ผ่าน dynamic class
  safelist: [
    "bg-gradient-to-r",
    "bg-gradient-to-br",
    "bg-gradient-to-b",
    "bg-gradient-to-bl",
    "bg-gradient-to-tr",
    {
      pattern:
        /(from|via|to)-(amber|orange|red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|stone|slate)-(300|400|500|600|700|800)/,
    },
    {
      pattern:
        /(bg|text|ring|border)-(amber|orange|red|rose|pink|emerald|teal|cyan|blue|violet|slate)-(50|100|200|300|400|500|600|700|800|900)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        // ===== Royal palette เดิม (compat) =====
        royal: {
          50: "#eef2ff",
          100: "#dce4ff",
          200: "#b9c9ff",
          300: "#8aa3f5",
          400: "#5a7ce8",
          500: "#2c4ea0",
          600: "#1e3a7b",
          700: "#162d63",
          800: "#0f204a",
          900: "#091530",
        },
        gold: {
          50: "#fefce8",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#f5b83d",
          500: "#d4a017",
          600: "#b8860b",
          700: "#92700c",
          800: "#6b5310",
          900: "#4a3b0f",
        },
        // ===== Theme 2026 — semantic tokens =====
        // ใช้ตรงไหนก็ใช้ของ semantic นี้ จะคุมโทนเดียวทั้งระบบ
        // Surface
        surface: {
          DEFAULT: "#ffffff",
          alt: "#fafaf9", // stone-50
          muted: "#f5f5f4", // stone-100
        },
      },
    },
  },
  plugins: [],
};
export default config;
