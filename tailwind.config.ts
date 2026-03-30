import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
      },
    },
  },
  plugins: [],
};
export default config;
