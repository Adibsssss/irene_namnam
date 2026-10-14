import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dedication & birthday: a blessing-blue sky as the anchor color,
        // warmed by an antique-gold "candle" accent and a soft blush used
        // the way flowers show up at a christening — sparingly, as trim,
        // never as a competing hue.
        ink: "#1b2a52", // dusk-blue for all body/heading text
        paper: "#f6f9ff", // near-white with a whisper of blue
        line: "#dce6f7", // pale blue hairline/border
        muted: "#5c6b8c", // blue-grey secondary text
        coral: "#d9a63e", // antique gold — primary action / candlelight accent
        peach: "#f0c4bc", // soft blush — tape, gentle fills
        butter: "#8fc3ec", // sky blue — the lightest "main color" note
        sage: "#9fc7b8", // quiet eucalyptus green, used sparingly
        plum: "#14204a", // deep midnight blue — hero, overlays, lightbox
        rose: "#d98f76", // dusty blush-terracotta, sparing warm highlight
      },
      fontFamily: {
        // Names come from the @fontsource-variable packages imported in
        // app/layout.tsx, not next/font — see the comment there.
        sans: ["DM Sans Variable", "system-ui", "sans-serif"],
        display: ["Playfair Display Variable", "Georgia", "serif"],
      },
      transitionDuration: {
        150: "150ms",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "float-in": {
          "0%": { transform: "translateY(14px) scale(0.96)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.03)" },
        },
        "glow-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(217,166,62,0.5)" },
          "70%": { boxShadow: "0 0 0 16px rgba(217,166,62,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(217,166,62,0)" },
        },
        tick: {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.28)" },
          "100%": { transform: "scale(1)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "halo-drift": {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.55" },
          "50%": { transform: "translateY(-6px) scale(1.03)", opacity: "0.8" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
        "float-in": "float-in 450ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        breathe: "breathe 3.2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 1.6s ease-out 2",
        tick: "tick 420ms ease-out",
        "pop-in": "pop-in 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "halo-drift": "halo-drift 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
