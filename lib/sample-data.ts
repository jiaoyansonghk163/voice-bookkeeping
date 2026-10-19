import type { CategoryId, Transaction } from "./types";

interface Seed {
  title: string;
  amount: number;
  category: CategoryId;
  transcript: string;
  daysAgo: number;
  hour: number;
  minute: number;
}

const SEED: Seed[] = [
  { title: "午饭", amount: 32, category: "food", transcript: "午饭三十二", daysAgo: 0, hour: 12, minute: 20 },
  { title: "地铁", amount: 4, category: "transit", transcript: "地铁四块", daysAgo: 0, hour: 8, minute: 36 },
  { title: "咖啡", amount: 28, category: "food", transcript: "咖啡二十八", daysAgo: 1, hour: 15, minute: 10 },
  { title: "超市", amount: 86.4, category: "shopping", transcript: "超市八十六块四", daysAgo: 1, hour: 18, minute: 42 },
  { title: "晚饭", amount: 67, category: "food", transcript: "晚饭六十七块", daysAgo: 2, hour: 19, minute: 5 },
  { title: "电影票", amount: 45, category: "fun", transcript: "电影票四十五", daysAgo: 2, hour: 20, minute: 16 },
  { title: "打车", amount: 23.5, category: "transit", transcript: "打车二十三块五", daysAgo: 3, hour: 21, minute: 28 },
  { title: "买菜", amount: 41.2, category: "shopping", transcript: "买菜四十一块二", daysAgo: 4, hour: 10, minute: 12 },
  { title: "日用品", amount: 19.9, category: "daily", transcript: "日用品十九块九", daysAgo: 5, hour: 11, minute: 4 },
  { title: "早餐", amount: 16, category: "food", transcript: "早餐十六块", daysAgo: 6, hour: 8, minute: 18 },
  { title: "停车", amount: 10, category: "transit", transcript: "停车十块", daysAgo: 7, hour: 9, minute: 40 },
  { title: "药店", amount: 36, category: "health", transcript: "药店三十六块", daysAgo: 8, hour: 14, minute: 22 },
  { title: "水电", amount: 128, category: "home", transcript: "水电一百二十八", daysAgo: 9, hour: 9, minute: 6 },
];

export function createSampleTransactions(now: Date): Transaction[] {
  return SEED.map((item, index) => {
    const created = new Date(now);
    created.setDate(created.getDate() - item.daysAgo);
    created.setHours(item.hour, item.minute, 0, 0);
    return {
      id: `sample-${index + 1}`,
      amount: item.amount,
      category: item.category,
      title: item.title,
      transcript: item.transcript,
      createdAt: created.toISOString(),
      source: "sample",
    };
  });
}
