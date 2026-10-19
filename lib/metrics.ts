import { roundMoney } from "./format";
import { sumAmounts, transactionsInMonth, transactionsOnDay } from "./ledger";
import type { Transaction } from "./types";

/** Resting dashboard figures from the approved home screen. Voice entries move them. */
export const ILLUSTRATIVE = {
  monthSpend: 3286,
  todaySpend: 126,
  todayCount: 4,
  budgetLeft: 1714,
  bar: 0.52,
  dailyAvg: 108,
  monthBudget: 5000,
};

export interface HomeKpis {
  monthSpend: number;
  todaySpend: number;
  todayCount: number;
  budgetLeft: number;
  bar: number;
  dailyAvg: number;
}

export function presentKpis(transactions: Transaction[], now: Date): HomeKpis {
  const voice = transactions.filter((item) => item.source === "voice");
  const monthVoice = sumAmounts(transactionsInMonth(voice, now));
  const todayItems = transactionsOnDay(voice, now);
  const todayVoice = sumAmounts(todayItems);
  const budgetLeft = roundMoney(ILLUSTRATIVE.budgetLeft - monthVoice);

  return {
    monthSpend: roundMoney(ILLUSTRATIVE.monthSpend + monthVoice),
    todaySpend: roundMoney(ILLUSTRATIVE.todaySpend + todayVoice),
    todayCount: ILLUSTRATIVE.todayCount + todayItems.length,
    budgetLeft,
    bar: Math.max(0, Math.min(1, (budgetLeft / ILLUSTRATIVE.budgetLeft) * ILLUSTRATIVE.bar)),
    dailyAvg: ILLUSTRATIVE.dailyAvg,
  };
}
