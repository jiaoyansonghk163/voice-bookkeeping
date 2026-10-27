import { ArrowDownLeft, Car, Clapperboard, Ellipsis, HeartPulse, House, ShoppingBag, Utensils, type LucideIcon } from "lucide-react";
import { CATEGORIES, isIncomeCategory } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";

const ICONS: Record<CategoryId, LucideIcon> = {
  food: Utensils,
  transit: Car,
  shopping: ShoppingBag,
  fun: Clapperboard,
  home: House,
  health: HeartPulse,
  other: Ellipsis,
  salary: ArrowDownLeft,
  bonus: ArrowDownLeft,
  redpacket: ArrowDownLeft,
  refund: ArrowDownLeft,
  income_other: ArrowDownLeft,
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
  salary: "#0B7F73",
  bonus: "#0B7F73",
  redpacket: "#0B7F73",
  refund: "#0B7F73",
  income_other: "#0B7F73",
};

export function CategoryIcon({ category }: { category: CategoryId }) {
  const Icon = ICONS[category];
  const color = CATEGORY_COLOR[category] ?? CATEGORIES[category].tint;
  return (
    <span className="cat-ic" style={{ background: `${color}${isIncomeCategory(category) ? "1f" : "1f"}`, color }} aria-hidden="true">
      <Icon size={20} strokeWidth={2.2} />
    </span>
  );
}
