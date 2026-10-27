"use client";

import { useEffect, useState } from "react";
import { formatYuanTrim } from "@/lib/format";
import { presentKpis } from "@/lib/metrics";
import type { Transaction } from "@/lib/types";

export function BudgetScreen({
  transactions,
  now,
  monthlyBudget,
  onSave,
}: {
  transactions: Transaction[];
  now: Date;
  monthlyBudget: number | null;
  onSave: (amount: number | null) => void;
}) {
  const kpis = presentKpis(transactions, now, monthlyBudget);
  const [text, setText] = useState(monthlyBudget == null ? "" : String(monthlyBudget));

  useEffect(() => {
    setText(monthlyBudget == null ? "" : String(monthlyBudget));
  }, [monthlyBudget]);

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onSave(null);
      return;
    }
    const amount = Number(trimmed);
    if (!Number.isFinite(amount) || amount < 0) return;
    onSave(Math.round(amount * 100) / 100);
  };

  return (
    <>
      <h1 className="page-title">预算</h1>
      <p className="page-sub">本月 · {now.getMonth() + 1}月</p>
      <section className="glass hero-card">
        <div className="ph" style={{ marginTop: 0 }}>
          <h2>本月预算</h2>
          <span className="num" style={{ color: "var(--text)", fontWeight: 600 }}>
            {monthlyBudget == null ? "未设置" : `¥${formatYuanTrim(monthlyBudget)}`}
          </span>
        </div>
        <div className="hero" style={{ marginBottom: 8 }}>
          <div className="lab">预算剩余</div>
          <div className={kpis.budgetLeft == null ? "sum unset" : "sum num"}>
            {kpis.budgetLeft == null ? (
              "未设置"
            ) : (
              <>
                <small>¥</small>
                {formatYuanTrim(kpis.budgetLeft)}
              </>
            )}
          </div>
        </div>
        <div className="pbar" style={{ marginTop: 8 }}>
          <i style={{ width: `${Math.round((kpis.bar == null ? 0 : 1 - kpis.bar) * 100)}%` }} />
        </div>
        <div className="days" style={{ marginTop: 14 }}>
          <span className="num">已用 ¥{formatYuanTrim(kpis.monthSpend)}</span>
          <span className="on">{monthlyBudget == null ? "还没设预算" : kpis.budgetLeft != null && kpis.budgetLeft < 0 ? `已超出 ¥${formatYuanTrim(-kpis.budgetLeft)}` : "存在本机"}</span>
        </div>
        <form
          className="budget-field"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <input
            inputMode="decimal"
            aria-label="月预算"
            placeholder="设置本月预算"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button type="submit" className="save-btn press">
            保存预算
          </button>
        </form>
      </section>
      <p className="fine">预算只保存在这台设备上。</p>
    </>
  );
}
