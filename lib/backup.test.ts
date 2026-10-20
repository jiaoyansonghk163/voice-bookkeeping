import assert from "node:assert/strict";
import test from "node:test";
import { parseBackup, serializeBackup } from "./backup";

test("round-trips a ledger backup", () => {
  const raw = serializeBackup({
    monthlyBudget: 2000,
    transactions: [
      {
        id: "voice-1",
        amount: 38,
        category: "food",
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
