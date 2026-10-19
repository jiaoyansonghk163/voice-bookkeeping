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
  daily: { id: "daily", label: "日用", tint: "#5d9474" },
  fun: { id: "fun", label: "娱乐", tint: "#7463ad" },
  home: { id: "home", label: "居住", tint: "#8d735b" },
  health: { id: "health", label: "医疗", tint: "#2f9b8d" },
  other: { id: "other", label: "其他", tint: "#7d8781" },
};

export const CATEGORY_ORDER: CategoryId[] = [
  "food",
  "transit",
  "shopping",
  "daily",
  "fun",
  "home",
  "health",
  "other",
];

const RULES: Array<{ category: CategoryId; pattern: RegExp }> = [
  { category: "food", pattern: /午饭|晚饭|早饭|早餐|午餐|晚餐|夜宵|咖啡|奶茶|外卖|餐厅|吃饭|甜品|蛋糕/ },
  { category: "transit", pattern: /打车|地铁|公交|高铁|火车|机票|加油|停车|出租/ },
  { category: "fun", pattern: /电影|游戏|演出|门票/ },
  { category: "health", pattern: /药|医院|挂号|诊所/ },
  { category: "home", pattern: /房租|水电|燃气|物业|宽带/ },
  { category: "daily", pattern: /日用|纸巾|洗发|洗衣/ },
  { category: "shopping", pattern: /超市|买菜|水果|购物|衣服/ },
];

export function categorize(text: string): CategoryId {
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return "other";
}

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES[id].label;
}
