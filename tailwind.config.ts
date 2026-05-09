import type { Config } from "tailwindcss";

// Token sources that informed this config:
// - ResearchPilot brand (ink + accent palettes — kept original)
// - chatpaper.com extraction via designlang v12.4 (.design-extract-output/)
//   adopted: Poppins, type scale, motion easing/durations, soft shadows, pill radius
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#ececef",
          200: "#d4d4da",
          300: "#a8a8b3",
          400: "#73737e",
          500: "#52525b",
          600: "#3f3f46",
          700: "#2d2d33",
          800: "#1d1d22",
          900: "#0f0f12",
        },
        accent: {
          50: "#eef4ff",
          100: "#dce7ff",
          200: "#bfd1ff",
          300: "#94afff",
          400: "#5e85ff",
          500: "#3b6dff",
          600: "#2d56e6",
          700: "#2143b8",
          800: "#193288",
          900: "#11225e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
      },
      fontSize: {
        // chatpaper.com typographic scale (designlang)
        "display-1": ["48px", { lineHeight: "56px", fontWeight: "600", letterSpacing: "-0.01em" }],
        "display-2": ["36px", { lineHeight: "44px", fontWeight: "600", letterSpacing: "-0.005em" }],
        "display-3": ["24px", { lineHeight: "32px", fontWeight: "500" }],
        "display-4": ["20px", { lineHeight: "28px", fontWeight: "500" }],
      },
      borderRadius: {
        // chatpaper.com radius scale — `pill` = 27px is the signature search-bar corner
        pill: "27px",
      },
      boxShadow: {
        // soft + flat — adopted from chatpaper.com extraction
        xs: "rgba(0, 0, 0, 0.08) 0px 1px 2px 0px",
        soft: "rgba(0, 0, 0, 0.157) 0px 2px 6px 0px",
        glow: "rgba(0, 0, 0, 0.12) 0px 0px 12px 0px",
        lift: "rgba(0, 0, 0, 0.08) 0px 16px 48px 16px, rgba(0, 0, 0, 0.12) 0px 12px 32px 0px, rgba(0, 0, 0, 0.16) 0px 8px 16px -8px",
      },
      transitionDuration: {
        // explicit motion durations — chatpaper.com's xs/sm/md
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
      },
      transitionTimingFunction: {
        // ease-in-out-quart, the chatpaper.com signature curve
        "in-out-quart": "cubic-bezier(0.645, 0.045, 0.355, 1)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)",
        "slide-up": "slideUp 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
