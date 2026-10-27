import { CATEGORY_ORDER } from "./categories";
import { isSameDay, isSameMonth, roundMoney } from "./format";
import type { CategoryId, Transaction } from "./types";

export function isIncome(item: Transaction): boolean {
  return item.kind === "income";
}

export function expensesOf(items: Transaction[]): Transaction[] {
  return items.filter((item) => !isIncome(item));
}

export function incomeOf(items: Transaction[]): Transaction[] {
  return items.filter(isIncome);
}

const QUICK_FALLBACK: CategoryId[] = ["food", "transit", "shopping", "fun"];

/** Top 大类 by use, padded with 餐饮 / 交通 / 购物 / 娱乐. At most four. */
export function frequentCategories(items: Transaction[]): CategoryId[] {
  const counts = new Map<CategoryId, number>();
  for (const item of expensesOf(items)) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
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
      groups.push({ label, total: isIncome(item) ? 0 : item.amount, items: [item] });
      continue;
    }
    last.items.push(item);
    if (!isIncome(item)) last.total = roundMoney(last.total + item.amount);
  }

  return groups;
}

export interface CategorySlice {
  category: CategoryId;
  total: number;
  count: number;
  share: number;
}

export function breakdownByCategory(all: Transaction[], kind: "expense" | "income" = "expense"): CategorySlice[] {
  const items = kind === "income" ? incomeOf(all) : expensesOf(all);
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

export function shiftMonth(base: Date, delta: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

export interface BillFilter {
  query?: string;
  category?: CategoryId | null;
}

/** Search title and note; optionally one category. */
export function filterBills(items: Transaction[], filter: BillFilter): Transaction[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  return items.filter((item) => {
    if (filter.category && item.category !== filter.category) return false;
    if (!q) return true;
    return item.title.toLowerCase().includes(q) || (item.note ?? "").toLowerCase().includes(q);
  });
}

export interface BillPatch {
  amount?: number;
  title?: string;
  category?: CategoryId;
  subcategory?: string;
  note?: string;
  createdAt?: string;
  kind?: "expense" | "income";
}

/** Apply an edit. Income carries kind "income"; expense drops the field. */
export function applyEdit(item: Transaction, patch: BillPatch, at: Date = new Date()): Transaction {
  const next: Transaction = { ...item, ...patch, updatedAt: at.toISOString() };
  if (patch.note !== undefined && !patch.note.trim()) delete next.note;
  if (next.kind !== "income") delete next.kind;
  return next;
}

export function weekTotals(items: Transaction[]): number[] {
  const totals = [0, 0, 0, 0];
  for (const item of items) {
    const day = new Date(item.createdAt).getDate();
    totals[Math.min(3, Math.floor((day - 1) / 7))] += item.amount;
  }
  return totals.map((value) => roundMoney(value));
}

/** Bar height in px: proportional to the data (max 90), never below 18. */
export function barHeight(value: number, peak: number): number {
  if (peak <= 0) return 18;
  return Math.max(18, Math.round((value / peak) * 90));
}

