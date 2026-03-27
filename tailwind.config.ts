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
          50: "#f0f7f0",
          100: "#d4ead4",
          500: "#2e7d32",
          600: "#256b28",
          700: "#1b5e20",
          800: "#145218",
          900: "#0d3b10",
        },
      },
    },
  },
  plugins: [],
};
export default config;
