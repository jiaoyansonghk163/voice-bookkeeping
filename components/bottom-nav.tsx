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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-[max(1.15rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto relative w-full max-w-[430px]">
        <div className="glass flex h-[64px] items-center rounded-full px-1.5">
          {TABS.map((tab) => {
            const active = current === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={cn(
                  "relative h-12 flex-1 rounded-full text-[15px]",
                  tab.id === "home" ? "mr-9" : "ml-9",
                  active ? "font-medium text-ink" : "text-quiet",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-white/70"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <motion.button
          type="button"
          aria-label="语音记账"
          onClick={onVoice}
          whileTap={{ scale: 0.94 }}
          className="orb-button absolute left-1/2 top-0 size-[74px] -translate-x-1/2 -translate-y-[46%]"
        >
          <Mic size={28} strokeWidth={1.75} className="relative" />
        </motion.button>
      </div>
    </div>
  );
}
