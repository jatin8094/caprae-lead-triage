import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        paper: "#FAFAF8",
        line: "#E4E4E1",
        accent: "#2A6F5E",
        accentSoft: "#E4F0EC",
        warn: "#B45309",
        warnSoft: "#FBEFE0",
        cold: "#6B7280",
        coldSoft: "#F1F1EF",
        hot: "#B4232C",
        hotSoft: "#FBE9E9",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
    },
  },
  plugins: [],
};
export default config;
