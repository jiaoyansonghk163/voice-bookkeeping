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
      <section className="panel block rise" style={{ marginTop: 0 }}>
        <div className="ph">
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
        <div className="bar" style={{ height: 8, marginTop: 8 }}>
          <i style={{ width: `${Math.round((kpis.bar ?? 0) * 100)}%` }} />
        </div>
        <div className="days" style={{ marginTop: 14 }}>
          <span>已支出 ¥{formatYuanTrim(kpis.monthSpend)}</span>
          <span className="on">存在本机</span>
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
            placeholder="设置月预算"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button type="submit" className="quiet-btn">
            保存
          </button>
        </form>
      </section>
      <p className="fine">预算只保存在这台设备上。</p>
    </>
  );
}
