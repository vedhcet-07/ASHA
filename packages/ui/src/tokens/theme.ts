/**
 * ASHA Design Tokens
 *
 * Core color palette and theme tokens for the ASHA platform.
 * Use these tokens across all apps for consistent branding.
 */

export const colors = {
  primary: {
    50: "#F0FDFA",
    100: "#CCFBF1",
    200: "#99F6E4",
    300: "#5EEAD4",
    400: "#2DD4BF",
    500: "#14B8A6",
    600: "#0D9488",
    700: "#0F766E",  // primary brand color
    800: "#115E59",
    900: "#134E4A",
    950: "#042F2E",
  },
  secondary: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316",
    600: "#EA580C",
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
    950: "#431407",
  },
  neutral: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#E5E5E5",
    300: "#D4D4D4",
    400: "#A3A3A3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0A0A0A",
  },
  success: "#16A34A",
  warning: "#EAB308",
  error: "#DC2626",
  info: "#2563EB",
} as const;

export const fontFamily = {
  sans: ["Inter", "Noto Sans Devanagari", "system-ui", "sans-serif"],
  mono: ["JetBrains Mono", "monospace"],
} as const;

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
} as const;

export const borderRadius = {
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
} as const;

export const theme = {
  colors,
  fontFamily,
  spacing,
  borderRadius,
} as const;

export default theme;
