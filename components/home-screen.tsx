import { TxnRow } from "@/components/txn-row";
import { formatTodayLine, formatYuan } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function HomeScreen({
  transactions,
  now,
  highlightIds,
  onOpen,
  onDelete,
}: {
  transactions: Transaction[];
  now: Date;
  highlightIds: string[];
  onOpen: (id: string) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const todaySpend = transactions
    .filter((item) => {
      const date = new Date(item.createdAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    })
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <h1 className="page-title">璃记</h1>
      <p className="page-sub">{formatTodayLine(now)}</p>
      <section className="kpi-row">
        <article className="kpi-card">
          <span>今日支出</span>
          <b className="out">¥{formatYuan(todaySpend)}</b>
        </article>
        <article className="kpi-card">
          <span>今日收入</span>
          <b className="in">¥{formatYuan(0)}</b>
        </article>
      </section>
      <h2 className="section-title">最近账单</h2>
      {transactions.length === 0 ? <p className="empty">还没有账单。点下方麦克风记一笔。</p> : null}
      <div className="bills">
        {transactions.map((transaction) => (
          <TxnRow
            key={transaction.id}
            transaction={transaction}
            now={now}
            fresh={highlightIds.includes(transaction.id)}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
}

export function AllScreen({
  transactions,
  now,
  highlightIds,
  onOpen,
  onDelete,
}: {
  transactions: Transaction[];
  now: Date;
  highlightIds: string[];
  onOpen: (id: string) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  return (
    <div className="bills">
      {transactions.length === 0 ? <p className="empty">还没有账单。</p> : null}
      {transactions.map((transaction) => (
        <TxnRow
          key={transaction.id}
          transaction={transaction}
          now={now}
          fresh={highlightIds.includes(transaction.id)}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
