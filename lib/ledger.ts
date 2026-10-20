import { CATEGORY_ORDER } from "./categories";
import { isSameDay, isSameMonth, roundMoney } from "./format";
import type { CategoryId, Transaction } from "./types";

const QUICK_FALLBACK: CategoryId[] = ["food", "transit", "shopping", "fun"];

/** Top 大类 by use, padded with 餐饮 / 交通 / 购物 / 娱乐. At most four. */
export function frequentCategories(items: Transaction[]): CategoryId[] {
  const counts = new Map<CategoryId, number>();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]))
    .map(([id]) => id);
  const picked: CategoryId[] = [];
  for (const id of [...ranked, ...QUICK_FALLBACK]) {
    if (picked.includes(id)) continue;
    picked.push(id);
    if (picked.length === 4) break;
  }
  return picked;
}

export function sumAmounts(items: Transaction[]): number {
  return roundMoney(items.reduce((total, item) => total + item.amount, 0));
}

export function transactionsOnDay(items: Transaction[], day: Date): Transaction[] {
  return items.filter((item) => isSameDay(new Date(item.createdAt), day));
}

export function transactionsInMonth(items: Transaction[], day: Date): Transaction[] {
  return items.filter((item) => isSameMonth(new Date(item.createdAt), day));
}

export interface DayGroup {
  label: string;
  total: number;
  items: Transaction[];
}

export function groupByDay(
  items: Transaction[],
  now: Date,
  labelFor: (date: Date, now: Date) => string,
): DayGroup[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const groups: DayGroup[] = [];

  for (const item of sorted) {
    const label = labelFor(new Date(item.createdAt), now);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, total: item.amount, items: [item] });
      continue;
    }
    last.items.push(item);
    last.total = roundMoney(last.total + item.amount);
  }

  return groups;
}

export interface CategorySlice {
  category: CategoryId;
  total: number;
  count: number;
  share: number;
}

export function breakdownByCategory(items: Transaction[]): CategorySlice[] {
  const buckets = new Map<CategoryId, { total: number; count: number }>();
  for (const item of items) {
    const current = buckets.get(item.category) ?? { total: 0, count: 0 };
    current.total = roundMoney(current.total + item.amount);
    current.count += 1;
    buckets.set(item.category, current);
  }

  const grand = sumAmounts(items) || 1;
  return [...buckets.entries()]
    .map(([category, bucket]) => ({
      category,
      total: bucket.total,
      count: bucket.count,
      share: bucket.total / grand,
    }))
    .sort((a, b) => b.total - a.total);
}
