/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm sand / alabaster tactile palette — driven by CSS variables
        // so the entire app stays adaptable to the domain.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        'canvas-2': 'rgb(var(--canvas-2) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        inset: 'rgb(var(--inset) / <alpha-value>)',
        'inset-2': 'rgb(var(--inset-2) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-2': 'rgb(var(--muted-2) / <alpha-value>)',
        // Semantic domain accents
        accent: 'rgb(var(--accent) / <alpha-value>)',     // teal — primary brand accent
        success: 'rgb(var(--success) / <alpha-value>)',   // emerald — positive/completed
        warning: 'rgb(var(--warning) / <alpha-value>)',   // amber — progress/warnings
        danger: 'rgb(var(--danger) / <alpha-value>)',     // rose — alerts/errors/expenses
        info: 'rgb(var(--info) / <alpha-value>)',         // indigo — secondary metrics
        violet: 'rgb(var(--violet) / <alpha-value>)',    // violet — AI accents
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'tactile-sm': '0 1px 2px rgba(120,113,108,0.07), 0 1px 2px rgba(120,113,108,0.05)',
        'tactile': '0 1px 2px rgba(120,113,108,0.06), 0 4px 14px rgba(120,113,108,0.09)',
        'tactile-lg': '0 4px 10px rgba(120,113,108,0.08), 0 14px 34px rgba(120,113,108,0.14)',
        'tactile-inset': 'inset 0 1px 2px rgba(120,113,108,0.10)',
        'dock': '0 10px 30px rgba(60,55,50,0.20), 0 2px 8px rgba(60,55,50,0.12)',
        'rail': '0 6px 20px rgba(60,55,50,0.16), 0 1px 4px rgba(60,55,50,0.10)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'shimmer': { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
