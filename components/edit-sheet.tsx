"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DayChips } from "@/components/day-chips";
import { categoriesFor, CATEGORIES, defaultPick } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { createdAtFromDay } from "@/lib/drafts";
import { dayString, roundMoney } from "@/lib/format";
import type { BillPatch } from "@/lib/ledger";
import { BACKDROP_IN_S, EASE_A, SHEET_OUT_S, SHEET_SPRING } from "@/lib/motion";
import type { CategoryId, EntryKind, Transaction } from "@/lib/types";

function clockOf(iso: string): string {
  const date = new Date(iso);
  return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

/** Combine the picked calendar day with an HH:MM clock, in local time. */
export function combineDayTime(day: string, time: string, fallback: Date): string {
  const base = new Date(fallback);
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (match) base.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return createdAtFromDay(day, base);
}

export function EditSheet({
  transaction,
  onClose,
  onSave,
  onDelete,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (id: string, patch: BillPatch) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {transaction ? (
        <motion.div
          key="edit-backdrop"
          className="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: SHEET_OUT_S, ease: "easeOut" } }}
          transition={{ duration: BACKDROP_IN_S, ease: "easeOut" }}
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      {transaction ? (
        <motion.section
          key="edit-sheet"
          className="stage crystal edit-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="编辑这笔账"
          initial={reduce ? { opacity: 0 } : { y: "100%" }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: "100%", transition: { duration: SHEET_OUT_S, ease: EASE_A } }}
          transition={reduce ? { duration: 0.12 } : SHEET_SPRING}
        >
          <EditForm key={transaction.id} transaction={transaction} onClose={onClose} onSave={onSave} onDelete={onDelete} />
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

function EditForm({
  transaction,
  onClose,
  onSave,
  onDelete,
}: {
  transaction: Transaction;
  onClose: () => void;
  onSave: (id: string, patch: BillPatch) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const created = new Date(transaction.createdAt);
  const [kind, setKind] = useState<EntryKind>(transaction.kind === "income" ? "income" : "expense");
  const [amount, setAmount] = useState(String(transaction.amount));
  const [title, setTitle] = useState(transaction.title);
  const [category, setCategory] = useState<CategoryId>(transaction.category);
  const [day, setDay] = useState(dayString(created));
  const [time, setTime] = useState(clockOf(transaction.createdAt));
  const [note, setNote] = useState(transaction.note ?? "");
  const [error, setError] = useState("");

  const switchKind = (next: EntryKind) => {
    if (next === kind) return;
    setKind(next);
    setCategory(categoriesFor(next)[0]);
  };

  const save = () => {
    const value = Number(amount.replace(/[¥￥,\s]/g, ""));
    if (!amount.trim()) return setError("请输入金额");
    if (!Number.isFinite(value) || value <= 0 || value > 9_999_999) return setError("金额不对,请再看看");
    onSave(transaction.id, {
      amount: roundMoney(value),
      title: title.trim() || CATEGORIES[category].label,
      category,
      subcategory: kind === "income" || category === "shopping" ? "" : category === transaction.category ? transaction.subcategory : defaultPick(category, created),
      kind,
      note,
      createdAt: combineDayTime(day, time, created),
    });
    onClose();
  };

  return (
    <div className="pane edit-pane">
      <h1>编辑这笔账</h1>
      <div className="kind-seg" role="group" aria-label="收支">
        {(["expense", "income"] as const).map((k) => (
          <button key={k} type="button" className={cn(kind === k && "on")} onClick={() => switchKind(k)}>
            {k === "expense" ? "支出" : "收入"}
          </button>
        ))}
      </div>
      <label className="money edit-money">
        <span aria-hidden="true">¥</span>
        <input
          aria-label="金额"
          inputMode="decimal"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError("");
          }}
        />
      </label>
      {error ? <p className="edit-err">{error}</p> : null}
      <input className="edit-field" aria-label="标题" placeholder="标题" value={title} onChange={(event) => setTitle(event.target.value)} />
      <div className="cat-pop" role="group" aria-label="分类">
        {categoriesFor(kind).map((id) => (
          <button key={id} type="button" className={cn(id === category && "on")} onClick={() => setCategory(id)}>
            {CATEGORIES[id].label}
          </button>
        ))}
      </div>
      <p className="edit-label">日期</p>
      <DayChips day={day} onChange={setDay} />
      <input className="edit-field time" type="time" aria-label="时间" value={time} onChange={(event) => setTime(event.target.value)} />
      <input className="edit-field" aria-label="备注" placeholder="备注(可选)" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
      <button type="button" className="primary wide press" onClick={save}>
        保存
      </button>
      <button
        type="button"
        className="edit-del"
        onClick={() => {
          onDelete(transaction);
          onClose();
        }}
      >
        删除
      </button>
      <button type="button" className="text-link cancel-link" onClick={onClose}>
        取消
      </button>
    </div>
  );
}
