import type { Config } from "tailwindcss";

export default {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontFamily: {
      montserrat: ["Montserrat", "sans-serif"],
      yesteryear: ["Yesteryear", "cursive"],
    },
    extend: {
      colors: {
        // Core semantic colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        overlay: "hsl(var(--overlay))",

        // Primary palette
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        // Status colors
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },

        // UI elements
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          "foreground-on-card": "hsl(var(--muted-foreground-on-card))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Sidebar
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // Button tokens
        btn: {
          primary: {
            DEFAULT: "hsl(var(--btn-primary))",
            foreground: "hsl(var(--btn-primary-foreground))",
            hover: "hsl(var(--btn-primary-hover))",
          },
          secondary: {
            DEFAULT: "hsl(var(--btn-secondary))",
            foreground: "hsl(var(--btn-secondary-foreground))",
            hover: "hsl(var(--btn-secondary-hover))",
          },
          ghost: {
            foreground: "hsl(var(--btn-ghost-foreground))",
            hover: "hsl(var(--btn-ghost-hover))",
          },
          outline: {
            DEFAULT: "hsl(var(--btn-outline))",
            border: "hsl(var(--btn-outline-border))",
            foreground: "hsl(var(--btn-outline-foreground))",
            hover: "hsl(var(--btn-outline-hover))",
          },
          "landing-primary": {
            DEFAULT: "hsl(var(--btn-landing-primary))",
            foreground: "hsl(var(--btn-landing-primary-foreground))",
            hover: "hsl(var(--btn-landing-primary-hover))",
          },
          "landing-secondary": {
            DEFAULT: "hsl(var(--btn-landing-secondary))",
            foreground: "hsl(var(--btn-landing-secondary-foreground))",
            hover: "hsl(var(--btn-landing-secondary-hover))",
          },
          "landing-outline": {
            border: "hsl(var(--btn-landing-outline-border))",
            foreground: "hsl(var(--btn-landing-outline-foreground))",
            hover: "hsl(var(--btn-landing-outline-hover))",
          },
          "landing-header": {
            DEFAULT: "hsl(var(--btn-landing-header))",
            foreground: "hsl(var(--btn-landing-header-foreground))",
            hover: "hsl(var(--btn-landing-header-hover))",
          },
        },

        // Icon tokens
        icon: {
          DEFAULT: "hsl(var(--icon-default))",
          muted: "hsl(var(--icon-muted))",
          primary: "hsl(var(--icon-primary))",
          "on-card": "hsl(var(--icon-on-card))",
          "on-card-muted": "hsl(var(--icon-on-card-muted))",
        },

        // Role accent (changes based on data-dashboard attribute)
        role: {
          accent: {
            DEFAULT: "hsl(var(--role-accent))",
            hover: "hsl(var(--role-accent-hover))",
            foreground: "hsl(var(--role-accent-foreground))",
            muted: "hsl(var(--role-accent-muted))",
          },
        },

        // Dashboard-specific tokens (active within data-area="dashboard")
        dash: {
          bg: "hsl(var(--dash-bg))",
          surface: {
            DEFAULT: "hsl(var(--dash-surface))",
            2: "hsl(var(--dash-surface-2))",
          },
          border: {
            DEFAULT: "hsl(var(--dash-border))",
            "on-dark": "hsl(var(--dash-border-on-dark))",
          },
          text: {
            DEFAULT: "hsl(var(--dash-text))",
            muted: "hsl(var(--dash-text-muted))",
            "on-surface": "hsl(var(--dash-text-on-surface))",
            "muted-on-surface": "hsl(var(--dash-text-muted-on-surface))",
          },
          input: {
            bg: "hsl(var(--dash-input-bg))",
            border: "hsl(var(--dash-input-border))",
            "border-focus": "hsl(var(--dash-input-border-focus))",
            placeholder: "hsl(var(--dash-placeholder))",
            text: "hsl(var(--dash-input-text))",
          },
          dialog: {
            bg: "hsl(var(--dash-dialog-bg))",
            text: "hsl(var(--dash-dialog-text))",
            border: "hsl(var(--dash-dialog-border))",
          },
          primary: {
            DEFAULT: "hsl(var(--dash-primary))",
            foreground: "hsl(var(--dash-primary-foreground))",
            hover: "hsl(var(--dash-primary-hover))",
          },
          secondary: {
            DEFAULT: "hsl(var(--dash-secondary))",
            foreground: "hsl(var(--dash-secondary-foreground))",
            hover: "hsl(var(--dash-secondary-hover))",
          },
          ghost: {
            hover: "hsl(var(--dash-ghost-hover))",
            "hover-on-dark": "hsl(var(--dash-ghost-hover-on-dark))",
          },
          outline: {
            border: "hsl(var(--dash-outline-border))",
            hover: "hsl(var(--dash-outline-hover))",
          },
          destructive: {
            DEFAULT: "hsl(var(--dash-destructive))",
            foreground: "hsl(var(--dash-destructive-foreground))",
            hover: "hsl(var(--dash-destructive-hover))",
          },
        },

        // Page-specific backgrounds
        page: {
          lessons: "hsl(var(--page-lessons))",
          contact: "hsl(var(--page-contact))",
        },

        // Schedule colors for student identification
        schedule: {
          1: {
            bg: "hsl(var(--schedule-1-bg))",
            text: "hsl(var(--schedule-1-text))",
            border: "hsl(var(--schedule-1-border))",
            hover: "hsl(var(--schedule-1-hover))",
          },
          2: {
            bg: "hsl(var(--schedule-2-bg))",
            text: "hsl(var(--schedule-2-text))",
            border: "hsl(var(--schedule-2-border))",
            hover: "hsl(var(--schedule-2-hover))",
          },
          3: {
            bg: "hsl(var(--schedule-3-bg))",
            text: "hsl(var(--schedule-3-text))",
            border: "hsl(var(--schedule-3-border))",
            hover: "hsl(var(--schedule-3-hover))",
          },
          4: {
            bg: "hsl(var(--schedule-4-bg))",
            text: "hsl(var(--schedule-4-text))",
            border: "hsl(var(--schedule-4-border))",
            hover: "hsl(var(--schedule-4-hover))",
          },
          5: {
            bg: "hsl(var(--schedule-5-bg))",
            text: "hsl(var(--schedule-5-text))",
            border: "hsl(var(--schedule-5-border))",
            hover: "hsl(var(--schedule-5-hover))",
          },
          6: {
            bg: "hsl(var(--schedule-6-bg))",
            text: "hsl(var(--schedule-6-text))",
            border: "hsl(var(--schedule-6-border))",
            hover: "hsl(var(--schedule-6-hover))",
          },
          7: {
            bg: "hsl(var(--schedule-7-bg))",
            text: "hsl(var(--schedule-7-text))",
            border: "hsl(var(--schedule-7-border))",
            hover: "hsl(var(--schedule-7-hover))",
          },
          8: {
            bg: "hsl(var(--schedule-8-bg))",
            text: "hsl(var(--schedule-8-text))",
            border: "hsl(var(--schedule-8-border))",
            hover: "hsl(var(--schedule-8-hover))",
          },
          9: {
            bg: "hsl(var(--schedule-9-bg))",
            text: "hsl(var(--schedule-9-text))",
            border: "hsl(var(--schedule-9-border))",
            hover: "hsl(var(--schedule-9-hover))",
          },
          10: {
            bg: "hsl(var(--schedule-10-bg))",
            text: "hsl(var(--schedule-10-text))",
            border: "hsl(var(--schedule-10-border))",
            hover: "hsl(var(--schedule-10-hover))",
          },
          trial: {
            bg: "hsl(var(--schedule-trial-bg))",
            text: "hsl(var(--schedule-trial-text))",
            border: "hsl(var(--schedule-trial-border))",
            hover: "hsl(var(--schedule-trial-hover))",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
