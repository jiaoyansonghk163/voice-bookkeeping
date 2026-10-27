import { CATEGORY_COLOR } from "@/components/category-icon";
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

  const grand = slices.reduce((sum, item) => sum + item.total, 0) || 1;

  return (
    <>
      <h1 className="page-title">统计</h1>
      <p className="page-sub">本月 · {now.getMonth() + 1}月</p>
      <section className="glass hero-card press">
        <span className="lab">本月支出</span>
        <div className="big">
          <sup>¥</sup>
          {formatYuanTrim(monthSpend)}
        </div>
        <div className="bars" aria-hidden="true">
          {weeks.map((value, index) => {
            const height = peak <= 0 ? 36 : Math.max(18, Math.round((value / peak) * 90));
            return <i key={index} className={index === current ? "now" : undefined} style={{ height }} />;
          })}
        </div>
      </section>
      <h2 className="section-title">分类占比</h2>
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
