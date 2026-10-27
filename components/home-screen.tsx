"use client";

import { motion, useReducedMotion } from "motion/react";
import { TxnRow } from "@/components/txn-row";
import { formatTodayLine, formatYuan, formatYuanTrim } from "@/lib/format";
import { sumAmounts, transactionsOnDay } from "@/lib/ledger";
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

export function HomeScreen({
  transactions,
  now,
  highlightIds,
  onOpen,
  onDelete,
  onAll,
  onBudget,
  monthlyBudget = null,
}: ListProps & { onAll?: () => void; onBudget?: () => void; monthlyBudget?: number | null }) {
  const kpis = presentKpis(transactions, now, monthlyBudget);
  const todaySpend = sumAmounts(transactionsOnDay(transactions, now));
  const used = monthlyBudget && monthlyBudget > 0 ? Math.min(1, Math.max(0, kpis.monthSpend / monthlyBudget)) : null;
  const recent = transactions.slice(0, 20);

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
          {formatYuan(kpis.monthSpend)}
        </div>
        {used == null ? (
          <button type="button" className="hero-note link-btn" onClick={onBudget}>
            设一个数,花钱心里有底
          </button>
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
          <b>¥{formatYuan(todaySpend)}</b>
        </article>
        <article className="glass small-card press">
          <span>今日收入</span>
          <b>¥{formatYuan(0)}</b>
        </article>
      </section>
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
  return props.transactions.length === 0 ? (
    <div className="glass empty-card">
      <b>还没有账</b>
      <p>点下面的声波,说一句就记好了</p>
    </div>
  ) : (
    <BillList {...props} />
  );
}
