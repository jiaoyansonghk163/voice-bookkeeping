export type CategoryId =
  | "food"
  | "transit"
  | "shopping"
  | "fun"
  | "home"
  | "health"
  | "other"
  | "salary"
  | "bonus"
  | "redpacket"
  | "refund"
  | "income_other";

export type EntryKind = "expense" | "income";

export type TransactionSource = "sample" | "voice";

export interface Transaction {
  id: string;
  amount: number;
  category: CategoryId;
  subcategory: string;
  title: string;
  transcript: string;
  createdAt: string;
  source: TransactionSource;
  /** Missing means expense, so ledgers saved before income existed still load. */
  kind?: EntryKind;
  /** Free note, optional. */
  note?: string;
  updatedAt?: string;
}

export interface ParsedExpense {
  amount: number;
  category: CategoryId;
  subcategory: string;
  title: string;
  transcript: string;
  /** Spoken slice for this bill, shown as 原文 before confirm. */
  source?: string;
  /** Set by the parser. Low means the confirm sheet shows the review hint. */
  confidence?: "high" | "low";
  /** Set when the user confirms a chosen calendar day. */
  createdAt?: string;
  kind?: EntryKind;
  /** Calendar day (YYYY-MM-DD) when the speech named one. */
  day?: string;
  note?: string;
}

export type ParseResult =
  | { ok: true; transcript: string; entries: ParsedExpense[] }
  | { ok: false; transcript: string; reason: string };
