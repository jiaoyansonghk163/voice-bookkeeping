import { CATEGORIES, fallbackSubcategory } from "./categories";
import type { CategoryId, Transaction } from "./types";

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

export function normalizeTransaction(value: unknown): Transaction | null {
  if (!value || typeof value !== "object") return null;
  const item = value as {
    id?: unknown;
    amount?: unknown;
    category?: unknown;
    subcategory?: unknown;
    title?: unknown;
    transcript?: unknown;
    createdAt?: unknown;
    source?: unknown;
  };
  if (typeof item.id !== "string" || item.id.length === 0 || item.id.length >= 80) return null;
  if (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 99_999) {
    return null;
  }
  if (typeof item.title !== "string" || item.title.length === 0 || item.title.length >= 80) return null;
  if (typeof item.transcript !== "string" || item.transcript.length >= 500) return null;
  if (typeof item.createdAt !== "string" || Number.isNaN(Date.parse(item.createdAt))) return null;
  if (item.source !== "sample" && item.source !== "voice") return null;

  let category = item.category;
  let subcategory = typeof item.subcategory === "string" ? item.subcategory.trim() : "";
  if (category === "daily") category = "shopping";
  if (typeof category !== "string" || !(category in CATEGORIES)) return null;
  const id = category as CategoryId;
  if (id === "shopping" || subcategory === "日用") subcategory = "";
  else if (!subcategory || subcategory.length > 20) subcategory = fallbackSubcategory(id);

  return {
    id: item.id,
    amount: item.amount,
    category: id,
    subcategory,
    title: item.title,
    transcript: item.transcript,
    createdAt: item.createdAt,
    source: item.source,
  };
}

export function isMonthlyBudget(value: unknown): value is number | null {
  if (value == null) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 9_999_999;
}

export function normalizeLedger(value: unknown): LedgerState {
  const state = value && typeof value === "object" ? (value as Partial<LedgerState>) : {};
  const source = Array.isArray(state.transactions) ? state.transactions : [];
  const transactions: Transaction[] = [];
  for (const item of source) {
    const transaction = normalizeTransaction(item);
    if (transaction) transactions.push(transaction);
  }
  return {
    transactions,
    monthlyBudget: isMonthlyBudget(state.monthlyBudget) ? (state.monthlyBudget ?? null) : null,
  };
}

export function parseBackup(text: string): LedgerState | null {
  try {
    const parsed = JSON.parse(text) as Partial<LedgerBackup>;
    if (parsed.version !== 1 || !Array.isArray(parsed.transactions)) return null;
    if (!isMonthlyBudget(parsed.monthlyBudget)) return null;
    const transactions: Transaction[] = [];
    for (const item of parsed.transactions) {
      const transaction = normalizeTransaction(item);
      if (!transaction) return null;
      transactions.push(transaction);
    }
    return { transactions, monthlyBudget: parsed.monthlyBudget ?? null };
  } catch {
    return null;
  }
}

export type ImportMode = "append" | "replace";

export interface ImportApply {
  ledger: LedgerState;
  added: number;
  skipped: number;
}

/**
 * Append keeps the current bills and budget, and skips ids already stored.
 * Replace swaps the whole table, including the budget, for the file.
 */
export function applyImport(current: LedgerState, incoming: LedgerState, mode: ImportMode): ImportApply {
  if (mode === "replace") {
    return {
      ledger: {
        transactions: incoming.transactions,
        monthlyBudget: incoming.monthlyBudget,
      },
      added: incoming.transactions.length,
      skipped: 0,
    };
  }

  const seen = new Set(current.transactions.map((item) => item.id));
  const added: LedgerState["transactions"] = [];
  let skipped = 0;
  for (const item of incoming.transactions) {
    if (seen.has(item.id)) {
      skipped += 1;
      continue;
    }
    seen.add(item.id);
    added.push(item);
  }

  return {
    ledger: {
      transactions: [...added, ...current.transactions],
      monthlyBudget: current.monthlyBudget,
    },
    added: added.length,
    skipped,
  };
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
