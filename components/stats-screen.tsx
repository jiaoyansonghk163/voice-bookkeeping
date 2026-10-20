import { Glyph, toneFor } from "@/components/glyphs";
import { Sparkline } from "@/components/sparkline";
import { CATEGORIES } from "@/lib/categories";
import { formatYuanTrim, weekdayShort } from "@/lib/format";
import { breakdownByCategory, sumAmounts } from "@/lib/ledger";
import { presentKpis } from "@/lib/metrics";
import type { Transaction } from "@/lib/types";

export function StatsScreen({ transactions, now }: { transactions: Transaction[]; now: Date }) {
  const slices = breakdownByCategory(transactions);
  const total = sumAmounts(transactions);
  const kpis = presentKpis(transactions, now, null);

  return (
    <>
      <section className="kpis rise">
        <article className="kpi glass main">
          <div className="l">账单合计</div>
          <div className="v num">¥{formatYuanTrim(total)}</div>
          <div className="d">这台设备上的账单</div>
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
          <h2>分类占比</h2>
          <span>{slices.length} 类</span>
        </div>
        <div className="share">
          {slices.length === 0 ? <p className="empty">还没有账单。</p> : null}
          {slices.map((slice) => {
            const tone = toneFor(CATEGORIES[slice.category].label, slice.category);
            return (
              <div className="line" key={slice.category}>
                <span className="ic" style={{ background: tone.bg, color: tone.fg }}>
                  <Glyph name={tone.glyph} />
                </span>
                <div className="grow">
                  <div className="name">{CATEGORIES[slice.category].label}</div>
                  <div className="track">
                    <i style={{ width: `${Math.max(6, Math.round(slice.share * 100))}%` }} />
                  </div>
                </div>
                <div className="mix-amt">
                  <div className="amt num">¥{formatYuanTrim(slice.total)}</div>
                  <div className="sub num">{Math.round(slice.share * 100)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <p className="fine">这里按这台设备上的账单汇总。</p>
    </>
  );
}
