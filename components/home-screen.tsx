import { Sparkline } from "@/components/sparkline";
import { TxnRow } from "@/components/txn-row";
import { formatYuanTrim, weekdayShort } from "@/lib/format";
import { presentKpis } from "@/lib/metrics";
import type { Transaction } from "@/lib/types";

function sorted(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function Delta({ delta }: { delta: number | null }) {
  if (delta == null) return <div className="d">较上月 —</div>;
  if (Math.abs(delta) < 0.005) return <div className="d">与上月持平</div>;
  const arrow = delta < 0 ? "↓" : "↑";
  return (
    <div className="d">
      <b>
        {arrow} {Math.abs(Math.round(delta * 100))}%
      </b>{" "}
      较上月
    </div>
  );
}

export function HomeScreen({
  transactions,
  now,
  monthlyBudget,
  highlightIds,
  onOpen,
  onOpenAll,
}: {
  transactions: Transaction[];
  now: Date;
  monthlyBudget: number | null;
  highlightIds: string[];
  onOpen: (id: string) => void;
  onOpenAll: () => void;
}) {
  const kpis = presentKpis(transactions, now, monthlyBudget);
  const rows = sorted(transactions);

  return (
    <>
      <section className="kpis rise">
        <article className="kpi glass main">
          <div className="l">本月支出</div>
          <div className="v num" data-kpi="month">
            ¥{formatYuanTrim(kpis.monthSpend)}
          </div>
          <Delta delta={kpis.delta} />
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
            {kpis.budgetLeft == null ? "未设置" : `¥${formatYuanTrim(kpis.budgetLeft)}`}
          </div>
          <div className="bar">
            <i style={{ width: `${Math.round((kpis.bar ?? 0) * 100)}%` }} />
          </div>
        </article>
      </section>

      <section className="panel block rise" style={{ animationDelay: ".04s" }}>
        <div className="ph">
          <h2>近 7 天</h2>
          <span>
            日均{" "}
            <b className="num" style={{ color: "var(--text)", fontWeight: 600 }}>
              ¥{formatYuanTrim(kpis.dailyAvg)}
            </b>
          </span>
        </div>
        <Sparkline values={kpis.days.map((day) => day.total)} />
        <div className="days">
          {kpis.days.map((day, index) => (
            <span key={day.date.toISOString()} className={index === kpis.days.length - 1 ? "on" : undefined}>
              {index === kpis.days.length - 1 ? "今天" : weekdayShort(day.date)}
            </span>
          ))}
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
          {rows.length === 0 ? (
            <p className="empty">还没有账单。点下方麦克风记一笔。</p>
          ) : (
            rows.map((transaction) => (
              <TxnRow
                key={transaction.id}
                transaction={transaction}
                now={now}
                fresh={highlightIds.includes(transaction.id)}
                onOpen={onOpen}
              />
            ))
          )}
        </div>
      </section>
    </>
  );
}

export function AllScreen({
  transactions,
  now,
  highlightIds,
  onOpen,
}: {
  transactions: Transaction[];
  now: Date;
  highlightIds: string[];
  onOpen: (id: string) => void;
}) {
  const rows = sorted(transactions);

  return (
    <section className="panel block rise">
      <div className="ph">
        <h2>最近账单</h2>
        <span>{rows.length} 笔</span>
      </div>
      <div className="list">
        {rows.length === 0 ? (
          <p className="empty">还没有账单。</p>
        ) : (
          rows.map((transaction) => (
            <TxnRow
              key={transaction.id}
              transaction={transaction}
              now={now}
                fresh={highlightIds.includes(transaction.id)}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </section>
  );
}
