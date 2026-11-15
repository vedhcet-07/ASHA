/**
 * ASHA Chakra UI theme tokens
 */
export const theme = {
  colors: {
    primary: {
      50: "#F0FDFA",
      100: "#CCFBF1",
      200: "#99F6E4",
      300: "#5EEAD4",
      400: "#2DD4BF",
      500: "#0F766E",
      600: "#115E59",
      700: "#134E4A",
      800: "#0F3D3A",
      900: "#0A2E2B",
    },
    success: {
      50: "#F0FDF4",
      500: "#16A34A",
      600: "#15803D",
    },
    warning: {
      50: "#FFFBEB",
      500: "#D97706",
      600: "#B45309",
    },
    danger: {
      50: "#FEF2F2",
      500: "#DC2626",
      600: "#B91C1C",
    },
    info: {
      50: "#EFF6FF",
      500: "#2563EB",
      600: "#1D4ED8",
    },
  },
  fonts: {
    heading: `'Inter', 'Noto Sans Kannada', sans-serif`,
    body: `'Inter', 'Noto Sans Kannada', 'Noto Sans Devanagari', sans-serif`,
  },
  fontSizes: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "28px",
  },
  radii: {
    card: "16px",
    btn: "12px",
    input: "12px",
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "12px",
        fontWeight: "600",
        minH: "48px",
        minW: "48px",
      },
      variants: {
        solid: {
          bg: "primary.500",
          color: "white",
          _hover: { bg: "primary.600" },
        },
        outline: {
          borderColor: "primary.500",
          color: "primary.600",
          _hover: { bg: "primary.50" },
        },
        ghost: {
          color: "primary.600",
          _hover: { bg: "primary.50" },
        },
      },
      defaultProps: {
        colorScheme: "primary",
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: "primary.500",
      },
    },
  },
};
