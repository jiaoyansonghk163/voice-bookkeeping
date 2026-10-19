import { Glyph, toneFor } from "@/components/glyphs";
import { CATEGORIES } from "@/lib/categories";
import { formatDetailStamp, formatYuan } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function DetailScreen({ transaction, now }: { transaction: Transaction | null; now: Date }) {
  if (!transaction) {
    return (
      <section className="panel block rise">
        <h2 style={{ margin: 0, fontSize: 22 }}>找不到这笔</h2>
        <p className="fine" style={{ textAlign: "left", marginLeft: 0 }}>
          它可能已经不在这本账上了。
        </p>
      </section>
    );
  }

  const tone = toneFor(transaction.title, transaction.category);
  const [whole, dec] = formatYuan(transaction.amount).split(".");

  return (
    <>
      <section className="panel block rise" style={{ marginTop: 0, textAlign: "center", paddingTop: 28, paddingBottom: 28 }}>
        <span className="ic" style={{ background: tone.bg, color: tone.fg, margin: "0 auto" }}>
          <Glyph name={tone.glyph} />
        </span>
        <div className="hint" style={{ marginTop: 14 }}>
          {CATEGORIES[transaction.category].label}
        </div>
        <h2 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 650 }}>{transaction.title}</h2>
        <div className="hero" style={{ margin: "18px 0 0" }}>
          <div className="sum num">
            <small>¥</small>
            {whole}.{dec}
          </div>
        </div>
      </section>
      <section className="panel card block rise" style={{ animationDelay: ".05s" }}>
        <div className="f">
          <span className="k">时间</span>
          <span className="v">{formatDetailStamp(new Date(transaction.createdAt), now)}</span>
        </div>
        <div className="f">
          <span className="k">来源</span>
          <span className="v">{transaction.source === "voice" ? "语音" : "示例"}</span>
        </div>
        <div className="f">
          <span className="k">原话</span>
          <span className="v">「{transaction.transcript}」</span>
        </div>
      </section>
    </>
  );
}
