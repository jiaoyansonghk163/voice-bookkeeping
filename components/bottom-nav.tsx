"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { ChartColumn, PieChart, ReceiptText, User, type LucideIcon } from "lucide-react";
import { EASE_A, FAB_PRESS_S, FAB_RELEASE_S, NAV_SPRING } from "@/lib/motion";

export type TabId = "home" | "stats" | "budget" | "me";

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
  indicate = false,
  label,
  className,
}: {
  onClick: () => void;
  stop?: boolean;
  indicate?: boolean;
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
        {stop && indicate ? <span className="mic-stop-sq" aria-hidden="true" /> : <MicGlyph />}
      </motion.button>
      {stop && indicate ? <span className="mic-ring" aria-hidden="true" /> : null}
    </span>
  );
}

const TABS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: "home", label: "记账", Icon: ReceiptText },
  { id: "stats", label: "统计", Icon: ChartColumn },
  { id: "budget", label: "预算", Icon: PieChart },
  { id: "me", label: "我的", Icon: User },
];

export function BottomNav({
  current,
  onChange,
  onRecord,
  recording = false,
  recordLabel = "说一句记一笔",
}: {
  current: TabId;
  onChange: (tab: TabId) => void;
  onRecord: () => void;
  recording?: boolean;
  recordLabel?: string;
}) {
  const reduce = useReducedMotion();
  const tab = ({ id, label, Icon }: (typeof TABS)[number]) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={current === id}
      className={cn("ti", current === id && "on")}
      onClick={() => onChange(id)}
    >
      {current === id ? (
        <motion.span
          layoutId="tab-indicator"
          className="ti-pill"
          transition={reduce ? { duration: 0.12 } : NAV_SPRING}
        />
      ) : null}
      <Icon size={24} strokeWidth={2} aria-hidden="true" className="ti-ic" />
      <span className="ti-lab">{label}</span>
    </button>
  );
  return (
    <nav className="tab" aria-label="主导航" role="tablist">
      {tab(TABS[0])}
      {tab(TABS[1])}
      <div className="ti-mic" role="presentation">
        <MicButton label={recordLabel} stop={recording} indicate onClick={onRecord} />
      </div>
      {tab(TABS[2])}
      {tab(TABS[3])}
    </nav>
  );
}
