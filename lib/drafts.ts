import { categoriesFor, defaultPick } from "./categories";
import { parseTranscript } from "./parse-transcript";
import { dayString, roundMoney } from "./format";
import type { CategoryId, EntryKind, ParsedExpense } from "./types";

export interface EditableDraft {
  amount: string;
  category: CategoryId;
  subcategory: string;
  title: string;
  transcript: string;
  source: string;
  confidence: "high" | "low";
  day: string;
  kind: EntryKind;
}

export interface OpenDraft {
  transcript: string;
  entries: EditableDraft[];
}

function readAmount(text: string): number | null {
  const value = Number(text.replace(/[¥￥,\s]/g, ""));
  if (!Number.isFinite(value) || value <= 0 || value > 9_999_999) return null;
  return roundMoney(value);
}

export { dayString };

export function createdAtFromDay(day: string, clock: Date): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return clock.toISOString();
  const next = new Date(clock);
  next.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return next.toISOString();
}

/** Parse into an in-memory draft. This does not touch the device ledger. */
export function stageUtterance(text: string, now = new Date(), preset?: CategoryId | null): OpenDraft | null {
  const parsed = parseTranscript(text, now);
  if (!parsed.ok) return null;
  const today = dayString(now);
  return {
    transcript: parsed.transcript,
    entries: parsed.entries.map((entry) => ({
      amount: String(entry.amount),
      category: preset && entry.kind !== "income" ? preset : entry.category,
      subcategory: preset && entry.kind !== "income" ? defaultPick(preset, now) : entry.subcategory,
      title: entry.title,
      transcript: parsed.transcript,
      source: entry.source?.trim() || parsed.transcript,
      confidence: entry.confidence === "low" ? "low" : "high",
      day: entry.day ?? today,
      kind: entry.kind === "income" ? "income" : "expense",
    })),
  };
}

/**
 * Closing the sheet or tapping 重新说一遍 drops the draft.
 * The return value is what may be written to IndexedDB: nothing.
 */
export function discardDraft(): null {
  return null;
}

/** The only path that produces bills for IndexedDB. */
export function confirmEditable(entries: EditableDraft[]): ParsedExpense[] | null {
  if (entries.length === 0) return null;
  const expenses: ParsedExpense[] = [];
  for (const entry of entries) {
    const amount = readAmount(entry.amount);
    const title = entry.title.trim();
    if (amount == null || !title) return null;
    expenses.push({
      amount,
      category: entry.category,
      subcategory: entry.category === "shopping" || entry.kind === "income" ? "" : entry.subcategory,
      title,
      transcript: entry.transcript,
      ...(entry.kind === "income" ? { kind: "income" as const } : {}),
      day: entry.day,
    });
  }
  return expenses;
}

export type DraftAction = "confirm" | "close" | "retry";

/** close and retry never yield bills. confirm does, and only then. */
export function commitOrDrop(action: DraftAction, entries: EditableDraft[]): ParsedExpense[] | null {
  if (action !== "confirm") return null;
  return confirmEditable(entries);
}

export function sumEditable(entries: EditableDraft[]): number {
  return roundMoney(entries.reduce((sum, entry) => sum + (readAmount(entry.amount) ?? 0), 0));
}

/** Switch a draft between 支出 and 收入, moving it to a category that fits. */
export function setDraftKind<T extends EditableDraft>(entry: T, kind: EntryKind, now = new Date()): T {
  if (entry.kind === kind) return entry;
  const category = categoriesFor(kind)[0];
  return { ...entry, kind, category, subcategory: defaultPick(category, now) };
}
