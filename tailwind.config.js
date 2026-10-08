/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f2f7f4",
          100: "#e1ede6",
          200: "#c4dcce",
          300: "#99c2aa",
          400: "#69a181",
          500: "#468461",
          600: "#346a4d",
          700: "#2a543e",
          800: "#234433",
          900: "#1d382b",
          950: "#0e1f17",
        },
        cream: {
          50: "#fdfcf9",
          100: "#faf7f2",
          200: "#f4ede3",
          300: "#ece0cf",
          400: "#dfcdb4",
          500: "#cfb596",
          600: "#bf9e7d",
          700: "#9e7e61",
          800: "#806650",
          900: "#685443",
        },
        champagne: {
          50: "#fbf9f1",
          100: "#f6f1de",
          200: "#ede1bd",
          300: "#e2ce95",
          400: "#d6b86d",
          500: "#c9a14c",
          600: "#b5873c",
          700: "#926631",
          800: "#79522d",
          900: "#664429",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
