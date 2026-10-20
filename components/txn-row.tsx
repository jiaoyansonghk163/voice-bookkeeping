import { Glyph, categoryGlyph, toneFor } from "@/components/glyphs";
import { cn } from "@/lib/cn";
import { formatClock, formatYuanTrim, startOfDay } from "@/lib/format";
import type { Transaction } from "@/lib/types";

function whenLabel(date: Date, now: Date): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (days <= 0) return formatClock(date);
  if (days === 1) return "昨天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function TxnRow({
  transaction,
  now,
  fresh,
  onOpen,
}: {
  transaction: Transaction;
  now: Date;
  fresh?: boolean;
  onOpen: (id: string) => void;
}) {
  const tone = toneFor(transaction.title, transaction.category);
  const when = whenLabel(new Date(transaction.createdAt), now);

  return (
    <button type="button" className={cn("row", fresh && "fresh")} onClick={() => onOpen(transaction.id)}>
      <span className="ic" style={{ background: tone.bg, color: tone.fg }}>
        <Glyph name={categoryGlyph(transaction.category)} />
      </span>
      <span className="meta">
        <span className="t">{transaction.title}</span>
        <span className="s">
          {transaction.subcategory} · {when}
        </span>
      </span>
      <span className="amt num">-¥{formatYuanTrim(transaction.amount)}</span>
    </button>
  );
}
