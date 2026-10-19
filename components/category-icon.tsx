import {
  Bus,
  Clapperboard,
  Ellipsis,
  House,
  Pill,
  ShoppingBag,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";

const ICONS: Record<CategoryId, LucideIcon> = {
  food: Utensils,
  transit: Bus,
  shopping: ShoppingBag,
  daily: Sparkles,
  fun: Clapperboard,
  home: House,
  health: Pill,
  other: Ellipsis,
};

export function CategoryIcon({ category }: { category: CategoryId }) {
  const meta = CATEGORIES[category];
  const Icon = ICONS[category];
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-full"
      style={{ backgroundColor: `${meta.tint}18`, color: meta.tint }}
    >
      <Icon size={16} strokeWidth={1.75} />
    </span>
  );
}
