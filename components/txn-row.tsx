"use client";

import { useRef, useState } from "react";
import { Glyph, categoryGlyph, toneFor } from "@/components/glyphs";
import { rowKind } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatClock, formatYuanTrim, startOfDay } from "@/lib/format";
import type { Transaction } from "@/lib/types";

function whenLabel(date: Date, now: Date): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (days <= 0) return formatClock(date);
  if (days === 1) return "昨天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

const OPEN = -60;

export function TxnRow({
  transaction,
  now,
  fresh,
  onOpen,
  onDelete,
}: {
  transaction: Transaction;
  now: Date;
  fresh?: boolean;
  onOpen: (id: string) => void;
  onDelete?: (transaction: Transaction) => void;
}) {
  const tone = toneFor(transaction.title, transaction.category);
  const when = whenLabel(new Date(transaction.createdAt), now);
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ id: number; x: number; y: number; base: number; axis: "x" | "y" | null } | null>(null);
  const moved = useRef(false);

  const canDelete = Boolean(onDelete);

  return (
    <div className="swipe">
      <div className="swipe-track" style={{ transform: `translateX(${offset}px)` }}>
      <button
        type="button"
        className={cn("row", fresh && "fresh")}
        onClick={() => {
          if (moved.current) {
            moved.current = false;
            return;
          }
          if (offset !== 0) {
            setOffset(0);
            return;
          }
          onOpen(transaction.id);
        }}
        onPointerDown={(event) => {
          if (!canDelete) return;
          if (event.pointerType === "mouse" && event.button !== 0) return;
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, base: offset, axis: null };
        }}
        onPointerMove={(event) => {
          const state = drag.current;
          if (!state || state.id !== event.pointerId) return;
          const dx = event.clientX - state.x;
          const dy = event.clientY - state.y;
          if (!state.axis) {
            if (Math.hypot(dx, dy) < 8) return;
            state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
            if (state.axis === "x") event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (state.axis !== "x") return;
          setOffset(Math.max(OPEN - 12, Math.min(0, state.base + dx)));
        }}
        onPointerUp={(event) => {
          const state = drag.current;
          drag.current = null;
          if (!state || state.axis !== "x" || state.id !== event.pointerId) return;
          moved.current = true;
          setOffset((current) => (current <= OPEN / 2 ? OPEN : 0));
        }}
        onPointerCancel={() => {
          drag.current = null;
          setOffset(0);
        }}
      >
        <span className="ic" style={{ background: tone.bg, color: tone.fg }}>
          <Glyph name={categoryGlyph(transaction.category)} />
        </span>
        <span className="meta">
          <span className="t">{transaction.title}</span>
          <span className="s">
            {rowKind(transaction.category, transaction.subcategory)} · {when}
          </span>
        </span>
        <span className="amt num">-¥{formatYuanTrim(transaction.amount)}</span>
      </button>
      {canDelete ? (
        <button
          type="button"
          className="swipe-del"
          aria-label={`删除${transaction.title}`}
          onClick={() => onDelete?.(transaction)}
        >
          删除
        </button>
      ) : null}
      </div>
    </div>
  );
}
