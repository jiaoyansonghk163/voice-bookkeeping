import assert from "node:assert/strict";
import test from "node:test";
import { applyImport, normalizeLedger, parseBackup, serializeBackup } from "./backup";
import type { Transaction } from "./types";

test("round-trips a ledger backup", () => {
  const raw = serializeBackup({
    monthlyBudget: 2000,
    transactions: [
      {
        id: "voice-1",
        amount: 38,
        category: "food",
        subcategory: "午餐",
        title: "午饭",
        transcript: "午饭三十八",
        createdAt: "2026-10-20T12:30:00.000Z",
        source: "voice",
      },
    ],
  });
  const parsed = parseBackup(raw);
  assert.equal(parsed?.monthlyBudget, 2000);
  assert.equal(parsed?.transactions[0]?.title, "午饭");
  assert.equal(parsed?.transactions[0]?.subcategory, "午餐");
});

test("fills a default subcategory and folds the old daily category", () => {
  const parsed = parseBackup(
    JSON.stringify({
      version: 1,
      monthlyBudget: null,
      transactions: [
        {
          id: "old-food",
          amount: 12,
          category: "food",
          title: "午饭",
          transcript: "午饭十二",
          createdAt: "2026-10-01T00:00:00.000Z",
          source: "voice",
        },
        {
          id: "old-daily",
          amount: 9,
          category: "daily",
          title: "纸巾",
          transcript: "纸巾九块",
          createdAt: "2026-10-02T00:00:00.000Z",
          source: "voice",
        },
      ],
    }),
  );
  assert.equal(parsed?.transactions[0]?.subcategory, "餐饮");
  assert.equal(parsed?.transactions[1]?.category, "shopping");
  assert.equal(parsed?.transactions[1]?.subcategory, "");

  const detailed = parseBackup(
    JSON.stringify({
      version: 1,
      monthlyBudget: null,
      transactions: [
        {
          id: "old-shop",
          amount: 20,
          category: "shopping",
          subcategory: "日用",
          title: "纸巾",
          transcript: "纸巾二十",
          createdAt: "2026-10-03T00:00:00.000Z",
          source: "voice",
        },
      ],
    }),
  );
  assert.equal(detailed?.transactions[0]?.category, "shopping");
  assert.equal(detailed?.transactions[0]?.subcategory, "");
});

test("normalizes an on-device ledger that predates subcategories", () => {
  const ledger = normalizeLedger({
    monthlyBudget: 100,
    transactions: [
      {
        id: "old-1",
        amount: 22,
        category: "food",
        title: "咖啡",
        transcript: "咖啡二十二",
        createdAt: "2026-10-03T00:00:00.000Z",
        source: "voice",
      },
    ],
  });
  assert.equal(ledger.transactions[0]?.subcategory, "餐饮");
  assert.equal(ledger.monthlyBudget, 100);
});

function bill(id: string, title: string, createdAt = "2026-10-20T12:00:00.000Z"): Transaction {
  return {
    id,
    amount: 12,
    category: "food",
    subcategory: "午餐",
    title,
    transcript: title,
    createdAt,
    source: "voice",
  };
}

test("export stays a version 1 ledger file", () => {
  const raw = serializeBackup({ transactions: [bill("a", "午饭")], monthlyBudget: 2000 });
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  assert.equal(parsed.version, 1);
  assert.deepEqual(Object.keys(parsed).sort(), ["exportedAt", "monthlyBudget", "transactions", "version"]);
  assert.equal(parseBackup(raw)?.transactions[0]?.id, "a");
});

test("append adds new rows, skips ids already stored, and keeps the current budget", () => {
  const current = { monthlyBudget: 100, transactions: [bill("a", "午饭")] };
  const incoming = {
    monthlyBudget: 999,
    transactions: [bill("a", "午饭"), bill("b", "地铁", "2026-10-21T01:00:00.000Z"), bill("b", "地铁")],
  };
  const result = applyImport(current, incoming, "append");
  assert.equal(result.added, 1);
  assert.equal(result.skipped, 2);
  assert.equal(result.ledger.monthlyBudget, 100);
  assert.deepEqual(
    result.ledger.transactions.map((item) => item.id),
    ["b", "a"],
  );
});

test("replace swaps the table and the budget", () => {
  const current = { monthlyBudget: 100, transactions: [bill("a", "午饭"), bill("keep", "咖啡")] };
  const incoming = { monthlyBudget: 50, transactions: [bill("b", "地铁")] };
  const result = applyImport(current, incoming, "replace");
  assert.equal(result.added, 1);
  assert.equal(result.skipped, 0);
  assert.equal(result.ledger.monthlyBudget, 50);
  assert.deepEqual(
    result.ledger.transactions.map((item) => item.id),
    ["b"],
  );
});

test("rejects a backup that is not the ledger file", () => {
  assert.equal(parseBackup("{}"), null);
  assert.equal(parseBackup("[]"), null);
  assert.equal(
    parseBackup(
      JSON.stringify({
        version: 1,
        transactions: [{ id: "x", amount: -1, category: "food", title: "午饭", transcript: "", createdAt: "nope", source: "voice" }],
        monthlyBudget: null,
      }),
    ),
    null,
  );
});
