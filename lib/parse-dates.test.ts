import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTranscript } from "./parse-transcript";

// Tuesday 2026-10-20 12:00
const NOW = new Date(2026, 9, 20, 12, 0, 0);

function one(phrase: string) {
  const result = parseTranscript(phrase, NOW);
  assert.equal(result.ok, true, phrase);
  if (!result.ok) throw new Error(phrase);
  return result.entries;
}

function row(phrase: string) {
  const [e] = one(phrase);
  const line = {
    说: phrase,
    金额: e.amount,
    标题: e.title,
    分类: e.category,
    收支: e.kind ?? "expense",
    日期: (e as { day?: string }).day ?? "-",
  };
  // Real output for the report table.
  console.log("PARSED " + JSON.stringify(line));
  return { ...e, day: (e as { day?: string }).day };
}

test("date words set the day and leave the title", () => {
  assert.deepEqual([row("昨天打车15").day, row("昨天打车15").title, row("昨天打车15").amount], ["2026-10-19", "打车", 15]);
  assert.equal(row("前天午饭三十五块").day, "2026-10-18");
  assert.equal(row("前天午饭三十五块").title, "午饭");
  assert.equal(row("大前天咖啡二十").day, "2026-10-17");
  assert.equal(row("今天午饭30块").day, "2026-10-20");
  assert.equal(row("上周五打车二十").day, "2026-10-16");
  assert.equal(row("上周二打车二十").day, "2026-10-13");
  assert.equal(row("15号买菜四十").day, "2026-10-15");
  assert.equal(row("15号买菜四十").title, "买菜");
  assert.equal(row("10月3日停车十块").day, "2026-10-03");
  assert.equal(row("九月三十号打车二十").day, "2026-09-30");
  assert.equal(row("午饭三十").day, undefined);
});

test("amount gaps", () => {
  assert.equal(row("三块半").amount, 3.5);
  assert.equal(row("一块五").amount, 1.5);
  assert.equal(row("两千五买鞋").amount, 2500);
  assert.equal(row("两千五买鞋").category, "shopping");
  assert.equal(row("一万二买手机").amount, 12000);
  assert.equal(row("工资1.2万").amount, 12000);
  assert.equal(row("３５块午饭").amount, 35);
  assert.equal(row("午饭３５块").amount, 35);
  assert.equal(row("打车五").amount, 5);
  assert.equal(row("打车五").category, "transit");
  assert.equal(row("花了35午饭").title, "午饭");
  assert.equal(row("花了35块午饭").amount, 35);
});

test("numbers that are not amounts are rejected", () => {
  for (const phrase of ["十分钟", "等了五分钟", "三点开会", "来了三个人", "5号楼", "三次", "二十岁", "八楼", "住在三路"]) {
    assert.equal(parseTranscript(phrase, NOW).ok, false, phrase);
  }
  const mixed = one("三点打车二十");
  assert.equal(mixed.length, 1);
  assert.equal(mixed[0].amount, 20);
});

test("晚上 / 早上 do not force a meal when another keyword is there", () => {
  assert.equal(row("晚上打车30").category, "transit");
  assert.equal(row("晚上打车30").title, "打车");
  assert.equal(row("早上看电影四十").category, "fun");
  assert.equal(row("晚上30").category, "food");
  assert.equal(row("晚上吃饭30").title, "晚饭");
  assert.equal(row("早上咖啡二十").category, "food");
  assert.equal(row("早上咖啡二十").subcategory, "咖啡饮品");
});
