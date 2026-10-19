import { CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";

export type GlyphName = "bowl" | "train" | "cup" | "cart" | "ticket" | "home" | "health" | "other";

export interface Tone {
  bg: string;
  fg: string;
  glyph: GlyphName;
}

const FOOD: Tone = { bg: "rgba(251,146,60,.14)", fg: "#fdba74", glyph: "bowl" };
const TRANSIT: Tone = { bg: "rgba(59,130,246,.16)", fg: "#93c5fd", glyph: "train" };
const CUP: Tone = { bg: "rgba(167,139,250,.16)", fg: "#c4b5fd", glyph: "cup" };
const DAILY: Tone = { bg: "rgba(52,211,153,.14)", fg: "#6ee7b7", glyph: "cart" };
const FUN: Tone = { bg: "rgba(244,114,182,.14)", fg: "#f9a8d4", glyph: "ticket" };
const HOME: Tone = { bg: "rgba(251,191,36,.14)", fg: "#fcd34d", glyph: "home" };
const HEALTH: Tone = { bg: "rgba(45,212,191,.14)", fg: "#5eead4", glyph: "health" };
const OTHER: Tone = { bg: "rgba(148,163,184,.16)", fg: "#cbd5e1", glyph: "other" };

const BY_CATEGORY: Record<CategoryId, Tone> = {
  food: FOOD,
  transit: TRANSIT,
  shopping: CUP,
  daily: DAILY,
  fun: FUN,
  home: HOME,
  health: HEALTH,
  other: OTHER,
};

export function toneFor(title: string, category: CategoryId): Tone {
  if (/咖啡|奶茶/.test(title)) return CUP;
  if (/电影/.test(title)) return FUN;
  if (/地铁|公交|高铁|火车/.test(title)) return TRANSIT;
  if (/超市|买菜/.test(title)) return DAILY;
  return BY_CATEGORY[category];
}

export function Glyph({ name, size = 20, strokeWidth = 1.8 }: { name: GlyphName; size?: number; strokeWidth?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "bowl") {
    return (
      <svg {...props}>
        <path d="M4 11h16a8 8 0 01-16 0zM8 3v4M12 3v4M16 3v4" />
      </svg>
    );
  }
  if (name === "train") {
    return (
      <svg {...props}>
        <rect x="5" y="3" width="14" height="14" rx="3" />
        <path d="M5 11h14M8 21l2-4M16 21l-2-4" />
        <circle cx="9" cy="14" r=".6" fill="currentColor" stroke="none" />
        <circle cx="15" cy="14" r=".6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === "cup") {
    return (
      <svg {...props}>
        <path d="M5 8h12v6a5 5 0 01-5 5h-2a5 5 0 01-5-5zM17 10h1.5a2.5 2.5 0 010 5H17M9 2.5v2M13 2.5v2" />
      </svg>
    );
  }
  if (name === "cart") {
    return (
      <svg {...props}>
        <path d="M3 4h2l2.2 10.5a1.5 1.5 0 001.5 1.2h8.6a1.5 1.5 0 001.5-1.2L20 7H6" />
        <circle cx="9.5" cy="19.5" r="1.3" />
        <circle cx="17" cy="19.5" r="1.3" />
      </svg>
    );
  }
  if (name === "ticket") {
    return (
      <svg {...props}>
        <rect x="3" y="6" width="18" height="12" rx="2.5" />
        <path d="M10 9.5l4.5 2.5-4.5 2.5z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "home") {
    return (
      <svg {...props}>
        <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === "health") {
    return (
      <svg {...props}>
        <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function categoryChipStyle(category: CategoryId): { background: string; color: string } {
  const tone = BY_CATEGORY[category];
  return { background: tone.bg, color: tone.fg };
}

export function categoryGlyph(category: CategoryId): GlyphName {
  return BY_CATEGORY[category].glyph;
}

export function categoryName(category: CategoryId): string {
  return CATEGORIES[category].label;
}
