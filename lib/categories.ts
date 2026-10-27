import type { CategoryId, EntryKind } from "./types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  tint: string;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  food: { id: "food", label: "餐饮", tint: "#d0892f" },
  transit: { id: "transit", label: "交通", tint: "#3a78c2" },
  shopping: { id: "shopping", label: "购物", tint: "#c45b7a" },
  fun: { id: "fun", label: "娱乐", tint: "#7463ad" },
  home: { id: "home", label: "居住", tint: "#8d735b" },
  health: { id: "health", label: "医疗", tint: "#2f9b8d" },
  other: { id: "other", label: "其他", tint: "#7d8781" },
  salary: { id: "salary", label: "工资", tint: "#0B7F73" },
  bonus: { id: "bonus", label: "奖金", tint: "#0B7F73" },
  redpacket: { id: "redpacket", label: "红包", tint: "#0B7F73" },
  refund: { id: "refund", label: "退款", tint: "#0B7F73" },
  income_other: { id: "income_other", label: "其他收入", tint: "#0B7F73" },
};

export const INCOME_ORDER: CategoryId[] = ["salary", "bonus", "redpacket", "refund", "income_other"];

export function isIncomeCategory(id: string): boolean {
  return (INCOME_ORDER as string[]).includes(id);
}

export function categoriesFor(kind: EntryKind): CategoryId[] {
  return kind === "income" ? INCOME_ORDER : CATEGORY_ORDER;
}

export const CATEGORY_ORDER: CategoryId[] = [
  "food",
  "transit",
  "shopping",
  "fun",
  "home",
  "health",
  "other",
];

export const SUBCATEGORIES: Record<CategoryId, readonly string[]> = {
  food: ["早餐", "午餐", "晚餐", "夜宵", "咖啡饮品", "零食"],
  transit: ["打车", "地铁公交", "加油", "停车"],
  shopping: [],
  fun: ["电影演出", "游戏", "其他"],
  home: ["房租水电", "物业", "其他"],
  health: ["药品", "就医", "其他"],
  other: ["其他"],
  salary: [],
  bonus: [],
  redpacket: [],
  refund: [],
  income_other: [],
};

/** 小类 used when an older bill has none. */
export function fallbackSubcategory(category: CategoryId): string {
  return CATEGORIES[category].label;
}

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES[id].label;
}

interface Meal {
  title: string;
  subcategory: string;
}

export function mealFromHour(hour: number): Meal {
  if (hour >= 5 && hour < 10) return { title: "早饭", subcategory: "早餐" };
  if (hour >= 10 && hour < 15) return { title: "午饭", subcategory: "午餐" };
  if (hour >= 15 && hour < 21) return { title: "晚饭", subcategory: "晚餐" };
  return { title: "夜宵", subcategory: "夜宵" };
}

export function defaultPick(category: CategoryId, now: Date): string {
  if (category === "shopping" || isIncomeCategory(category)) return "";
  if (category === "food") return mealFromHour(now.getHours()).subcategory;
  return SUBCATEGORIES[category][0] ?? "";
}

/** 购物 has no 小类. The row reads 购物, not 购物 · 日用. */
export function categoryDetail(category: CategoryId, subcategory: string): string {
  const label = CATEGORIES[category].label;
  if (category === "shopping" || isIncomeCategory(category) || !subcategory || subcategory === label) return label;
  return `${label} · ${subcategory}`;
}

export function rowKind(category: CategoryId, subcategory: string): string {
  if (category === "shopping" || isIncomeCategory(category) || !subcategory) return CATEGORIES[category].label;
  return subcategory;
}

export interface Classified {
  category: CategoryId;
  subcategory: string;
  title: string;
  kind?: EntryKind;
}

function food(title: string, subcategory: string): Classified {
  return { category: "food", subcategory, title };
}

const TIME_WORDS_FILLER = ["早上", "早晨", "中午", "晚上", "凌晨", "今晚", "昨晚"];

const FILLER_WORDS = [
  "出去",
  "然后",
  "接着",
  "以及",
  "还有",
  "另外",
  "再来",
  "花了",
  "付了",
  "支付了",
  "花费",
  "支付",
  "用了",
  "一共",
  "人民币",
  "买了",
  "一点",
  "一些",
  ...TIME_WORDS_FILLER,
];

/** A short note: drop the trip and the verb, keep the thing that was bought. */
export function shortenTitle(text: string): string {
  let value = text.replace(/[，。,.、！!？?\s]/g, "");
  let previous = "";
  while (value !== previous) {
    previous = value;
    for (const word of FILLER_WORDS) value = value.replaceAll(word, "");
    value = value.replace(/^(?:去|到|还|又|再|和|跟|的|了|些)+/, "");
    value = value.replace(/(?:的|了|些)+$/, "");
    value = value.replace(/点(?!心)/g, "");
  }

  value = value.replace(/超市|商场|淘宝|菜市场/g, (place, index, whole) => {
    const rest = (whole.slice(0, index) + whole.slice(index + place.length)).replace(/买|和|跟|的/g, "");
    return rest ? "" : place;
  });

  if (value.split("买").length > 2) {
    value = `买${value.split("买").filter(Boolean).join("")}`;
  }
  value = value.replace(/吃饭/g, "饭");
  value = value.replace(/^买(?=日用|衣服|服饰|鞋|纸巾|洗发|洗衣|数码|手机|电脑)/, "");
  if (value === "菜市场") value = "买菜";
  if ([...value].length > 6) value = [...value].slice(0, 6).join("");
  return value;
}

function finish(result: Classified): Classified {
  const title = shortenTitle(result.title);
  return { ...result, title: title || result.subcategory || "其他" };
}

interface Rule {
  words: readonly string[];
  tier: 1 | 2;
  build: (title: string, now: Date, word: string) => Classified;
}

function transit(subcategory: string) {
  return (title: string): Classified => finish({ category: "transit", subcategory, title });
}

const RULES: Rule[] = [
  { words: ["夜宵", "宵夜"], tier: 2, build: () => food("夜宵", "夜宵") },
  { words: ["早饭"], tier: 2, build: () => food("早饭", "早餐") },
  { words: ["早餐"], tier: 2, build: () => food("早餐", "早餐") },
  { words: ["午饭"], tier: 2, build: () => food("午饭", "午餐") },
  { words: ["午餐"], tier: 2, build: () => food("午餐", "午餐") },
  { words: ["晚饭"], tier: 2, build: () => food("晚饭", "晚餐") },
  { words: ["晚餐"], tier: 2, build: () => food("晚餐", "晚餐") },
  { words: ["咖啡", "奶茶"], tier: 2, build: (t) => finish(food(t, "咖啡饮品")) },
  { words: ["外卖", "餐厅"], tier: 2, build: (t, now) => finish(food(t, mealFromHour(now.getHours()).subcategory)) },
  { words: ["零食", "甜品", "蛋糕"], tier: 2, build: (t) => finish(food(t, "零食")) },
  { words: ["打车", "出租", "滴滴"], tier: 2, build: transit("打车") },
  { words: ["地铁", "公交"], tier: 2, build: transit("地铁公交") },
  { words: ["加油"], tier: 2, build: transit("加油") },
  { words: ["停车"], tier: 2, build: transit("停车") },
  { words: ["高铁", "火车", "机票"], tier: 2, build: transit("交通") },
  { words: ["电影", "演出", "门票"], tier: 2, build: (t) => finish({ category: "fun", subcategory: "电影演出", title: t }) },
  { words: ["游戏"], tier: 2, build: (t) => finish({ category: "fun", subcategory: "游戏", title: t }) },
  { words: ["药"], tier: 2, build: (t) => finish({ category: "health", subcategory: "药品", title: t }) },
  { words: ["医院", "挂号", "诊所"], tier: 2, build: (t) => finish({ category: "health", subcategory: "就医", title: t }) },
  { words: ["房租", "水电", "燃气", "宽带"], tier: 2, build: (t) => finish({ category: "home", subcategory: "房租水电", title: t }) },
  { words: ["物业"], tier: 2, build: (t) => finish({ category: "home", subcategory: "物业", title: t }) },
  {
    words: [
      "衣服", "服饰", "鞋", "数码", "手机", "电脑", "日用", "纸巾", "洗发", "洗衣", "买菜", "蔬菜", "水果", "肉",
      "菜市场", "生鲜", "购物", "超市", "商场", "淘宝",
    ],
    tier: 2,
    build: (t) => finish({ category: "shopping", subcategory: "", title: t }),
  },
  { words: ["早上", "早晨"], tier: 1, build: () => food("早饭", "早餐") },
  { words: ["中午"], tier: 1, build: () => food("午饭", "午餐") },
  { words: ["晚上"], tier: 1, build: () => food("晚饭", "晚餐") },
  {
    words: ["吃饭", "吃了饭"],
    tier: 1,
    build: (_t, now) => {
      const meal = mealFromHour(now.getHours());
      return food(meal.title, meal.subcategory);
    },
  },
];

/** Does the clause name a known thing (so a bare number after it is an amount)? */
export function hasKnownItem(text: string, now: Date): boolean {
  return classifyClause(text, now).category !== "other";
}

const INCOME_RE = /工资|薪水|薪资|年终奖|奖金|到账|入账|收到|收了|发了|退款|退钱|退了|卖了|收入|报销/;
const NOT_INCOME_RE = /发了?[^,，。]{0,3}红包|包红包|给[^,，。]{0,4}红包/;
const INCOME_WORDS = /工资|薪水|薪资|年终奖|奖金|到账|入账|收到|收了|发了|退款|退钱|退了|卖了|收入|报销/g;

export function classifyIncome(title: string): Classified | null {
  if (NOT_INCOME_RE.test(title) || !INCOME_RE.test(title)) return null;
  const income = (category: CategoryId, label: string): Classified => ({ category, subcategory: "", title: label, kind: "income" });
  if (/工资|薪水|薪资/.test(title)) return income("salary", "工资");
  if (/年终奖|奖金/.test(title)) return income("bonus", "奖金");
  if (/红包/.test(title)) return income("redpacket", "红包");
  if (/退款|退钱|退了/.test(title)) return income("refund", "退款");
  const rest = shortenTitle(title.replace(INCOME_WORDS, ""));
  return income("income_other", rest || "其他收入");
}

/**
 * The most specific keyword wins (longest match). Time-of-day words such as 晚上
 * only pick a meal when nothing more specific (打车, 电影…) is in the clause.
 */
export function classifyClause(text: string, now: Date): Classified {
  const title = text.trim();
  if (!title) return { category: "other", subcategory: "其他", title: "其他" };

  const income = classifyIncome(title);
  if (income) return income;

  let best: { rule: Rule; word: string; rank: number } | null = null;
  for (const rule of RULES) {
    for (const word of rule.words) {
      if (!title.includes(word)) continue;
      const rank = rule.tier * 100 + word.length;
      if (!best || rank > best.rank) best = { rule, word, rank };
    }
  }
  if (best) return best.rule.build(title, now, best.word);
  return finish({ category: "other", subcategory: "其他", title });
}
