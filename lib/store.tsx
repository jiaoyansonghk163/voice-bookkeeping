"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type LedgerState } from "./backup";
import { loadLedger, saveLedger } from "./persist";
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
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LedgerState | null>(null);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);

  useEffect(() => {
    let cancel = false;
    loadLedger().then((loaded) => {
      if (!cancel) setState(loaded);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    void saveLedger(state);
  }, [state]);

  const addMany = useCallback((expenses: ParsedExpense[], at?: Date) => {
    const base = (at ?? new Date()).getTime();
    const transactions: Transaction[] = expenses.map((expense, index) => ({
      id: crypto.randomUUID(),
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory,
      title: expense.title,
      transcript: expense.transcript,
      createdAt: new Date(base + index).toISOString(),
      source: "voice",
    }));
    setState((current) =>
      current ? { ...current, transactions: [...transactions].reverse().concat(current.transactions) } : current,
    );
    const ids = transactions.map((item) => item.id);
    setHighlightIds(ids);
    window.setTimeout(() => {
      setHighlightIds((current) => (current.some((id) => ids.includes(id)) ? [] : current));
    }, 2800);
    return transactions;
  }, []);

  const remove = useCallback((id: string) => {
    setState((current) =>
      current ? { ...current, transactions: current.transactions.filter((item) => item.id !== id) } : current,
    );
  }, []);

  const restore = useCallback((transaction: Transaction) => {
    setState((current) => {
      if (!current || current.transactions.some((item) => item.id === transaction.id)) return current;
      return { ...current, transactions: [transaction, ...current.transactions] };
    });
  }, []);

  const loadDemo = useCallback(() => {
    const samples = createSampleTransactions(new Date());
    setState((current) => {
      if (!current) return current;
      const own = current.transactions.filter((item) => item.source !== "sample");
      return { ...current, transactions: [...samples, ...own] };
    });
  }, []);

  const clearDemo = useCallback(() => {
    setState((current) => {
      if (!current) return current;
      return { ...current, transactions: current.transactions.filter((item) => item.source !== "sample") };
    });
  }, []);

  const setMonthlyBudget = useCallback((amount: number | null) => {
    setState((current) => (current ? { ...current, monthlyBudget: amount } : current));
  }, []);

  const replaceLedger = useCallback((next: LedgerState) => {
    setHighlightIds([]);
    setState(next);
  }, []);

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
    }),
    [state, highlightIds, addMany, remove, restore, loadDemo, clearDemo, setMonthlyBudget, replaceLedger],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
