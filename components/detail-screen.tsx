"use client";

import { ChevronLeft } from "lucide-react";
import { Amount } from "@/components/amount";
import { CATEGORIES } from "@/lib/categories";
import { formatDetailStamp } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function DetailScreen({
  transaction,
  now,
  onBack,
}: {
  transaction: Transaction | null;
  now: Date;
  onBack: () => void;
}) {
  return (
    <div data-screen="detail" className="px-5 pt-6">
      <button
        type="button"
        onClick={onBack}
        aria-label="返回账本"
        className="chip grid size-10 place-items-center rounded-full text-white"
      >
        <ChevronLeft size={22} strokeWidth={1.75} />
      </button>

      {!transaction ? (
        <div className="mt-16">
          <h1 className="text-[34px] font-medium text-white">找不到这笔</h1>
          <p className="mt-3 text-[15px] text-white/60">它可能已经不在这本账上了。</p>
        </div>
      ) : (
        <>
          <p className="mt-10 text-[15px] text-white/70">{CATEGORIES[transaction.category].label}</p>
          <h1 className="mt-2 text-[34px] font-medium tracking-tight text-white">{transaction.title}</h1>
          <Amount value={transaction.amount} size="xl" tone="light" className="mt-4" />

          <dl className="glass glass-clip mt-8">
            <div className="hairline flex items-center justify-between px-4 py-4">
              <dt className="text-[15px] text-quiet">时间</dt>
              <dd className="text-[16px]">{formatDetailStamp(new Date(transaction.createdAt), now)}</dd>
            </div>
            <div className="hairline flex items-center justify-between px-4 py-4">
              <dt className="text-[15px] text-quiet">分类</dt>
              <dd className="text-[16px]">{CATEGORIES[transaction.category].label}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <dt className="text-[15px] text-quiet">来源</dt>
              <dd className="text-[16px]">{transaction.source === "sample" ? "示例数据" : "语音记入"}</dd>
            </div>
          </dl>

          <figure className="glass mt-3 px-5 py-5">
            <figcaption className="text-[13px] text-quiet">原话</figcaption>
            <blockquote className="mt-2 text-[22px] leading-snug">「{transaction.transcript}」</blockquote>
          </figure>
        </>
      )}
    </div>
  );
}
