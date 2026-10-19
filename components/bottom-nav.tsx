"use client";

import { Mic } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

const TABS: Array<{ id: "home" | "categories"; label: string }> = [
  { id: "home", label: "账本" },
  { id: "categories", label: "分类" },
];

export function BottomNav({
  current,
  onChange,
  onVoice,
}: {
  current: "home" | "categories";
  onChange: (next: "home" | "categories") => void;
  onVoice: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
      <div className="material material-thick bar pointer-events-auto flex w-full max-w-[420px] items-start justify-between px-8 pt-2 pb-[max(0.7rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab, index) => (
          <div key={tab.id} className="contents">
            {index === 1 && (
              <motion.button
                type="button"
                aria-label="语音记账"
                onClick={onVoice}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="btn-fill -mt-1 grid size-[52px] place-items-center rounded-full shadow-[0_8px_18px_rgba(0,122,255,0.28)]"
              >
                <Mic size={24} strokeWidth={1.75} />
              </motion.button>
            )}
            <button
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex h-12 w-16 items-center justify-center text-[13px]",
                current === tab.id ? "font-semibold text-blue" : "text-quiet",
              )}
            >
              {tab.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
