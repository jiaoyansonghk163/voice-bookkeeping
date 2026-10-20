import { roundMoney, startOfDay } from "./format";
import { sumAmounts, transactionsInMonth, transactionsOnDay } from "./ledger";
import type { Transaction } from "./types";

export interface DayPoint {
  date: Date;
  total: number;
}

export interface HomeKpis {
  monthSpend: number;
  todaySpend: number;
  todayCount: number;
  /** Change versus last month. Null when last month has no bills to compare. */
  delta: number | null;
  dailyAvg: number;
  days: DayPoint[];
  budgetLeft: number | null;
  bar: number | null;
}

export function lastSevenDays(transactions: Transaction[], now: Date): DayPoint[] {
  const start = startOfDay(now);
  const days: DayPoint[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(start);
    date.setDate(start.getDate() - offset);
    days.push({ date, total: sumAmounts(transactionsOnDay(transactions, date)) });
  }
  return days;
}

export function presentKpis(
  transactions: Transaction[],
  now: Date,
  monthlyBudget: number | null,
): HomeKpis {
  const monthSpend = sumAmounts(transactionsInMonth(transactions, now));
  const todayItems = transactionsOnDay(transactions, now);
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousSpend = sumAmounts(transactionsInMonth(transactions, previous));
  const days = lastSevenDays(transactions, now);
  const dailyAvg = roundMoney(days.reduce((total, day) => total + day.total, 0) / 7);
  const budgetLeft =
    monthlyBudget == null ? null : roundMoney(monthlyBudget - monthSpend);
  const bar =
    monthlyBudget == null || monthlyBudget <= 0 || budgetLeft == null
      ? null
      : Math.max(0, Math.min(1, budgetLeft / monthlyBudget));

  return {
    monthSpend,
    todaySpend: sumAmounts(todayItems),
    todayCount: todayItems.length,
    delta: previousSpend > 0 ? (monthSpend - previousSpend) / previousSpend : null,
    dailyAvg,
    days,
    budgetLeft,
    bar,
  };
}
