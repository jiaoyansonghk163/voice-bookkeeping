"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { EASE_A, FAB_PRESS_S, FAB_RELEASE_S } from "@/lib/motion";

export type TabId = "home" | "stats" | "me";

function MicGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        <path d="M4 8v8" />
        <path d="M9.5 3v18" />
        <path d="M15 6.5v11" />
        <path d="M20.5 9v6" />
      </g>
    </svg>
  );
}

export function MicButton({
  onClick,
  stop = false,
  label,
  className,
}: {
  onClick: () => void;
  stop?: boolean;
  label: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  return (
    <span className="mic-anchor">
      <motion.button
        type="button"
        className={cn("mic", stop && "stop", className)}
        aria-label={label}
        onClick={onClick}
        onPointerDown={() => setPressed(true)}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        animate={{ scale: pressed && !reduce ? 0.96 : 1 }}
        transition={pressed ? { duration: FAB_PRESS_S, ease: "easeOut" } : { duration: FAB_RELEASE_S, ease: EASE_A }}
      >
        <MicGlyph />
      </motion.button>
    </span>
  );
}

export function BottomNav({ current, onChange }: { current: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="tab" aria-label="主导航">
      <button type="button" className={cn("ti", current === "home" && "on")} onClick={() => onChange("home")}>
        <i />
        流水
      </button>
      <button type="button" className={cn("ti", current === "stats" && "on")} onClick={() => onChange("stats")}>
        <i />
        统计
      </button>
      <button type="button" className={cn("ti", current === "me" && "on")} onClick={() => onChange("me")}>
        <i />
        我的
      </button>
    </nav>
  );
}
