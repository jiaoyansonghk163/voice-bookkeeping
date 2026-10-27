import { CATEGORIES, fallbackSubcategory, isIncomeCategory } from "./categories";
import type { CategoryId, Transaction } from "./types";

export interface LedgerState {
  transactions: Transaction[];
  monthlyBudget: number | null;
  /** ms epoch of the last change; used to pick the newer of two stored copies. */
  updatedAt?: number;
}

export const MAX_AMOUNT = 9_999_999;
export const MAX_TRANSCRIPT = 2000;

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
    kind?: unknown;
    note?: unknown;
    updatedAt?: unknown;
  };
  if (typeof item.id !== "string" || item.id.length === 0 || item.id.length >= 80) return null;
  if (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount <= 0 || item.amount > MAX_AMOUNT) {
    return null;
  }
  if (typeof item.title !== "string" || item.title.length === 0) return null;
  const title = item.title.length >= 80 ? item.title.slice(0, 79) : item.title;
  const transcript = typeof item.transcript === "string" ? item.transcript.slice(0, MAX_TRANSCRIPT) : "";
  if (typeof item.createdAt !== "string" || Number.isNaN(Date.parse(item.createdAt))) return null;
  if (item.source !== "sample" && item.source !== "voice") return null;

  let category = item.category;
  let subcategory = typeof item.subcategory === "string" ? item.subcategory.trim() : "";
  if (category === "daily") category = "shopping";
  if (typeof category !== "string" || !(category in CATEGORIES)) return null;
  const id = category as CategoryId;
  const income = isIncomeCategory(id) || item.kind === "income";
  if (income && !isIncomeCategory(id)) return null;
  if (isIncomeCategory(id) || id === "shopping" || subcategory === "日用") subcategory = "";
  else if (!subcategory || subcategory.length > 20) subcategory = fallbackSubcategory(id);

  return {
    id: item.id,
    amount: item.amount,
    category: id,
    subcategory,
    title,
    transcript,
    createdAt: item.createdAt,
    source: item.source,
    ...(income ? { kind: "income" as const } : {}),
    ...(typeof item.note === "string" && item.note.trim() ? { note: item.note.slice(0, 500) } : {}),
    ...(typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt)) ? { updatedAt: item.updatedAt } : {}),
  };
}

export function isMonthlyBudget(value: unknown): value is number | null {
  if (value == null) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 9_999_999;
}

export interface NormalizeReport {
  ledger: LedgerState;
  /** Raw rows that could not be read. Keep them somewhere instead of dropping them. */
  rejected: unknown[];
}

function stampOf(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function normalizeLedgerReport(value: unknown): NormalizeReport {
  const state = value && typeof value === "object" ? (value as Partial<LedgerState>) : {};
  const source = Array.isArray(state.transactions) ? state.transactions : [];
  const transactions: Transaction[] = [];
  const rejected: unknown[] = [];
  for (const item of source) {
    const transaction = normalizeTransaction(item);
    if (transaction) transactions.push(transaction);
    else rejected.push(item);
  }
  const updatedAt = stampOf(state.updatedAt);
  return {
    ledger: {
      transactions,
      monthlyBudget: isMonthlyBudget(state.monthlyBudget) ? (state.monthlyBudget ?? null) : null,
      ...(updatedAt ? { updatedAt } : {}),
    },
    rejected,
  };
}

export function normalizeLedger(value: unknown): LedgerState {
  return normalizeLedgerReport(value).ledger;
}

/** The copy with the later updatedAt wins; a copy without a stamp counts as 0. Ties favour `a`. */
export function pickNewer<T extends { updatedAt?: number }>(a: T | null, b: T | null): T | null {
  if (!a) return b;
  if (!b) return a;
  return (b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a;
}

export interface ParsedBackup extends LedgerState {
  /** Rows in the file that were not readable and were left out. */
  skipped: number;
}

/** Bad rows are skipped and counted. A file with rows but none readable is rejected. */
export function parseBackup(text: string): ParsedBackup | null {
  try {
    const parsed = JSON.parse(text) as Partial<LedgerBackup>;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.transactions)) return null;
    if (!isMonthlyBudget(parsed.monthlyBudget)) return null;
    const transactions: Transaction[] = [];
    let skipped = 0;
    for (const item of parsed.transactions) {
      const transaction = normalizeTransaction(item);
      if (transaction) transactions.push(transaction);
      else skipped += 1;
    }
    if (transactions.length === 0 && skipped > 0) return null;
    return { transactions, monthlyBudget: parsed.monthlyBudget ?? null, skipped };
  } catch {
    return null;
  }
}

const DAY_MS = 86_400_000;
export const BACKUP_REMINDER_DAYS = 14;

/**
 * Show the gentle reminder when the last export is over 14 days old, or when there
 * has never been one and there are at least 10 bills. A dismissal hides it for 7 days.
 */
export function backupReminderDue(input: {
  count: number;
  lastExportAt: number | null;
  dismissedAt: number | null;
  now: number;
}): boolean {
  if (input.dismissedAt != null && input.now - input.dismissedAt < 7 * DAY_MS) return false;
  if (input.lastExportAt == null) return input.count >= 10;
  return input.now - input.lastExportAt > BACKUP_REMINDER_DAYS * DAY_MS;
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
