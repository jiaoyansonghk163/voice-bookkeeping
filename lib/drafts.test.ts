import assert from "node:assert/strict";
import test from "node:test";
import { commitOrDrop, stageUtterance } from "./drafts";

const SPLIT = "早饭花了50打车花了20然后晚上吃饭花了40块钱出去超市买菜买水果花了¥100";

test("split results stay out of the ledger until confirm", () => {
  const ledger: string[] = [];
  const staged = stageUtterance(SPLIT, new Date("2026-10-20T09:00:00"));
  assert.ok(staged);
  assert.equal(staged.entries.length, 4);
  assert.deepEqual(
    staged.entries.map((entry) => entry.title),
    ["早饭", "打车", "晚饭", "买菜水果"],
  );
  assert.equal(ledger.length, 0);

  assert.equal(commitOrDrop("close", staged.entries), null);
  assert.equal(commitOrDrop("retry", staged.entries), null);
  assert.equal(ledger.length, 0);

  const saved = commitOrDrop("confirm", staged.entries);
  assert.ok(saved);
  assert.equal(saved.length, 4);
  for (const entry of saved) ledger.push(entry.title);
  assert.deepEqual(ledger, ["早饭", "打车", "晚饭", "买菜水果"]);
});

test("重新说一遍 discards the first split and confirm saves only the new one", () => {
  const ledger: string[] = [];
  const first = stageUtterance("早饭花了50打车花了20");
  assert.ok(first);
  assert.equal(commitOrDrop("retry", first.entries), null);
  assert.equal(ledger.length, 0);

  const second = stageUtterance("晚饭花了40");
  assert.ok(second);
  assert.equal(second.entries.length, 1);
  const saved = commitOrDrop("confirm", second.entries);
  assert.ok(saved);
  for (const entry of saved) ledger.push(entry.title);
  assert.deepEqual(ledger, ["晚饭"]);
});

test("removing a row before confirm saves only the rows that remain", () => {
  const staged = stageUtterance("早饭花了50打车花了20");
  assert.ok(staged);
  const kept = staged.entries.filter((entry) => entry.title !== "打车");
  const saved = commitOrDrop("confirm", kept);
  assert.deepEqual(
    saved?.map((entry) => entry.title),
    ["早饭"],
  );
  assert.equal(commitOrDrop("confirm", []), null);
  assert.equal(saved?.[0]?.category, "food");
});
