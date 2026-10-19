import { Glyph, toneFor } from "@/components/glyphs";
import { CATEGORIES } from "@/lib/categories";
import { formatYuanTrim } from "@/lib/format";
import { breakdownByCategory, sumAmounts } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

export function StatsScreen({ transactions }: { transactions: Transaction[] }) {
  const slices = breakdownByCategory(transactions);
  const total = sumAmounts(transactions);

  return (
    <>
      <section className="kpis rise" style={{ gridTemplateColumns: "1fr" }}>
        <article className="kpi glass main">
          <div className="l">账单合计</div>
          <div className="v num">¥{formatYuanTrim(total)}</div>
          <div className="d">当前列表 · 示例数据</div>
        </article>
      </section>
      <section className="panel block rise" style={{ animationDelay: ".04s" }}>
        <div className="ph">
          <h2>分类</h2>
          <span>{slices.length} 类</span>
        </div>
        <div className="share">
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
                <div className="amt num">¥{formatYuanTrim(slice.total)}</div>
              </div>
            );
          })}
        </div>
      </section>
      <p className="fine">首页的月度数字是整月示例，这里按当前账单汇总。</p>
    </>
  );
}
