"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Amount } from "@/components/amount";
import { CategoryIcon } from "@/components/category-icon";
import { CATEGORIES } from "@/lib/categories";
import { formatMonth, formatYuan } from "@/lib/format";
import { breakdownByCategory, sumAmounts, transactionsInMonth } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

function largestRemainder(shares: number[]): number[] {
  if (shares.length === 0) return [];
  const raw = shares.map((share) => share * 100);
  const floors = raw.map((value) => Math.floor(value));
  let leftover = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  for (const item of order) {
    if (leftover <= 0) break;
    floors[item.index] += 1;
    leftover -= 1;
  }
  return floors;
}

export function InsightsScreen({
  transactions,
  now,
  onReset,
}: {
  transactions: Transaction[];
  now: Date;
  onReset: () => void;
}) {
  const monthItems = transactionsInMonth(transactions, now);
  const slices = breakdownByCategory(monthItems);
  const percents = useMemo(() => largestRemainder(slices.map((slice) => slice.share)), [slices]);
  const total = sumAmounts(monthItems);

  return (
    <div data-screen="categories" className="px-5 pt-7">
      <header className="flex items-center justify-between">
        <p className="text-[15px] font-medium text-white">璃记</p>
        <p className="chip rounded-full px-3 py-1 text-[12px] text-white/85">示例</p>
      </header>

      <p className="mt-12 text-[15px] text-white/70">本月支出</p>
      <Amount value={total} size="xl" tone="light" className="mt-2" />
      <p className="mt-4 text-[15px] text-white/60">
        {formatMonth(now)} · {monthItems.length} 笔
      </p>

      <div className="glass glass-clip mt-8">
        {slices.length === 0 && <p className="px-5 py-12 text-center text-[17px]">这个月还没有支出</p>}
        {slices.map((slice, index) => (
          <div key={slice.category} className="hairline px-4 py-3.5">
            <div className="flex items-center gap-3">
              <CategoryIcon category={slice.category} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[17px] font-medium">{CATEGORIES[slice.category].label}</p>
                  <p className="font-num text-[17px] font-medium">¥{formatYuan(slice.total)}</p>
                </div>
                <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-black/8">
                  <motion.div
                    className="h-full rounded-full bg-ink"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(percents[index] ?? 0, 3)}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 22, delay: index * 0.04 }}
                  />
                </div>
                <p className="mt-1.5 text-[12px] text-quiet">
                  {percents[index] ?? 0}% · {slice.count} 笔
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={onReset} className="mx-auto mt-6 block px-3 py-2 text-[13px] text-white/55">
        恢复示例数据
      </button>
    </div>
  );
}
