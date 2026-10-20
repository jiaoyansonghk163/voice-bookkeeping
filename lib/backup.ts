import { CATEGORIES } from "./categories";
import type { Transaction } from "./types";

export interface LedgerState {
  transactions: Transaction[];
  monthlyBudget: number | null;
}

export interface LedgerBackup extends LedgerState {
  version: 1;
  exportedAt: string;
}

export function emptyLedger(): LedgerState {
  return { transactions: [], monthlyBudget: null };
}

export function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const item = value as Transaction;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    item.id.length < 80 &&
    typeof item.amount === "number" &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    item.amount <= 99_999 &&
    typeof item.title === "string" &&
    item.title.length > 0 &&
    item.title.length < 80 &&
    typeof item.transcript === "string" &&
    item.transcript.length < 200 &&
    typeof item.createdAt === "string" &&
    !Number.isNaN(Date.parse(item.createdAt)) &&
    (item.source === "sample" || item.source === "voice") &&
    item.category in CATEGORIES
  );
}

export function isMonthlyBudget(value: unknown): value is number | null {
  if (value == null) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 9_999_999;
}

export function parseBackup(text: string): LedgerState | null {
  try {
    const parsed = JSON.parse(text) as Partial<LedgerBackup>;
    if (parsed.version !== 1 || !Array.isArray(parsed.transactions)) return null;
    if (!isMonthlyBudget(parsed.monthlyBudget)) return null;
    const transactions = parsed.transactions.filter(isTransaction);
    if (transactions.length !== parsed.transactions.length) return null;
    return { transactions, monthlyBudget: parsed.monthlyBudget ?? null };
  } catch {
    return null;
  }
}

export function serializeBackup(state: LedgerState): string {
  const backup: LedgerBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    monthlyBudget: state.monthlyBudget,
  };
  return JSON.stringify(backup, null, 2);
}
