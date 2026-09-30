// Centralized theme configuration for CAFE POS
export const themeConfig = {
  brandName: "CAFE POS",
  cafeName: "YOUR CAFE",
  tagline: "Artisanal Coffee & Fresh Eats",
  accentColor: "amber", // 'amber' | 'emerald' | 'indigo' | 'rose'
  colors: {
    primary: {
      light: "#fef3c7",
      main: "#f59e0b",
      dark: "#d97706",
      hover: "#b45309",
      accent: "#78350f"
    },
    status: {
      ready: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", dot: "bg-emerald-500" },
      warning: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", dot: "bg-amber-500" },
      offline: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20", dot: "bg-rose-500" }
    }
  }
};
