"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { type LedgerState } from "./backup";
import { applyEdit, type BillPatch } from "./ledger";
import {
  loadLedger,
  loadPreviousLedger,
  readLedger,
  readMeta,
  saveLedger,
  savePreviousLedger,
  subscribeExternal,
  writeMeta,
  type LedgerMeta,
} from "./persist";
import { createSampleTransactions } from "./sample-data";
import type { ParsedExpense, Transaction } from "./types";

interface StoreValue {
  ready: boolean;
  transactions: Transaction[];
  monthlyBudget: number | null;
  highlightIds: string[];
  addMany: (expenses: ParsedExpense[], at?: Date) => Transaction[];
  remove: (id: string) => void;
  restore: (transaction: Transaction) => void;
  loadDemo: () => void;
  clearDemo: () => void;
  setMonthlyBudget: (amount: number | null) => void;
  replaceLedger: (next: LedgerState) => void;
  update: (id: string, patch: BillPatch) => void;
  /** True once both the IndexedDB and localStorage writes failed. Cleared by the next good save. */
  saveFailed: boolean;
  canUndoImport: boolean;
  undoImport: () => void;
  meta: LedgerMeta;
  markExported: () => void;
  dismissReminder: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LedgerState | null>(null);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const [canUndoImport, setCanUndoImport] = useState(false);
  const [meta, setMeta] = useState<LedgerMeta>({ lastExportAt: null, reminderDismissedAt: null });
  const stateRef = useRef<LedgerState | null>(null);
  const persistedStamp = useRef<number | undefined>(undefined);
  stateRef.current = state;

  useEffect(() => {
    let cancel = false;
    setMeta(readMeta());
    loadLedger().then((loaded) => {
      if (cancel) return;
      persistedStamp.current = loaded.updatedAt;
      setState(loaded);
    });
    void loadPreviousLedger().then((previous) => {
      if (!cancel) setCanUndoImport(previous != null);
    });
    return () => {
      cancel = true;
    };
  }, []);

  // Another tab saved: take its copy when it is newer than ours.
  useEffect(() => {
    return subscribeExternal(() => {
      void readLedger().then((latest) => {
        const mine = stateRef.current;
        if (!mine) return;
        if ((latest.updatedAt ?? 0) <= (mine.updatedAt ?? 0)) return;
        persistedStamp.current = latest.updatedAt;
        setState(latest);
      });
    });
  }, []);

  useEffect(() => {
    if (!state || state.updatedAt === persistedStamp.current) return;
    persistedStamp.current = state.updatedAt;
    void saveLedger(state).then((ok) => setSaveFailed(!ok));
  }, [state]);

  /** Every change goes through here so it gets a fresh, strictly increasing stamp. */
  const mutate = useCallback((change: (current: LedgerState) => LedgerState) => {
    setState((current) => {
      if (!current) return current;
      const next = change(current);
      if (next === current) return current;
      return { ...next, updatedAt: Math.max(Date.now(), (current.updatedAt ?? 0) + 1) };
    });
  }, []);

  const addMany = useCallback((expenses: ParsedExpense[], at?: Date) => {
    const base = (at ?? new Date()).getTime();
    const transactions: Transaction[] = expenses.map((expense, index) => ({
      id: crypto.randomUUID(),
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory,
      title: expense.title,
      transcript: expense.transcript,
      createdAt: expense.createdAt ?? new Date(base + index).toISOString(),
      source: "voice",
      ...(expense.kind === "income" ? { kind: "income" as const } : {}),
      ...(expense.note ? { note: expense.note } : {}),
    }));
    mutate((current) => ({ ...current, transactions: [...transactions].reverse().concat(current.transactions) }));
    const ids = transactions.map((item) => item.id);
    setHighlightIds(ids);
    window.setTimeout(() => {
      setHighlightIds((current) => (current.some((id) => ids.includes(id)) ? [] : current));
    }, 940);
    return transactions;
  }, []);

  const remove = useCallback((id: string) => {
    mutate((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }));
  }, []);

  const restore = useCallback((transaction: Transaction) => {
    mutate((current) => {
      if (current.transactions.some((item) => item.id === transaction.id)) return current;
      return { ...current, transactions: [transaction, ...current.transactions] };
    });
  }, []);

  const loadDemo = useCallback(() => {
    const samples = createSampleTransactions(new Date());
    mutate((current) => {
      const own = current.transactions.filter((item) => item.source !== "sample");
      return { ...current, transactions: [...samples, ...own] };
    });
  }, []);

  const clearDemo = useCallback(() => {
    mutate((current) => {
      return { ...current, transactions: current.transactions.filter((item) => item.source !== "sample") };
    });
  }, []);

  const setMonthlyBudget = useCallback((amount: number | null) => {
    mutate((current) => ({ ...current, monthlyBudget: amount }));
  }, []);

  const replaceLedger = useCallback((next: LedgerState) => {
    setHighlightIds([]);
    const before = stateRef.current;
    // Keep what was there so 撤销导入 can bring it back.
    void savePreviousLedger(before).then(() => setCanUndoImport(before != null));
    mutate(() => next);
  }, [mutate]);

  const undoImport = useCallback(() => {
    void loadPreviousLedger().then((previous) => {
      if (!previous) return;
      setHighlightIds([]);
      mutate(() => previous);
      void savePreviousLedger(null).then(() => setCanUndoImport(false));
    });
  }, [mutate]);

  const update = useCallback(
    (id: string, patch: BillPatch) => {
      mutate((current) => ({
        ...current,
        transactions: current.transactions.map((item) => (item.id === id ? applyEdit(item, patch) : item)),
      }));
    },
    [mutate],
  );

  const markExported = useCallback(() => setMeta(writeMeta({ lastExportAt: Date.now() })), []);
  const dismissReminder = useCallback(() => setMeta(writeMeta({ reminderDismissedAt: Date.now() })), []);

  const value = useMemo<StoreValue>(
    () => ({
      ready: state !== null,
      transactions: state?.transactions ?? [],
      monthlyBudget: state?.monthlyBudget ?? null,
      highlightIds,
      addMany,
      remove,
      restore,
      loadDemo,
      clearDemo,
      setMonthlyBudget,
      replaceLedger,
      update,
      saveFailed,
      canUndoImport,
      undoImport,
      meta,
      markExported,
      dismissReminder,
    }),
    [state, highlightIds, addMany, remove, restore, loadDemo, clearDemo, setMonthlyBudget, replaceLedger, update, saveFailed, canUndoImport, undoImport, meta, markExported, dismissReminder],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
