"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Amount } from "@/components/amount";
import { CategoryIcon } from "@/components/category-icon";
import { formatClock, formatDayGroup, formatFullDate, formatYuan } from "@/lib/format";
import { groupByDay, sumAmounts, transactionsInMonth, transactionsOnDay } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

function useAnimatedNumber(value: number) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const from = display;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 520);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // display is the animation origin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  return display;
}

export function HomeScreen({
  transactions,
  now,
  highlightId,
  onOpen,
}: {
  transactions: Transaction[];
  now: Date;
  highlightId: string | null;
  onOpen: (id: string) => void;
}) {
  const today = transactionsOnDay(transactions, now);
  const month = transactionsInMonth(transactions, now);
  const todayTotal = useAnimatedNumber(sumAmounts(today));
  const groups = groupByDay(transactions, now, formatDayGroup);

  useEffect(() => {
    if (!highlightId) return;
    document.getElementById(`tx-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId]);

  return (
    <div data-screen="home" className="px-5 pt-8">
      <p className="text-[13px] text-quiet">{formatFullDate(now)}</p>
      <h1 className="mt-1 text-[34px] font-semibold leading-none tracking-tight">账本</h1>
      <p className="mt-10 text-[13px] text-quiet">今日支出</p>
      <Amount value={todayTotal} size="hero" className="mt-2" />
      <p className="mt-3 text-[15px] text-quiet">
        {today.length} 笔 · 本月 ¥{formatYuan(sumAmounts(month))}
      </p>

      <div className="material mt-8 overflow-hidden">
        {groups.length === 0 && <p className="px-4 py-10 text-center text-[17px] text-quiet">还没有记下开销</p>}
        {groups.map((group) => (
          <section key={group.label}>
            <div className="flex items-baseline justify-between px-4 pt-4 pb-1 text-[13px] text-quiet">
              <h2>{group.label}</h2>
              <p className="font-num">¥{formatYuan(group.total)}</p>
            </div>
            {group.items.map((item) => {
              const highlighted = item.id === highlightId;
              return (
                <motion.button
                  key={item.id}
                  id={`tx-${item.id}`}
                  type="button"
                  onClick={() => onOpen(item.id)}
                  initial={highlighted ? { opacity: 0, y: -12 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="hairline relative flex w-full items-center gap-3 px-4 py-3 text-left active:bg-black/5"
                >
                  {highlighted && (
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[#007aff]/10"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                    />
                  )}
                  <CategoryIcon category={item.category} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[17px]">{item.title}</span>
                      <span className="font-num shrink-0 text-[17px]">−{formatYuan(item.amount)}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] text-quiet">
                      {formatClock(new Date(item.createdAt))}
                      {item.source === "voice" ? " · 语音" : ""}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </section>
        ))}
      </div>
      <p className="mt-6 text-center text-[12px] text-quiet">金额均为虚构示例</p>
    </div>
  );
}
