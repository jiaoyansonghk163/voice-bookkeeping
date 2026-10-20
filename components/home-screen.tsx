import { Glyph, toneFor } from "@/components/glyphs";
import { Sparkline } from "@/components/sparkline";
import { TxnRow } from "@/components/txn-row";
import { CATEGORIES } from "@/lib/categories";
import { formatYuanTrim, weekdayShort } from "@/lib/format";
import { breakdownByCategory } from "@/lib/ledger";
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
  const slices = breakdownByCategory(transactions).slice(0, 4);

  return (
    <>
      <section className="cards rise">
        <article className="card-stat">
          <span className="tile purple" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="15" rx="3" />
              <path d="M8 3.5v3M16 3.5v3M4 10h16" />
            </svg>
          </span>
          <div className="body">
            <div className="l">今日支出</div>
            <div className="v spend num" data-kpi="today">
              ¥{formatYuanTrim(kpis.todaySpend)}
            </div>
            <div className="d">{kpis.todayCount} 笔</div>
          </div>
        </article>
        <article className="card-stat">
          <span className="tile purple" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19V10M12 19V5M20 19v-7" />
            </svg>
          </span>
          <div className="body">
            <div className="l">本月支出</div>
            <div className="v spend num" data-kpi="month">
              ¥{formatYuanTrim(kpis.monthSpend)}
            </div>
            <Delta delta={kpis.delta} />
          </div>
        </article>
        <article className="card-stat">
          <span className="tile blue" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 7h11M9 12h11M9 17h11" />
              <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
              <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <div className="body">
            <div className="l">笔数</div>
            <div className="v num" data-kpi="count">
              {kpis.todayCount}/{transactions.length}
            </div>
            <div className="d">今日 / 全部</div>
          </div>
        </article>
        <article className="card-stat">
          <span className="tile green" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="13" rx="2.5" />
              <path d="M3 10h18" />
              <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <div className="body">
            <div className="l">预算剩余</div>
            <div className={kpis.budgetLeft == null ? "v unset num" : "v balance num"} data-kpi="budget">
              {kpis.budgetLeft == null ? "未设置" : `¥${formatYuanTrim(kpis.budgetLeft)}`}
            </div>
            <div className="bar">
              <i style={{ width: `${Math.round((kpis.bar ?? 0) * 100)}%` }} />
            </div>
          </div>
        </article>
        <article className="card-stat span">
          <span className="tile amber" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a9 9 0 1 0 9 9h-9z" />
              <path d="M12 3v9h9" />
            </svg>
          </span>
          <div className="body">
            <div className="l">分类占比</div>
            {slices.length === 0 ? (
              <p className="empty">还没有账单。</p>
            ) : (
              <div className="mix">
                {slices.map((slice) => {
                  const tone = toneFor(CATEGORIES[slice.category].label, slice.category);
                  return (
                    <div className="mix-row" key={slice.category}>
                      <span className="mix-name">
                        <span className="mini" style={{ background: tone.bg, color: tone.fg }}>
                          <Glyph name={tone.glyph} />
                        </span>
                        {CATEGORIES[slice.category].label}
                      </span>
                      <b className="num">{Math.round(slice.share * 100)}%</b>
                    </div>
                  );
                })}
              </div>
            )}
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
