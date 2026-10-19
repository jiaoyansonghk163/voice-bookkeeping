import { Sparkline } from "@/components/sparkline";
import { TxnRow } from "@/components/txn-row";
import { formatYuanTrim } from "@/lib/format";
import { presentKpis } from "@/lib/metrics";
import type { Transaction } from "@/lib/types";

export function HomeScreen({
  transactions,
  now,
  highlightId,
  onOpen,
  onOpenAll,
}: {
  transactions: Transaction[];
  now: Date;
  highlightId: string | null;
  onOpen: (id: string) => void;
  onOpenAll: () => void;
}) {
  const kpis = presentKpis(transactions, now);
  const rows = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <>
      <section className="kpis rise">
        <article className="kpi glass main">
          <div className="l">本月支出</div>
          <div className="v num" data-kpi="month">
            ¥{formatYuanTrim(kpis.monthSpend)}
          </div>
          <div className="d">
            <b>↓ 6%</b> 较上月
          </div>
        </article>
        <article className="kpi glass">
          <div className="l">今日</div>
          <div className="v num" data-kpi="today">
            ¥{formatYuanTrim(kpis.todaySpend)}
          </div>
          <div className="d">{kpis.todayCount} 笔</div>
        </article>
        <article className="kpi glass">
          <div className="l">预算剩余</div>
          <div className="v num" data-kpi="budget">
            ¥{formatYuanTrim(kpis.budgetLeft)}
          </div>
          <div className="bar">
            <i style={{ width: `${Math.round(kpis.bar * 100)}%` }} />
          </div>
        </article>
      </section>

      <section className="panel block rise" style={{ animationDelay: ".04s" }}>
        <div className="ph">
          <h2>近 7 天</h2>
          <span>
            日均 <b className="num" style={{ color: "var(--text)", fontWeight: 600 }}>¥{kpis.dailyAvg}</b>
          </span>
        </div>
        <Sparkline />
        <div className="days">
          <span>二</span>
          <span>三</span>
          <span>四</span>
          <span>五</span>
          <span>六</span>
          <span>日</span>
          <span className="on">今天</span>
        </div>
      </section>

      <section className="panel block rise" style={{ animationDelay: ".08s" }}>
        <div className="ph">
          <h2>最近账单</h2>
          <button type="button" className="link" onClick={onOpenAll}>
            全部
          </button>
        </div>
        <div className="list">
          {rows.map((transaction) => (
            <TxnRow
              key={transaction.id}
              transaction={transaction}
              now={now}
              fresh={transaction.id === highlightId}
              onOpen={onOpen}
            />
          ))}
        </div>
      </section>
    </>
  );
}

export function AllScreen({
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
  const rows = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section className="panel block rise">
      <div className="ph">
        <h2>最近账单</h2>
        <span>{rows.length} 笔</span>
      </div>
      <div className="list">
        {rows.map((transaction) => (
          <TxnRow
            key={transaction.id}
            transaction={transaction}
            now={now}
            fresh={transaction.id === highlightId}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
