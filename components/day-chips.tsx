"use client";

import { cn } from "@/lib/cn";
import { dayString } from "@/lib/format";

export function DayChips({ day, onChange }: { day: string; onChange: (day: string) => void }) {
  const today = new Date();
  const options = [
    { label: "今天", day: dayString(today) },
    { label: "昨天", day: dayString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) },
    { label: "前天", day: dayString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)) },
  ];
  const preset = options.some((option) => option.day === day);
  return (
    <div className="day-chips" role="group" aria-label="日期">
      {options.map((option) => (
        <button key={option.label} type="button" className={cn(option.day === day && "on")} onClick={() => onChange(option.day)}>
          {option.label}
        </button>
      ))}
      <label className={cn("pick", !preset && "on")}>
        <span>{preset ? "选日期" : day.slice(5).replace("-", "月") + "日"}</span>
        <input
          type="date"
          value={day}
          max={dayString(today)}
          aria-label="选择日期"
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
        />
      </label>
    </div>
  );
}

