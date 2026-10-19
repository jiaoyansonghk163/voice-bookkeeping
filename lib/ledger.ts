import { isSameDay, isSameMonth, roundMoney } from "./format";
import type { CategoryId, Transaction } from "./types";

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
