export type CategoryId =
  | "food"
  | "transit"
  | "shopping"
  | "fun"
  | "home"
  | "health"
  | "other";

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
}

export interface ParsedExpense {
  amount: number;
  category: CategoryId;
  subcategory: string;
  title: string;
  transcript: string;
}

export type ParseResult =
  | { ok: true; transcript: string; entries: ParsedExpense[] }
  | { ok: false; transcript: string; reason: string };
