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
    <div data-screen="categories" className="px-5 pt-8">
      <p className="text-[13px] text-quiet">{formatMonth(now)}</p>
      <h1 className="mt-1 text-[34px] font-semibold leading-none tracking-tight">分类</h1>
      <p className="mt-10 text-[13px] text-quiet">本月支出</p>
      <Amount value={total} size="hero" className="mt-2" />
      <p className="mt-3 text-[15px] text-quiet">{monthItems.length} 笔</p>

      <div className="material mt-8 overflow-hidden">
        {slices.length === 0 && <p className="px-4 py-10 text-center text-[17px] text-quiet">这个月还没有支出</p>}
        {slices.map((slice, index) => (
          <div key={slice.category} className="hairline px-4 py-3.5">
            <div className="flex items-center gap-3">
              <CategoryIcon category={slice.category} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[17px]">{CATEGORIES[slice.category].label}</p>
                  <p className="font-num text-[17px]">¥{formatYuan(slice.total)}</p>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/6">
                  <motion.div
                    className="h-full rounded-full bg-blue"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(percents[index] ?? 0, 4)}%` }}
                    transition={{ type: "spring", stiffness: 140, damping: 24, delay: index * 0.03 }}
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

      <button type="button" onClick={onReset} className="mx-auto mt-8 block text-[13px] text-blue">
        恢复示例数据
      </button>
    </div>
  );
}
