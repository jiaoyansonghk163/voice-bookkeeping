import { CATEGORIES } from "@/lib/categories";
import { formatYuanTrim, roundMoney } from "@/lib/format";
import { breakdownByCategory, transactionsInMonth } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

function weekTotals(transactions: Transaction[], now: Date): number[] {
  const totals = [0, 0, 0, 0];
  for (const item of transactionsInMonth(transactions, now)) {
    const day = new Date(item.createdAt).getDate();
    totals[Math.min(3, Math.floor((day - 1) / 7))] += item.amount;
  }
  return totals.map((value) => roundMoney(value));
}

export function StatsScreen({ transactions, now }: { transactions: Transaction[]; now: Date }) {
  const monthItems = transactionsInMonth(transactions, now);
  const monthSpend = roundMoney(monthItems.reduce((sum, item) => sum + item.amount, 0));
  const weeks = weekTotals(transactions, now);
  const peak = Math.max(...weeks, 0);
  const current = Math.min(3, Math.floor((now.getDate() - 1) / 7));
  const slices = breakdownByCategory(monthItems);

  return (
    <>
      <h1 className="page-title">统计</h1>
      <p className="page-sub">本月 · {now.getMonth() + 1}月</p>
      <section className="month-card">
        <span>本月支出</span>
        <b>¥{formatYuanTrim(monthSpend)}</b>
        <div className="bars" aria-hidden="true">
          {weeks.map((value, index) => {
            const height = peak <= 0 ? 40 : Math.max(18, Math.round((value / peak) * 78));
            return <i key={index} className={index === current ? "now" : undefined} style={{ height }} />;
          })}
        </div>
      </section>
      <h2 className="section-title">分类占比</h2>
      {slices.length === 0 ? <p className="empty">还没有账单。</p> : null}
      <div className="share-list">
        {slices.map((slice) => (
          <div className="share-card" key={slice.category}>
            <span>{CATEGORIES[slice.category].label}</span>
            <b>¥{formatYuanTrim(slice.total)}</b>
          </div>
        ))}
      </div>
    </>
  );
}
