/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Kannada", "Noto Sans Devanagari", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
        input: "12px",
      },
    },
  },
  plugins: [],
};
