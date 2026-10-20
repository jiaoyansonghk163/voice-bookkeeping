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

/** Visible recent rows from the approved home screen. Month totals live in lib/metrics.ts. */
const SEED: Seed[] = [
  { title: "午饭", amount: 38, category: "food", transcript: "午饭三十八块", daysAgo: 0, hour: 12, minute: 30 },
  { title: "地铁", amount: 4, category: "transit", transcript: "地铁四块", daysAgo: 0, hour: 9, minute: 12 },
  { title: "咖啡", amount: 22, category: "food", transcript: "咖啡二十二", daysAgo: 0, hour: 8, minute: 45 },
  { title: "超市", amount: 96, category: "daily", transcript: "超市九十六", daysAgo: 1, hour: 19, minute: 20 },
  { title: "电影票", amount: 45, category: "fun", transcript: "电影票四十五", daysAgo: 1, hour: 18, minute: 4 },
];

export const SAMPLE_IDS = SEED.map((_, index) => `sample-${index + 1}`);

export function createSampleTransactions(now: Date): Transaction[] {
  return SEED.map((item, index) => {
    const created = new Date(now);
    created.setDate(created.getDate() - item.daysAgo);
    created.setHours(item.hour, item.minute, 0, 0);
    return {
      id: SAMPLE_IDS[index],
      amount: item.amount,
      category: item.category,
      title: item.title,
      transcript: item.transcript,
      createdAt: created.toISOString(),
      source: "sample",
    };
  });
}
