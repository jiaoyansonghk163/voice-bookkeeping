import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLedger, parseBackup, serializeBackup } from "./backup";

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
  assert.equal(parsed?.transactions[1]?.subcategory, "日用");
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
