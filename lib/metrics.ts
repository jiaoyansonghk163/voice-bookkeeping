import { roundMoney, startOfDay } from "./format";
import { expensesOf, incomeOf, sumAmounts, transactionsInMonth, transactionsOnDay } from "./ledger";
import type { Transaction } from "./types";

export interface DayPoint {
  date: Date;
  total: number;
}

export interface HomeKpis {
  monthSpend: number;
  todaySpend: number;
  todayIncome: number;
  monthIncome: number;
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
    days.push({ date, total: sumAmounts(expensesOf(transactionsOnDay(transactions, date))) });
  }
  return days;
}

export function presentKpis(
  transactions: Transaction[],
  now: Date,
  monthlyBudget: number | null,
): HomeKpis {
  const monthItems = transactionsInMonth(transactions, now);
  const monthSpend = sumAmounts(expensesOf(monthItems));
  const todayAll = transactionsOnDay(transactions, now);
  const todayItems = expensesOf(todayAll);
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousSpend = sumAmounts(expensesOf(transactionsInMonth(transactions, previous)));
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
    todayIncome: sumAmounts(incomeOf(todayAll)),
    monthIncome: sumAmounts(incomeOf(monthItems)),
    todayCount: todayItems.length,
    delta: previousSpend > 0 ? (monthSpend - previousSpend) / previousSpend : null,
    dailyAvg,
    days,
    budgetLeft,
    bar,
  };
}
