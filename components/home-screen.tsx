"use client";

import { motion, useReducedMotion } from "motion/react";
import { TxnRow } from "@/components/txn-row";
import { useState } from "react";
import { MonthSwitcher } from "@/components/month-switcher";
import { CATEGORIES, INCOME_ORDER, CATEGORY_ORDER } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { backupReminderDue } from "@/lib/backup";
import { formatTodayLine, formatYuanTrim, splitYuan } from "@/lib/format";
import { filterBills, transactionsInMonth } from "@/lib/ledger";
import type { CategoryId } from "@/lib/types";
import { presentKpis } from "@/lib/metrics";
import { ROW_STAGGER_S } from "@/lib/motion";
import type { Transaction } from "@/lib/types";

interface ListProps {
  transactions: Transaction[];
  now: Date;
  highlightIds: string[];
  onOpen: (id: string) => void;
  onDelete: (transaction: Transaction) => void;
}

function BillList({ transactions, now, highlightIds, onOpen, onDelete }: ListProps) {
  const reduce = useReducedMotion();
  return (
    <div className="bills glass">
      {transactions.map((transaction, index) => (
        <motion.div
          key={transaction.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.12 : 0.22, ease: "easeOut", delay: reduce ? 0 : Math.min(index, 12) * ROW_STAGGER_S }}
        >
          <TxnRow
            transaction={transaction}
            now={now}
            fresh={highlightIds.includes(transaction.id)}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </div>
  );
}

function Money({ amount }: { amount: number }) {
  const { int, dec } = splitYuan(amount);
  return (
    <>
      {int}
      <span className="dec">.{dec}</span>
    </>
  );
}

export function HomeScreen({
  transactions,
  now,
  highlightIds,
  onOpen,
  onDelete,
  onAll,
  onBudget,
  monthlyBudget = null,
  reminder,
}: ListProps & {
  onAll?: () => void;
  onBudget?: () => void;
  monthlyBudget?: number | null;
  reminder?: { lastExportAt: number | null; dismissedAt: number | null; onExport: () => void; onDismiss: () => void };
}) {
  const kpis = presentKpis(transactions, now, monthlyBudget);
  const used = monthlyBudget && monthlyBudget > 0 ? Math.min(1, Math.max(0, kpis.monthSpend / monthlyBudget)) : null;
  const recent = transactions.slice(0, 20);
  const showReminder =
    reminder != null &&
    backupReminderDue({
      count: transactions.length,
      lastExportAt: reminder.lastExportAt,
      dismissedAt: reminder.dismissedAt,
      now: now.getTime(),
    });

  return (
    <>
      <h1 className="page-title">闪记</h1>
      <p className="page-sub">
        {formatTodayLine(now)} · 本月已花 ¥{formatYuanTrim(kpis.monthSpend)}
      </p>
      <section className="glass hero-card press">
        <span className="lab">本月支出</span>
        <div className="big">
          <sup>¥</sup>
          <Money amount={kpis.monthSpend} />
        </div>
        {used == null ? (
          <>
            <div className="pbar" role="progressbar" aria-label="预算进度" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: 0 }} />
            </div>
            <div className="budget-prompt">
              <span>还没设预算</span>
              <button type="button" className="link-btn" onClick={onBudget}>
                设置预算
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="hero-note">
              {kpis.budgetLeft != null && kpis.budgetLeft < 0
                ? `已超出 ¥${formatYuanTrim(-kpis.budgetLeft)}`
                : `预算剩余 ¥${formatYuanTrim(kpis.budgetLeft ?? 0)}`}{" "}
              · 已用 {Math.round(used * 100)}%
            </div>
            <div className="pbar" role="progressbar" aria-valuenow={Math.round(used * 100)} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${Math.round(used * 100)}%` }} className={used >= 1 ? "over" : undefined} />
            </div>
          </>
        )}
      </section>
      <section className="kpi-row">
        <article className="glass small-card press">
          <span>今日支出</span>
          <b>
            ¥<Money amount={kpis.todaySpend} />
          </b>
        </article>
        <article className="glass small-card press">
          <span>今日收入</span>
          <b className="income">
            ¥<Money amount={kpis.todayIncome} />
          </b>
        </article>
      </section>
      {showReminder && reminder ? (
        <div className="glass remind-card" role="note">
          <p>数据只存在这台手机上，导出一份备份吧</p>
          <div>
            <button type="button" className="remind-go press" onClick={reminder.onExport}>
              导出备份
            </button>
            <button type="button" className="remind-x" aria-label="先不提醒" onClick={reminder.onDismiss}>
              ✕
            </button>
          </div>
        </div>
      ) : null}
      <div className="section-row">
        <h2 className="section-title">最近账单</h2>
        {transactions.length > 0 && onAll ? (
          <button type="button" className="link-btn" onClick={onAll}>
            全部
          </button>
        ) : null}
      </div>
      {transactions.length === 0 ? (
        <div className="glass empty-card">
          <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
            <g stroke="#5B6670" strokeWidth="3" strokeLinecap="round">
              <path d="M4 9v6M9.5 5v14M15 7.5v9M20.5 10v4" />
            </g>
          </svg>
          <b>还没有账</b>
          <p>点下面的声波,说一句就记好了</p>
        </div>
      ) : (
        <BillList transactions={recent} now={now} highlightIds={highlightIds} onOpen={onOpen} onDelete={onDelete} />
      )}
    </>
  );
}

export function AllScreen(props: ListProps) {
  const [month, setMonth] = useState(() => new Date(props.now.getFullYear(), props.now.getMonth(), 1));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | null>(null);
  const inMonth = transactionsInMonth(props.transactions, month);
  const shown = filterBills(inMonth, { query, category });
  const used = [...CATEGORY_ORDER, ...INCOME_ORDER].filter((id) => inMonth.some((item) => item.category === id));

  if (props.transactions.length === 0) {
    return (
      <div className="glass empty-card">
        <b>还没有账</b>
        <p>点下面的声波,说一句就记好了</p>
      </div>
    );
  }
  return (
    <>
      <MonthSwitcher month={month} now={props.now} onChange={setMonth} />
      <input
        className="search-box"
        type="search"
        aria-label="搜索"
        placeholder="搜索标题或备注"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="chip-row" role="group" aria-label="分类">
        <button type="button" className={cn(category == null && "on")} onClick={() => setCategory(null)}>
          全部
        </button>
        {used.map((id) => (
          <button key={id} type="button" className={cn(category === id && "on")} onClick={() => setCategory(category === id ? null : id)}>
            {CATEGORIES[id].label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="glass empty-card">
          <b>没有找到</b>
          <p>换个关键词,或者看看别的月份</p>
        </div>
      ) : (
        <BillList {...props} transactions={shown} />
      )}
    </>
  );
}
