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
    <div data-screen="detail" className="px-5 pt-4">
      <button type="button" onClick={onBack} aria-label="返回账本" className="grid size-10 place-items-center text-blue">
        <ChevronLeft size={26} strokeWidth={2} />
      </button>

      {!transaction ? (
        <div className="mt-12">
          <h1 className="text-[34px] font-semibold tracking-tight">找不到这笔</h1>
          <p className="mt-2 text-[15px] text-quiet">它可能已经不在这本账上了。</p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-[13px] text-quiet">{CATEGORIES[transaction.category].label}</p>
          <h1 className="mt-1 text-[34px] font-semibold leading-none tracking-tight">{transaction.title}</h1>
          <Amount value={transaction.amount} size="hero" className="mt-6" />

          <dl className="material mt-8 overflow-hidden">
            <div className="hairline flex items-center justify-between px-4 py-3.5">
              <dt className="text-[15px] text-quiet">时间</dt>
              <dd className="text-[17px]">{formatDetailStamp(new Date(transaction.createdAt), now)}</dd>
            </div>
            <div className="hairline flex items-center justify-between px-4 py-3.5">
              <dt className="text-[15px] text-quiet">分类</dt>
              <dd className="text-[17px]">{CATEGORIES[transaction.category].label}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <dt className="text-[15px] text-quiet">来源</dt>
              <dd className="text-[17px]">{transaction.source === "sample" ? "示例数据" : "语音记入"}</dd>
            </div>
          </dl>

          <figure className="material mt-3 px-4 py-4">
            <figcaption className="text-[13px] text-quiet">原话</figcaption>
            <blockquote className="mt-1 text-[20px] leading-snug">「{transaction.transcript}」</blockquote>
          </figure>
        </>
      )}
    </div>
  );
}
