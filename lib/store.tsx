"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "./categories";
import { createSampleTransactions } from "./sample-data";
import type { ParsedExpense, Transaction } from "./types";

const STORAGE_KEY = "liji.ledger.v2";

interface StoreValue {
  ready: boolean;
  transactions: Transaction[];
  highlightId: string | null;
  add: (expense: ParsedExpense, at?: Date) => Transaction;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const item = value as Transaction;
  return (
    typeof item.id === "string" &&
    typeof item.amount === "number" &&
    Number.isFinite(item.amount) &&
    typeof item.title === "string" &&
    typeof item.transcript === "string" &&
    typeof item.createdAt === "string" &&
    (item.source === "sample" || item.source === "voice") &&
    item.category in CATEGORIES
  );
}

function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { version?: number; transactions?: unknown };
      if (parsed.version === 2 && Array.isArray(parsed.transactions)) {
        const items = parsed.transactions.filter(isTransaction);
        if (items.length > 0) return items;
      }
    }
  } catch {
    /* fall through to the sample ledger */
  }
  return createSampleTransactions(new Date());
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    setTransactions(loadTransactions());
  }, []);

  useEffect(() => {
    if (!transactions) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, transactions }));
    } catch {
      /* ignore quota / private mode */
    }
  }, [transactions]);

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
    setTransactions((current) => [transaction, ...(current ?? [])]);
    setHighlightId(transaction.id);
    window.setTimeout(() => {
      setHighlightId((current) => (current === transaction.id ? null : current));
    }, 2800);
    return transaction;
  }, []);

  const reset = useCallback(() => {
    setHighlightId(null);
    setTransactions(createSampleTransactions(new Date()));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready: transactions !== null,
      transactions: transactions ?? [],
      highlightId,
      add,
      reset,
    }),
    [transactions, highlightId, add, reset],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
