"use client";

import { useState } from "react";
import { CATEGORY_COLOR } from "@/components/category-icon";
import { MonthSwitcher } from "@/components/month-switcher";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatYuanTrim } from "@/lib/format";
import { barHeight, breakdownByCategory, expensesOf, incomeOf, sumAmounts, transactionsInMonth, weekTotals } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

export function StatsScreen({ transactions, now }: { transactions: Transaction[]; now: Date }) {
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [mode, setMode] = useState<"expense" | "income">("expense");
  const monthAll = transactionsInMonth(transactions, month);
  const spend = sumAmounts(expensesOf(monthAll));
  const income = sumAmounts(incomeOf(monthAll));
  const items = mode === "income" ? incomeOf(monthAll) : expensesOf(monthAll);
  const total = mode === "income" ? income : spend;
  const weeks = weekTotals(items);
  const peak = Math.max(...weeks, 0);
  const isNow = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  const current = isNow ? Math.min(3, Math.floor((now.getDate() - 1) / 7)) : -1;
  const slices = breakdownByCategory(monthAll, mode);
  const grand = slices.reduce((sum, item) => sum + item.total, 0) || 1;

  return (
    <>
      <h1 className="page-title">统计</h1>
      <div className="seg-capsule" role="tablist" aria-label="支出或收入">
        {(["expense", "income"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} className={cn(mode === k && "on")} onClick={() => setMode(k)}>
            {k === "expense" ? "支出" : "收入"}
          </button>
        ))}
      </div>
      <MonthSwitcher month={month} now={now} onChange={setMonth} />
      <section className="glass hero-card press">
        <span className="lab">{mode === "income" ? "本月收入" : "本月支出"}</span>
        <div className={cn("big", mode === "income" && "income")}>
          <sup>¥</sup>
          {formatYuanTrim(total)}
        </div>
        <p className="hero-note">
          {mode === "income" ? `支出 ¥${formatYuanTrim(spend)}` : `收入 ¥${formatYuanTrim(income)}`}
        </p>
        <div className="bars" aria-hidden="true">
          {weeks.map((value, index) => (
            <div className="bar-col" key={index}>
              <i className={index === current ? "now" : undefined} style={{ height: barHeight(value, peak) }} />
              <span>第{index + 1}周</span>
            </div>
          ))}
        </div>
      </section>
      <h2 className="section-title">{mode === "income" ? "收入分类" : "支出分类"}</h2>
      {slices.length === 0 ? (
        <div className="glass empty-card">
          <b>这段时间还没有账</b>
          <p>记几笔后,这里会出现统计</p>
        </div>
      ) : (
        <div className="glass share-card2">
          {slices.map((slice) => (
            <div className="share-line" key={slice.category}>
              <span className="nm">{CATEGORIES[slice.category].label}</span>
              <span className="trk">
                <i style={{ width: `${Math.max(4, Math.round((slice.total / grand) * 100))}%`, background: CATEGORY_COLOR[slice.category] }} />
              </span>
              <b>¥{formatYuanTrim(slice.total)}</b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
