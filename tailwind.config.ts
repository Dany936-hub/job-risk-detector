import type { Config } from "tailwindcss";

// 颜色一律走 CSS 变量（见 app/globals.css），Tailwind 仅作工具类与排版骨架。
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-0": "var(--bg-0)",
        "bg-2": "var(--bg-2)",
        "bg-soft": "var(--bg-soft)",
        surface: "var(--surface)",
        glass: "var(--glass)",
        "glass-strong": "var(--glass-strong)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        brand: "var(--brand)",
        "brand-300": "var(--brand-300)",
        "brand-deep": "var(--brand-deep)",
        "brand-soft": "var(--brand-soft)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        teal: "var(--teal)",
        success: "var(--success)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      maxWidth: {
        content: "820px",
      },
    },
  },
  plugins: [],
};

export default config;
