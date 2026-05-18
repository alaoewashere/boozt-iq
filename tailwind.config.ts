import type { Config } from "tailwindcss";
import rtl from "tailwindcss-rtl";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        card: "var(--bg-card)",
        primary: "var(--bg-primary)",
        secondary: "var(--bg-secondary)",
        surface2: "var(--bg-surface-2)",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        en: ["var(--font-en)"],
        ar: ["var(--font-ar)"],
        "ar-luxury": ["var(--font-ar-luxury)", "var(--font-ar)", "serif"],
        heading: ["var(--font-display)", "var(--font-ar)", "Impact", "sans-serif"],
        body: ["var(--font-en)", "var(--font-ar)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        luxury: "3px",
      },
      transitionTimingFunction: {
        luxury: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
    },
  },
  plugins: [rtl],
};

export default config;
