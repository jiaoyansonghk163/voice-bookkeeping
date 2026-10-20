import { defaultPick } from "./categories";
import { parseTranscript } from "./parse-transcript";
import { roundMoney } from "./format";
import type { CategoryId, ParsedExpense } from "./types";

export interface EditableDraft {
  amount: string;
  category: CategoryId;
  subcategory: string;
  title: string;
  transcript: string;
}

export interface OpenDraft {
  transcript: string;
  entries: EditableDraft[];
}

function readAmount(text: string): number | null {
  const value = Number(text.replace(/[¥￥,\s]/g, ""));
  if (!Number.isFinite(value) || value <= 0 || value > 99_999) return null;
  return roundMoney(value);
}

/** Parse into an in-memory draft. This does not touch the device ledger. */
export function stageUtterance(text: string, now = new Date(), preset?: CategoryId | null): OpenDraft | null {
  const parsed = parseTranscript(text, now);
  if (!parsed.ok) return null;
  return {
    transcript: parsed.transcript,
    entries: parsed.entries.map((entry) => ({
      amount: String(entry.amount),
      category: preset ?? entry.category,
      subcategory: preset ? defaultPick(preset, now) : entry.subcategory,
      title: entry.title,
      transcript: parsed.transcript,
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
      subcategory: entry.category === "shopping" ? "" : entry.subcategory,
      title,
      transcript: entry.transcript,
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
