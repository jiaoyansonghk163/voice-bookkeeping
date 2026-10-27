import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyImport,
  backupReminderDue,
  normalizeLedger,
  normalizeLedgerReport,
  normalizeTransaction,
  parseBackup,
  pickNewer,
  serializeBackup,
  type LedgerState,
} from "./backup";
import { commitOrDrop, setDraftKind, stageUtterance } from "./drafts";
import { applyEdit, breakdownByCategory, filterBills, groupByDay, shiftMonth, transactionsInMonth } from "./ledger";
import { presentKpis } from "./metrics";
import { parseTranscript } from "./parse-transcript";
import type { Transaction } from "./types";

const NOW = new Date(2026, 9, 20, 12, 0, 0);

function tx(id: string, amount: number, extra: Partial<Transaction> = {}): Transaction {
  return {
    id,
    amount,
    category: "food",
    subcategory: "午餐",
    title: "午饭",
    transcript: "午饭",
    createdAt: new Date(2026, 9, 20, 9, 0, 0).toISOString(),
    source: "voice",
    ...extra,
  };
}
const salary = (id: string, amount: number) =>
  tx(id, amount, { category: "salary", subcategory: "", title: "工资", kind: "income" });

test("income sentences parse as income", () => {
  const cases: Array<[string, number, string]> = [
    ["工资到账八千", 8000, "salary"],
    ["收到红包两百", 200, "redpacket"],
    ["退款三十五块", 35, "refund"],
    ["年终奖五千", 5000, "bonus"],
    ["卖了旧手机八百", 800, "income_other"],
  ];
  for (const [phrase, amount, category] of cases) {
    const result = parseTranscript(phrase, NOW);
    assert.equal(result.ok, true, phrase);
    if (!result.ok) continue;
    const entry = result.entries[0];
    console.log(`PARSED ${JSON.stringify({ 说: phrase, 金额: entry.amount, 标题: entry.title, 分类: entry.category, 收支: entry.kind ?? "expense" })}`);
    assert.equal(entry.amount, amount, phrase);
    assert.equal(entry.category, category, phrase);
    assert.equal(entry.kind, "income", phrase);
  }
  const spend = parseTranscript("发红包五十", NOW);
  assert.equal(spend.ok && spend.entries[0].kind, undefined);
});

test("income drafts survive confirm and kind can be switched", () => {
  const staged = stageUtterance("工资到账八千", NOW);
  assert.ok(staged);
  assert.equal(staged.entries[0].kind, "income");
  const saved = commitOrDrop("confirm", staged.entries);
  assert.equal(saved?.[0].kind, "income");
  assert.equal(saved?.[0].category, "salary");
  const flipped = setDraftKind(staged.entries[0], "expense", NOW);
  assert.equal(flipped.kind, "expense");
  assert.equal(flipped.category, "food");
  const dated = stageUtterance("昨天打车15", NOW);
  assert.equal(dated?.entries[0].day, "2026-10-19");
  assert.equal(commitOrDrop("confirm", dated!.entries)?.[0].day, "2026-10-19");
});

test("expense totals ignore income, income has its own total", () => {
  const items = [tx("a", 30), tx("b", 20), salary("c", 8000)];
  const kpis = presentKpis(items, NOW, 1000);
  assert.equal(kpis.monthSpend, 50);
  assert.equal(kpis.todaySpend, 50);
  assert.equal(kpis.todayIncome, 8000);
  assert.equal(kpis.monthIncome, 8000);
  assert.equal(kpis.budgetLeft, 950);
  assert.deepEqual(breakdownByCategory(items).map((s) => s.category), ["food"]);
  assert.deepEqual(breakdownByCategory(items, "income").map((s) => s.category), ["salary"]);
  const group = groupByDay(items, NOW, () => "今天");
  assert.equal(group[0].total, 50);
});

test("old saved ledgers (no kind) load as expenses; income round-trips a backup", () => {
  const old = normalizeTransaction({ id: "x", amount: 5, category: "food", title: "饭", transcript: "", createdAt: "2026-10-01T00:00:00Z", source: "voice" });
  assert.equal(old?.kind, undefined);
  const raw = serializeBackup({ transactions: [salary("s", 100)], monthlyBudget: null });
  const back = parseBackup(raw);
  assert.equal(back?.transactions[0].kind, "income");
  assert.equal(back?.skipped, 0);
});

test("normalisation relaxes caps instead of dropping", () => {
  const big = normalizeTransaction({ ...tx("big", 9_999_999) });
  assert.equal(big?.amount, 9_999_999);
  assert.equal(normalizeTransaction({ ...tx("over", 10_000_000) }), null);
  const long = normalizeTransaction({ ...tx("long", 5), transcript: "话".repeat(1500) });
  assert.equal(long?.transcript.length, 1500);
  const longer = normalizeTransaction({ ...tx("longer", 5), transcript: "话".repeat(2500) });
  assert.equal(longer?.transcript.length, 2000);
  const report = normalizeLedgerReport({ transactions: [tx("ok", 1), { id: "bad" }], monthlyBudget: null });
  assert.equal(report.ledger.transactions.length, 1);
  assert.equal(report.rejected.length, 1);
  assert.equal(normalizeLedger({ transactions: [], monthlyBudget: 5, updatedAt: 123 }).updatedAt, 123);
});

test("parseBackup skips bad rows and counts them", () => {
  const raw = JSON.stringify({ version: 1, monthlyBudget: null, transactions: [tx("a", 1), { id: "nope" }, tx("b", 2)] });
  const parsed = parseBackup(raw);
  assert.equal(parsed?.transactions.length, 2);
  assert.equal(parsed?.skipped, 1);
  const allBad = JSON.stringify({ version: 1, monthlyBudget: null, transactions: [{ id: "nope" }] });
  assert.equal(parseBackup(allBad), null);
  assert.equal(applyImport({ transactions: [], monthlyBudget: null }, parsed!, "replace").added, 2);
});

test("the newer copy wins", () => {
  const a: LedgerState = { transactions: [], monthlyBudget: null, updatedAt: 100 };
  const b: LedgerState = { transactions: [], monthlyBudget: 1, updatedAt: 200 };
  assert.equal(pickNewer(a, b), b);
  assert.equal(pickNewer(b, a), b);
  assert.equal(pickNewer(null, a), a);
  assert.equal(pickNewer({ transactions: [], monthlyBudget: null }, a), a);
});

test("backup reminder rules", () => {
  const day = 86_400_000;
  const now = 100 * day;
  assert.equal(backupReminderDue({ count: 10, lastExportAt: null, dismissedAt: null, now }), true);
  assert.equal(backupReminderDue({ count: 9, lastExportAt: null, dismissedAt: null, now }), false);
  assert.equal(backupReminderDue({ count: 3, lastExportAt: now - 15 * day, dismissedAt: null, now }), true);
  assert.equal(backupReminderDue({ count: 30, lastExportAt: now - 13 * day, dismissedAt: null, now }), false);
  assert.equal(backupReminderDue({ count: 30, lastExportAt: now - 20 * day, dismissedAt: now - day, now }), false);
});

test("month switch, search and category filter", () => {
  const sep = tx("s", 9, { createdAt: new Date(2026, 8, 5, 9).toISOString(), title: "咖啡", category: "food" });
  const items = [tx("a", 30, { note: "同事聚餐" }), tx("t", 15, { category: "transit", subcategory: "打车", title: "打车" }), sep];
  assert.deepEqual(transactionsInMonth(items, shiftMonth(NOW, -1)).map((i) => i.id), ["s"]);
  assert.equal(shiftMonth(new Date(2026, 0, 31), -1).getMonth(), 11);
  assert.deepEqual(filterBills(items, { query: "聚餐" }).map((i) => i.id), ["a"]);
  assert.deepEqual(filterBills(items, { query: "打" }).map((i) => i.id), ["t"]);
  assert.deepEqual(filterBills(items, { category: "food" }).map((i) => i.id), ["a", "s"]);
  assert.deepEqual(filterBills(items, { query: "  " }).length, 3);
});

test("editing a bill", () => {
  const original = tx("a", 30);
  const edited = applyEdit(original, { amount: 45, title: "晚饭", note: "和朋友" }, NOW);
  assert.equal(edited.amount, 45);
  assert.equal(edited.note, "和朋友");
  assert.equal(edited.id, "a");
  const inc = applyEdit(original, { kind: "income", category: "redpacket", subcategory: "" }, NOW);
  assert.equal(inc.kind, "income");
  const back = applyEdit(inc, { kind: "expense", category: "food" }, NOW);
  assert.equal("kind" in back, false);
  assert.equal("note" in applyEdit(edited, { note: " " }, NOW), false);
});
