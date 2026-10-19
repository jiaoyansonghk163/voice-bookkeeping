import { splitYuan } from "@/lib/format";
import { cn } from "@/lib/cn";

const SIZES = {
  xl: "text-[92px]",
  lg: "text-[68px]",
  md: "text-[44px]",
} as const;

export function Amount({
  value,
  size = "lg",
  tone = "dark",
  className,
}: {
  value: number;
  size?: keyof typeof SIZES;
  tone?: "dark" | "light";
  className?: string;
}) {
  const { int, dec } = splitYuan(value);
  const light = tone === "light";
  return (
    <p
      className={cn(
        "font-num font-medium leading-[0.9] tracking-[-0.045em]",
        SIZES[size],
        light ? "text-white" : "text-ink",
        className,
      )}
    >
      <span className={cn("mr-[0.04em] align-top text-[0.34em] font-medium tracking-normal", light ? "text-white/80" : "text-ink")}>
        ¥
      </span>
      {int}
      <span className={cn("text-[0.4em] font-medium tracking-normal", light ? "text-white/55" : "text-quiet")}>
        .{dec}
      </span>
    </p>
  );
}
