"use client";

export function MonthSwitcher({ month, now, onChange }: { month: Date; now: Date; onChange: (next: Date) => void }) {
  const atNow = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  const go = (delta: number) => onChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  return (
    <div className="month-switch">
      <button type="button" aria-label="上个月" onClick={() => go(-1)}>
        ‹
      </button>
      <span>
        {month.getFullYear() === now.getFullYear() ? "" : `${month.getFullYear()}年`}
        {month.getMonth() + 1}月
      </span>
      <button type="button" aria-label="下个月" disabled={atNow} onClick={() => go(1)}>
        ›
      </button>
    </div>
  );
}
