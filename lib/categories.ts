import type { CategoryId } from "./types";

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
};

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
  if (category === "shopping") return "";
  if (category === "food") return mealFromHour(now.getHours()).subcategory;
  return SUBCATEGORIES[category][0] ?? "";
}

/** 购物 has no 小类. The row reads 购物, not 购物 · 日用. */
export function categoryDetail(category: CategoryId, subcategory: string): string {
  const label = CATEGORIES[category].label;
  if (category === "shopping" || !subcategory || subcategory === label) return label;
  return `${label} · ${subcategory}`;
}

export function rowKind(category: CategoryId, subcategory: string): string {
  if (category === "shopping" || !subcategory) return CATEGORIES[category].label;
  return subcategory;
}

export interface Classified {
  category: CategoryId;
  subcategory: string;
  title: string;
}

function food(title: string, subcategory: string): Classified {
  return { category: "food", subcategory, title };
}

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

export function classifyClause(text: string, now: Date): Classified {
  const title = text.trim();
  if (!title) return { category: "other", subcategory: "其他", title: "其他" };

  if (/夜宵|宵夜/.test(title)) return food("夜宵", "夜宵");
  if (/早饭|早上|早晨/.test(title)) return food("早饭", "早餐");
  if (/早餐/.test(title)) return food("早餐", "早餐");
  if (/午饭/.test(title)) return food("午饭", "午餐");
  if (/午餐/.test(title)) return food("午餐", "午餐");
  if (/中午/.test(title)) return food("午饭", "午餐");
  if (/晚饭/.test(title)) return food("晚饭", "晚餐");
  if (/晚餐/.test(title)) return food("晚餐", "晚餐");
  if (/晚上/.test(title)) return food("晚饭", "晚餐");
  if (/吃了?饭/.test(title)) {
    const meal = mealFromHour(now.getHours());
    return food(meal.title, meal.subcategory);
  }
  if (/咖啡|奶茶/.test(title)) return finish(food(title, "咖啡饮品"));
  if (/外卖|餐厅/.test(title)) return finish(food(title, mealFromHour(now.getHours()).subcategory));
  if (/零食|甜品|蛋糕/.test(title)) return finish(food(title, "零食"));

  if (/打车|出租/.test(title)) return finish({ category: "transit", subcategory: "打车", title });
  if (/地铁|公交/.test(title)) return finish({ category: "transit", subcategory: "地铁公交", title });
  if (/加油/.test(title)) return finish({ category: "transit", subcategory: "加油", title });
  if (/停车/.test(title)) return finish({ category: "transit", subcategory: "停车", title });
  if (/高铁|火车|机票/.test(title)) return finish({ category: "transit", subcategory: "交通", title });

  if (/电影|演出|门票/.test(title)) return finish({ category: "fun", subcategory: "电影演出", title });
  if (/游戏/.test(title)) return finish({ category: "fun", subcategory: "游戏", title });

  if (/药/.test(title)) return finish({ category: "health", subcategory: "药品", title });
  if (/医院|挂号|诊所/.test(title)) return finish({ category: "health", subcategory: "就医", title });

  if (/房租|水电|燃气|宽带/.test(title)) return finish({ category: "home", subcategory: "房租水电", title });
  if (/物业/.test(title)) return finish({ category: "home", subcategory: "物业", title });

  if (/衣服|服饰|鞋|数码|手机|电脑|日用|纸巾|洗发|洗衣|买菜|蔬菜|水果|肉|菜市场|生鲜|购物|超市|商场|淘宝/.test(title)) {
    return finish({ category: "shopping", subcategory: "", title });
  }

  return finish({ category: "other", subcategory: "其他", title });
}
