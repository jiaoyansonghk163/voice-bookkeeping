import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTranscript } from "./parse-transcript";

const NOON = new Date(2026, 9, 20, 12, 0, 0);

function expectOne(
  phrase: string,
  expected: { amount: number; title: string; category: string; subcategory: string },
  now = NOON,
) {
  const result = parseTranscript(phrase, now);
  assert.equal(result.ok, true, phrase);
  if (!result.ok) return;
  assert.equal(result.entries.length, 1, phrase);
  const entry = result.entries[0];
  assert.equal(entry.amount, expected.amount, phrase);
  assert.equal(entry.title, expected.title, phrase);
  assert.equal(entry.category, expected.category, phrase);
  assert.equal(entry.subcategory, expected.subcategory, phrase);
}

test("parses the demo phrases used by speech", () => {
  expectOne("午饭三十八块", { amount: 38, title: "午饭", category: "food", subcategory: "午餐" });
  expectOne("打车十五块五", { amount: 15.5, title: "打车", category: "transit", subcategory: "打车" });
  expectOne("咖啡二十八", { amount: 28, title: "咖啡", category: "food", subcategory: "咖啡饮品" });
  expectOne("超市买菜六十二块三", { amount: 62.3, title: "买菜", category: "food", subcategory: "买菜" });
  expectOne("地铁四块", { amount: 4, title: "地铁", category: "transit", subcategory: "地铁公交" });
  expectOne("电影票七十八", { amount: 78, title: "电影票", category: "fun", subcategory: "电影演出" });
});

test("parses more spoken amounts and categories", () => {
  expectOne("药店三十六块", { amount: 36, title: "药店", category: "health", subcategory: "药品" });
  expectOne("早餐十六块", { amount: 16, title: "早餐", category: "food", subcategory: "早餐" });
  expectOne("水电一百二十八", { amount: 128, title: "水电", category: "home", subcategory: "房租水电" });
  expectOne("日用品十九块九", { amount: 19.9, title: "日用品", category: "shopping", subcategory: "日用" });
  expectOne("停车十块", { amount: 10, title: "停车", category: "transit", subcategory: "停车" });
  expectOne("花了十二块五", { amount: 12.5, title: "其他", category: "other", subcategory: "其他" });
  expectOne("两百块", { amount: 200, title: "其他", category: "other", subcategory: "其他" });
  expectOne("一百零五块", { amount: 105, title: "其他", category: "other", subcategory: "其他" });
  expectOne("两块五", { amount: 2.5, title: "其他", category: "other", subcategory: "其他" });
  expectOne("买菜41.2元", { amount: 41.2, title: "买菜", category: "food", subcategory: "买菜" });
});

test("reads colloquial Chinese numerals", () => {
  expectOne("一百二", { amount: 120, title: "其他", category: "other", subcategory: "其他" });
  expectOne("两百五", { amount: 250, title: "其他", category: "other", subcategory: "其他" });
  expectOne("三十八块", { amount: 38, title: "其他", category: "other", subcategory: "其他" });
  expectOne("一千二", { amount: 1200, title: "其他", category: "other", subcategory: "其他" });
});

test("splits one utterance into one bill per amount", () => {
  const result = parseTranscript("早饭花了¥50中午吃饭花了¥30然后晚上吃饭花了60", NOON);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.entries.map((entry) => ({
      title: entry.title,
      amount: entry.amount,
      category: entry.category,
      subcategory: entry.subcategory,
    })),
    [
      { title: "早饭", amount: 50, category: "food", subcategory: "早餐" },
      { title: "午饭", amount: 30, category: "food", subcategory: "午餐" },
      { title: "晚饭", amount: 60, category: "food", subcategory: "晚餐" },
    ],
  );
  assert.equal(result.entries[0]?.transcript, "早饭花了¥50中午吃饭花了¥30然后晚上吃饭花了60");
});

test("splits on connectors and currency marks", () => {
  const taxi = parseTranscript("打车三十八，还有停车十块", NOON);
  assert.equal(taxi.ok, true);
  if (taxi.ok) {
    assert.deepEqual(
      taxi.entries.map((entry) => [entry.title, entry.amount, entry.subcategory]),
      [
        ["打车", 38, "打车"],
        ["停车", 10, "停车"],
      ],
    );
  }

  const snack = parseTranscript("咖啡一百二和零食两百五", NOON);
  assert.equal(snack.ok, true);
  if (snack.ok) {
    assert.deepEqual(
      snack.entries.map((entry) => [entry.title, entry.amount, entry.subcategory]),
      [
        ["咖啡", 120, "咖啡饮品"],
        ["零食", 250, "零食"],
      ],
    );
  }

  const again = parseTranscript("早饭50再午饭30", NOON);
  assert.equal(again.ok, true);
  if (again.ok) {
    assert.deepEqual(
      again.entries.map((entry) => [entry.title, entry.amount]),
      [
        ["早饭", 50],
        ["午饭", 30],
      ],
    );
  }

  const fare = parseTranscript("地铁四块，然后公交两块", NOON);
  assert.equal(fare.ok, true);
  if (fare.ok) {
    assert.equal(fare.entries.length, 2);
    assert.equal(fare.entries[0]?.amount, 4);
    assert.equal(fare.entries[1]?.amount, 2);
    assert.equal(fare.entries[1]?.subcategory, "地铁公交");
  }
});

test("uses the time of day when the meal is only 吃饭", () => {
  expectOne("吃饭花了二十", { amount: 20, title: "早饭", category: "food", subcategory: "早餐" }, new Date(2026, 9, 20, 8, 0, 0));
  expectOne("吃饭花了二十", { amount: 20, title: "午饭", category: "food", subcategory: "午餐" }, new Date(2026, 9, 20, 12, 30, 0));
  expectOne("吃饭花了二十", { amount: 20, title: "晚饭", category: "food", subcategory: "晚餐" }, new Date(2026, 9, 20, 19, 0, 0));
  expectOne("吃饭花了二十", { amount: 20, title: "夜宵", category: "food", subcategory: "夜宵" }, new Date(2026, 9, 20, 23, 0, 0));
});

test("keeps grocery notes short and files them under 餐饮", () => {
  const result = parseTranscript("早饭花了50打车花了20然后晚上吃饭花了40块钱出去超市买菜买水果花了¥100", NOON);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.entries.map((entry) => ({
      title: entry.title,
      amount: entry.amount,
      category: entry.category,
      subcategory: entry.subcategory,
    })),
    [
      { title: "早饭", amount: 50, category: "food", subcategory: "早餐" },
      { title: "打车", amount: 20, category: "transit", subcategory: "打车" },
      { title: "晚饭", amount: 40, category: "food", subcategory: "晚餐" },
      { title: "买菜水果", amount: 100, category: "food", subcategory: "买菜" },
    ],
  );
  for (const entry of result.entries) assert.ok([...entry.title].length <= 6, entry.title);

  expectOne("去超市买了点水果25", { amount: 25, title: "水果", category: "food", subcategory: "水果" });
  expectOne("超市买日用品三十八", { amount: 38, title: "日用品", category: "shopping", subcategory: "日用" });
  expectOne("蔬菜十二块", { amount: 12, title: "蔬菜", category: "food", subcategory: "买菜" });
  expectOne("买菜买水果三十", { amount: 30, title: "买菜水果", category: "food", subcategory: "买菜" });
});

test("rejects phrases without a confident amount", () => {
  assert.equal(parseTranscript("记一笔午饭").ok, false);
  assert.equal(parseTranscript("").ok, false);
});
