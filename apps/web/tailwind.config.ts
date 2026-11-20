import type { Config } from "tailwindcss";

/** Cor de token com suporte a opacidade do Tailwind (ex.: bg-accent/15). */
const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cosmic: {
          dark: "#050811",
          card: "rgba(11, 17, 32, 0.85)",
          border: "rgba(56, 189, 248, 0.2)",
          cyan: "#06b6d4",
          gold: "#f59e0b",
        },
        // D14 — tokens semânticos (ver src/styles/globals.css)
        bg: token("bg"),
        surface: {
          DEFAULT: token("surface"),
          raised: token("surface-raised"),
          sunken: token("surface-sunken"),
          hover: token("surface-hover"),
        },
        control: token("control"),
        line: {
          DEFAULT: "rgb(var(--color-line) / var(--line-alpha))",
          strong: "rgb(var(--color-line) / var(--line-strong-alpha))",
        },
        fg: {
          DEFAULT: token("fg"),
          secondary: token("fg-secondary"),
          muted: token("fg-muted"),
        },
        accent: {
          DEFAULT: token("accent"),
          hover: token("accent-hover"),
          on: token("on-accent"),
        },
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        cat: {
          politics: token("cat-politics"),
          economy: token("cat-economy"),
          war: token("cat-war"),
          science: token("cat-science"),
          health: token("cat-health"),
        },
        layer: {
          fires: token("layer-fires"),
          events: token("layer-events"),
          satellites: token("layer-satellites"),
          aircraft: token("layer-aircraft"),
          maritime: token("layer-maritime"),
        },
      },
      // D14 — 5 tamanhos de interface. Mínimo 12 px.
      fontSize: {
        caption: ["12px", { lineHeight: "16px" }],
        label: ["13px", { lineHeight: "20px" }],
        body: ["15px", { lineHeight: "24px" }],
        title: ["18px", { lineHeight: "26px" }],
        display: ["24px", { lineHeight: "32px", letterSpacing: "-0.01em" }],
      },
      // Opacidade das superfícies translúcidas sobre o globo (bg-surface/86).
      opacity: {
        86: "0.86",
      },
      borderRadius: {
        control: "6px",
        card: "10px",
        panel: "14px",
      },
      boxShadow: {
        e1: "0 4px 12px rgb(0 0 0 / 0.3)",
        e2: "0 12px 40px rgb(0 0 0 / 0.45)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-merriweather)", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
