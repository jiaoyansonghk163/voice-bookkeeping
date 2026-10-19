import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTranscript } from "./parse-transcript";

function expectExpense(
  phrase: string,
  expected: { amount: number; title: string; category: string },
) {
  const result = parseTranscript(phrase);
  assert.equal(result.ok, true, phrase);
  if (!result.ok) return;
  assert.equal(result.amount, expected.amount, phrase);
  assert.equal(result.title, expected.title, phrase);
  assert.equal(result.category, expected.category, phrase);
}

test("parses the demo phrases used by mock speech", () => {
  expectExpense("午饭三十八块", { amount: 38, title: "午饭", category: "food" });
  expectExpense("打车十五块五", { amount: 15.5, title: "打车", category: "transit" });
  expectExpense("咖啡二十八", { amount: 28, title: "咖啡", category: "food" });
  expectExpense("超市买菜六十二块三", { amount: 62.3, title: "超市买菜", category: "shopping" });
  expectExpense("地铁四块", { amount: 4, title: "地铁", category: "transit" });
  expectExpense("电影票七十八", { amount: 78, title: "电影票", category: "fun" });
});

test("parses more spoken amounts and categories", () => {
  expectExpense("药店三十六块", { amount: 36, title: "药店", category: "health" });
  expectExpense("早餐十六块", { amount: 16, title: "早餐", category: "food" });
  expectExpense("水电一百二十八", { amount: 128, title: "水电", category: "home" });
  expectExpense("日用品十九块九", { amount: 19.9, title: "日用品", category: "daily" });
  expectExpense("停车十块", { amount: 10, title: "停车", category: "transit" });
  expectExpense("花了十二块五", { amount: 12.5, title: "其他", category: "other" });
  expectExpense("两百块", { amount: 200, title: "其他", category: "other" });
  expectExpense("一百零五块", { amount: 105, title: "其他", category: "other" });
  expectExpense("两块五", { amount: 2.5, title: "其他", category: "other" });
  expectExpense("买菜41.2元", { amount: 41.2, title: "买菜", category: "shopping" });
});

test("rejects phrases without a confident amount", () => {
  assert.equal(parseTranscript("记一笔午饭").ok, false);
  assert.equal(parseTranscript("").ok, false);
});
