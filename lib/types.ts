export type CategoryId =
  | "food"
  | "transit"
  | "shopping"
  | "daily"
  | "fun"
  | "home"
  | "health"
  | "other";

export type TransactionSource = "sample" | "voice";

export interface Transaction {
  id: string;
  amount: number;
  category: CategoryId;
  title: string;
  transcript: string;
  createdAt: string;
  source: TransactionSource;
}

export interface ParsedExpense {
  amount: number;
  category: CategoryId;
  title: string;
  transcript: string;
}

export type ParseResult =
  | ({ ok: true } & ParsedExpense)
  | { ok: false; transcript: string; reason: string };
