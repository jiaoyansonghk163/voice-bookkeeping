import type { ReactNode } from "react";
import { Glyph, categoryGlyph, toneFor } from "@/components/glyphs";
import { TxnRow } from "@/components/txn-row";
import { CATEGORIES } from "@/lib/categories";
import { formatYuanTrim } from "@/lib/format";
import { frequentCategories } from "@/lib/ledger";
import { presentKpis } from "@/lib/metrics";
import type { CategoryId, Transaction } from "@/lib/types";

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

function CardIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function HomeScreen({
  transactions,
  now,
  monthlyBudget,
  highlightIds,
  onOpen,
  onOpenAll,
  onQuick,
  onDelete,
}: {
  transactions: Transaction[];
  now: Date;
  monthlyBudget: number | null;
  highlightIds: string[];
  onOpen: (id: string) => void;
  onOpenAll: () => void;
  onQuick: (category: CategoryId) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const kpis = presentKpis(transactions, now, monthlyBudget);
  const rows = sorted(transactions);
  const quicks = frequentCategories(transactions);

  return (
    <>
      <section className="cards rise">
        <article className="card-stat" data-card="today">
          <span className="tile purple" aria-hidden="true">
            <CardIcon>
              <rect x="4" y="5" width="16" height="15" rx="3" />
              <path d="M8 3.5v3M16 3.5v3M4 10h16" />
            </CardIcon>
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
            <CardIcon>
              <path d="M4 19V10M12 19V5M20 19v-7" />
            </CardIcon>
          </span>
          <div className="body">
            <div className="l">本月支出</div>
            <div className="v spend num" data-kpi="month">
              ¥{formatYuanTrim(kpis.monthSpend)}
            </div>
            <Delta delta={kpis.delta} />
          </div>
        </article>
      </section>

      <section className="quicks rise" aria-label="常用分类">
        {quicks.map((id) => {
          const tone = toneFor(CATEGORIES[id].label, id);
          return (
            <button key={id} type="button" className="quick" onClick={() => onQuick(id)}>
              <span className="tile" style={{ background: tone.bg, color: tone.fg }}>
                <Glyph name={categoryGlyph(id)} />
              </span>
              {CATEGORIES[id].label}
            </button>
          );
        })}
      </section>

      <section className="panel block rise" style={{ animationDelay: ".06s" }}>
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
                onDelete={onDelete}
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
  onDelete,
}: {
  transactions: Transaction[];
  now: Date;
  highlightIds: string[];
  onOpen: (id: string) => void;
  onDelete: (transaction: Transaction) => void;
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
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}
