import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Theme Palette - Extracted from dashboard images
        background: "#1A202C",      // Very dark navy/almost black
        surface: "#2D3748",         // Slightly lighter dark blue-gray
        border: "#4A5568",           // Subtle dark gray
        text: {
          DEFAULT: "#F7FAFC",        // White/very light gray - primary text
          muted: "#A0AEC0",          // Muted gray - secondary text
        },
        accent: {
          1: "#FF6B35",              // Vibrant orange - primary accent
          2: "#00CED1",              // Bright teal/cyan - secondary accent
        },
        // Legacy colors - mapped to new theme
        navy: {
          DEFAULT: "#1A202C",
          dark: "#0f1419",
        },
        brand: {
          DEFAULT: "#FF6B35",        // Mapped to accent1 (vibrant orange)
          dark: "#E55A2B",           // Darker orange for hover states
          light: "#FF8C5A",          // Lighter orange for highlights
          soft: "#2D3748",            // Surface color for backgrounds
        },
        blue: {
          bright: "#00CED1",         // Mapped to accent2 (teal/cyan)
          light: "#4FD1C7",          // Lighter teal
          soft: "#2D3748",           // Surface color
        },
        // Energy/Sustainability Colors
        energy: {
          green: "#10b981",         // Primary energy green
          darkGreen: "#059669",     // Darker green for accents
          lightGreen: "#34d399",     // Light green for highlights
          emerald: "#10b981",       // Emerald for success/energy
        },
        // Status Colors
        success: "#10b981",
        warning: "#f59e0b",
        critical: "#ef4444",
        info: "#00CED1",             // Mapped to accent2 (teal)
        inactive: "#718096",
        white: "#F7FAFC",            // Mapped to text color
        // Background & Typography - dark theme variants
        gray: {
          light: "#4A5568",         // Border color
          medium: "#718096",         // Muted text
          dark: "#A0AEC0",           // Secondary text
        },
        // Chart Colors - updated for dark theme
        chart: {
          selfConsumption: "#10b981",
          export: "#00CED1",         // Teal accent
          arbitrageCharge: "#4FD1C7", // Light teal
          arbitrageDischarge: "#FF6B35", // Orange accent
          evBattery: "#8b5cf6",
          evGrid: "#00CED1",         // Teal accent
          epex: "#FF6B35",           // Orange accent
        },
      },
      backgroundColor: {
        DEFAULT: "var(--color-background)",
        surface: "var(--color-surface)",
      },
      textColor: {
        DEFAULT: "var(--color-text)",
        muted: "var(--color-text-muted)",
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
      },
      backgroundImage: {
        "gradient-hero": "linear-gradient(to right, #1A202C, #FF6B35, #00CED1)",
        "gradient-card": "linear-gradient(to bottom, #2D3748, #1A202C)",
        "gradient-energy": "linear-gradient(to right, #FF6B35, #E55A2B)",
        "gradient-brand": "linear-gradient(to right, #FF6B35, #00CED1)",
        "gradient-accent": "linear-gradient(to right, #FF6B35, #00CED1)",
      },
    },
  },
  plugins: [],
};
export default config;

