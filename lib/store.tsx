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
  highlightId: string | null;
  add: (expense: ParsedExpense, at?: Date) => Transaction;
  loadDemo: () => void;
  clearDemo: () => void;
  setMonthlyBudget: (amount: number | null) => void;
  replaceLedger: (next: LedgerState) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LedgerState | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

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

  const add = useCallback((expense: ParsedExpense, at?: Date) => {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      amount: expense.amount,
      category: expense.category,
      title: expense.title,
      transcript: expense.transcript,
      createdAt: (at ?? new Date()).toISOString(),
      source: "voice",
    };
    setState((current) =>
      current ? { ...current, transactions: [transaction, ...current.transactions] } : current,
    );
    setHighlightId(transaction.id);
    window.setTimeout(() => {
      setHighlightId((current) => (current === transaction.id ? null : current));
    }, 2800);
    return transaction;
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
    setHighlightId(null);
    setState(next);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready: state !== null,
      transactions: state?.transactions ?? [],
      monthlyBudget: state?.monthlyBudget ?? null,
      highlightId,
      add,
      loadDemo,
      clearDemo,
      setMonthlyBudget,
      replaceLedger,
    }),
    [state, highlightId, add, loadDemo, clearDemo, setMonthlyBudget, replaceLedger],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
