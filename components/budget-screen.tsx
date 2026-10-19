import { formatYuanTrim } from "@/lib/format";
import { ILLUSTRATIVE, presentKpis } from "@/lib/metrics";
import type { Transaction } from "@/lib/types";

export function BudgetScreen({ transactions, now }: { transactions: Transaction[]; now: Date }) {
  const kpis = presentKpis(transactions, now);
  const used = Math.max(0, ILLUSTRATIVE.monthBudget - kpis.budgetLeft);

  return (
    <>
      <section className="panel block rise" style={{ marginTop: 0 }}>
        <div className="ph">
          <h2>本月预算</h2>
          <span className="num" style={{ color: "var(--text)", fontWeight: 600 }}>
            ¥{formatYuanTrim(ILLUSTRATIVE.monthBudget)}
          </span>
        </div>
        <div className="hero" style={{ marginBottom: 8 }}>
          <div className="lab">预算剩余</div>
          <div className="sum num">
            <small>¥</small>
            {formatYuanTrim(kpis.budgetLeft)}
          </div>
        </div>
        <div className="bar" style={{ height: 8, marginTop: 8 }}>
          <i style={{ width: `${Math.round(kpis.bar * 100)}%` }} />
        </div>
        <div className="days" style={{ marginTop: 14 }}>
          <span>已支出 ¥{formatYuanTrim(used)}</span>
          <span className="on">示例数据</span>
        </div>
      </section>
      <p className="fine">预算和走势都是演示用的虚构数字，不连接账户。</p>
    </>
  );
}
