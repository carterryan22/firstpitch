import type { Config } from "tailwindcss";

// Theme adopted from dugout-dirt.com — vintage baseball-card / sandlot palette:
// cream parchment background, ink-brown foreground, outfield-grass accents,
// clay-brown borders, leather-tan subtle text. Sharp corners, thick borders.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F5EFE0",
        ink: "#1A1410",
        dirt: {
          50: "#F5EFE0",
          100: "#EDE4CF",
          200: "#E0D4B5",
          300: "#C89968",
          500: "#8A6A3A",
          700: "#5E3315",
          900: "#3A1F0D",
        },
        field: {
          400: "#8AAB3A",
          500: "#6B8E23",
          700: "#4A6318",
          900: "#2E4010",
        },
        chalk: "#FAF6EA",
        // Legacy brand-* alias so existing markup auto-themes.
        brand: {
          DEFAULT: "#4A6318",
          50: "#F5EFE0",
          100: "#EDE4CF",
          500: "#8AAB3A",
          600: "#6B8E23",
          700: "#4A6318",
          900: "#2E4010",
        },
        danger: { DEFAULT: "#A4351D", soft: "#F6D9CE" },
        warn: { DEFAULT: "#8A5A0F", soft: "#F1E1B3" },
        ok: { DEFAULT: "#4A6318", soft: "#DDE7BE" },
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        slab: ["var(--font-slab)", "ui-serif", "Georgia", "serif"],
        display: ["var(--font-display)", "Impact", "system-ui", "sans-serif"],
        western: ["var(--font-western)", "Rye", "ui-serif", "serif"],
        type: ["var(--font-type)", "ui-monospace", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "4px 4px 0 0 rgba(94, 51, 21, 0.18)",
        hard: "6px 6px 0 0 #1A1410",
      },
    },
  },
  plugins: [],
};

export default config;
