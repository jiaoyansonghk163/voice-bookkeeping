import { CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";

export type GlyphName = "bowl" | "train" | "cup" | "cart" | "ticket" | "home" | "health" | "other";

export interface Tone {
  bg: string;
  fg: string;
  glyph: GlyphName;
}

const FOOD: Tone = { bg: "#fff1e6", fg: "#f97316", glyph: "bowl" };
const TRANSIT: Tone = { bg: "#e8f1ff", fg: "#3b82f6", glyph: "train" };
const DAILY: Tone = { bg: "#e7f8ef", fg: "#10b981", glyph: "cart" };
const FUN: Tone = { bg: "#fde8f1", fg: "#ec4899", glyph: "ticket" };
const HOME: Tone = { bg: "#fff6e0", fg: "#f59e0b", glyph: "home" };
const HEALTH: Tone = { bg: "#e6faf6", fg: "#14b8a6", glyph: "health" };
const OTHER: Tone = { bg: "#f1f5f9", fg: "#64748b", glyph: "other" };

const BY_CATEGORY: Record<CategoryId, Tone> = {
  food: FOOD,
  transit: TRANSIT,
  shopping: DAILY,
  fun: FUN,
  home: HOME,
  health: HEALTH,
  other: OTHER,
};

export function toneFor(_title: string, category: CategoryId): Tone {
  return BY_CATEGORY[category];
}

export function Glyph({ name, size = 24, strokeWidth = 2 }: { name: GlyphName; size?: number; strokeWidth?: number }) {
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
