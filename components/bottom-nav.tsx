import { cn } from "@/lib/cn";

export type TabId = "home" | "stats" | "me";

function MicGlyph() {
  return (
    <svg viewBox="0 0 22 30" aria-hidden="true">
      <rect x="2" y="1" width="18" height="16" rx="8" fill="currentColor" />
      <path d="M2 13a9 9 0 0 0 18 0" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M11 22v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  return (
    <button type="button" className={cn("mic", stop && "stop", className)} aria-label={label} onClick={onClick}>
      <MicGlyph />
    </button>
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
    </nav>
  );
}
