import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const chakraTheme = extendTheme({
  config,
  colors: {
    brand: {
      50:  "#fff8ed",
      100: "#ffefd3",
      200: "#ffdba5",
      300: "#ffbf6d",
      400: "#ff9b33",
      500: "#ff7c0a",
      600: "#f06000",
      700: "#c74700",
      800: "#9e3800",
      900: "#7f2f00",
    },
  },
  fonts: {
    heading: `"Inter", "Noto Sans Kannada", "Noto Sans Devanagari", ui-sans-serif, system-ui, sans-serif`,
    body: `"Inter", "Noto Sans Kannada", "Noto Sans Devanagari", ui-sans-serif, system-ui, sans-serif`,
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: "brand",
      },
    },
  },
});

export default chakraTheme;
