import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#ea580c",
      },
      animation: {
        "pulse-slow": "pulse-slow 15s infinite ease-in-out",
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: "0.95", transform: "scale(1.05)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
