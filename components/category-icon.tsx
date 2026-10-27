import { Car, Clapperboard, Ellipsis, HeartPulse, House, ShoppingBag, Utensils, type LucideIcon } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";

const ICONS: Record<CategoryId, LucideIcon> = {
  food: Utensils,
  transit: Car,
  shopping: ShoppingBag,
  fun: Clapperboard,
  home: House,
  health: HeartPulse,
  other: Ellipsis,
};

/** Category colours from the spec (solid for bars, 12% for icon blocks). */
export const CATEGORY_COLOR: Record<CategoryId, string> = {
  food: "#E0A04A",
  transit: "#4C8FE0",
  shopping: "#D4698A",
  fun: "#8574BD",
  home: "#8D735B",
  health: "#2F9B8D",
  other: "#7D8781",
};

export function CategoryIcon({ category }: { category: CategoryId }) {
  const Icon = ICONS[category];
  const color = CATEGORY_COLOR[category] ?? CATEGORIES[category].tint;
  return (
    <span className="cat-ic" style={{ background: `${color}1f`, color }} aria-hidden="true">
      <Icon size={20} strokeWidth={2} />
    </span>
  );
}
