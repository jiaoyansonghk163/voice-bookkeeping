import { cn } from "@/lib/cn";

export type TabId = "home" | "stats" | "budget" | "me";

function LedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 20V4M4 20h16M8.5 16v-5M13 16V8M17.5 16v-3" />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5V12l6 6" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0115 0" />
    </svg>
  );
}

export function MicButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="mic" aria-label="语音记账" onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
        <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
      </svg>
    </button>
  );
}

export function BottomNav({ current, onChange }: { current: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="tab glass" aria-label="主导航">
      <button type="button" className={cn("ti", current === "home" && "on")} onClick={() => onChange("home")}>
        <LedgerIcon />
        账单
      </button>
      <button type="button" className={cn("ti", current === "stats" && "on")} onClick={() => onChange("stats")}>
        <StatsIcon />
        统计
      </button>
      <div />
      <button type="button" className={cn("ti", current === "budget" && "on")} onClick={() => onChange("budget")}>
        <BudgetIcon />
        预算
      </button>
      <button type="button" className={cn("ti", current === "me" && "on")} onClick={() => onChange("me")}>
        <MeIcon />
        我的
      </button>
    </nav>
  );
}
