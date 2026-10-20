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
  shopping: ["日用", "服饰", "数码"],
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
  if (category === "food") return mealFromHour(now.getHours()).subcategory;
  return SUBCATEGORIES[category][0];
}

export interface Classified {
  category: CategoryId;
  subcategory: string;
  title: string;
}

function food(title: string, subcategory: string): Classified {
  return { category: "food", subcategory, title };
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
  if (/吃饭/.test(title)) {
    const meal = mealFromHour(now.getHours());
    return food(meal.title, meal.subcategory);
  }
  if (/咖啡|奶茶/.test(title)) return food(title, "咖啡饮品");
  if (/外卖|餐厅/.test(title)) return food(title, mealFromHour(now.getHours()).subcategory);
  if (/零食|甜品|蛋糕/.test(title)) return food(title, "零食");

  if (/打车|出租/.test(title)) return { category: "transit", subcategory: "打车", title };
  if (/地铁|公交/.test(title)) return { category: "transit", subcategory: "地铁公交", title };
  if (/加油/.test(title)) return { category: "transit", subcategory: "加油", title };
  if (/停车/.test(title)) return { category: "transit", subcategory: "停车", title };
  if (/高铁|火车|机票/.test(title)) return { category: "transit", subcategory: "交通", title };

  if (/电影|演出|门票/.test(title)) return { category: "fun", subcategory: "电影演出", title };
  if (/游戏/.test(title)) return { category: "fun", subcategory: "游戏", title };

  if (/药/.test(title)) return { category: "health", subcategory: "药品", title };
  if (/医院|挂号|诊所/.test(title)) return { category: "health", subcategory: "就医", title };

  if (/房租|水电|燃气|宽带/.test(title)) return { category: "home", subcategory: "房租水电", title };
  if (/物业/.test(title)) return { category: "home", subcategory: "物业", title };

  if (/衣服|服饰|鞋/.test(title)) return { category: "shopping", subcategory: "服饰", title };
  if (/数码|手机|电脑/.test(title)) return { category: "shopping", subcategory: "数码", title };
  if (/日用|纸巾|洗发|洗衣|超市|买菜|水果|购物/.test(title)) {
    return { category: "shopping", subcategory: "日用", title };
  }

  return { category: "other", subcategory: "其他", title };
}
