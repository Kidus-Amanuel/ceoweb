/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Radius scale using CSS var for global control
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        none: "0px",
        xs: "2px",
        DEFAULT: "6px", // matches md
        xl: "12px",
        full: "9999px",
      },

      // Semantic color system using HSL CSS variables
      colors: {
        // Page-level
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Surfaces
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        surface: "hsl(var(--surface))", // NEW: for cards, modals, panels

        // Text & UI semantics
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // Borders & inputs
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Status colors (aligned with semantic roles)
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))", // alias for destructive clarity
          foreground: "hsl(var(--error-foreground))",
        },

        // Chart palette (unchanged)
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },

      // Typography scale (Notion-inspired hierarchy)
      fontSize: {
        "page-title": ["2rem", { lineHeight: "1.2", fontWeight: "600" }],
        "section-title": ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        "card-title": ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5" }],
        label: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
        caption: ["0.875rem", { lineHeight: "1.4" }],
      },

      // Subtle shadow system (minimal depth)
      boxShadow: {
        xs: "0 1px 2px 0 hsl(0deg 0% 0% / 0.05)",
        sm: "0 1px 3px 0 hsl(0deg 0% 0% / 0.1), 0 1px 2px -1px hsl(0deg 0% 0% / 0.1)",
        DEFAULT:
          "0 4px 6px -1px hsl(0deg 0% 0% / 0.1), 0 2px 4px -2px hsl(0deg 0% 0% / 0.1)",
        md: "0 4px 6px -1px hsl(0deg 0% 0% / 0.1), 0 2px 4px -2px hsl(0deg 0% 0% / 0.1)",
        lg: "0 10px 15px -3px hsl(0deg 0% 0% / 0.1), 0 4px 6px -4px hsl(0deg 0% 0% / 0.1)",
      },

      // Ensure focus rings respect semantic primary
      outline: {
        primary: ["2px solid hsl(var(--primary)/0.5)", "2px"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
