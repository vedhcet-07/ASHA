// @ts-check
/**
 * Shared Tailwind CSS base configuration for ASHA apps.
 *
 * Usage in an app:
 *   // tailwind.config.js
 *   import { ashaBase } from "@asha/config/tailwind";
 *   export default {
 *     ...ashaBase,
 *     content: ["./src/**\/*.{ts,tsx}", ...ashaBase.content],
 *   };
 */

/** @type {import("tailwindcss").Config} */
export const ashaBase = {
  content: [],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e6fffa",
          100: "#b2f5ea",
          200: "#81e6d9",
          300: "#4fd1c5",
          400: "#38b2ac",
          500: "#319795",
          600: "#2c7a7b",
          700: "#285e61",
          800: "#234e52",
          900: "#1d4044",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
    },
  },
  plugins: [],
};

export default ashaBase;
