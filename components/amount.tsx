import { splitYuan } from "@/lib/format";
import { cn } from "@/lib/cn";

const SIZES = {
  hero: "text-[64px]",
  xl: "text-[56px]",
  lg: "text-[48px]",
  md: "text-[34px]",
} as const;

export function Amount({
  value,
  size = "lg",
  className,
}: {
  value: number;
  size?: keyof typeof SIZES;
  tone?: "dark" | "light";
  className?: string;
}) {
  const { int, dec } = splitYuan(value);
  return (
    <p className={cn("font-num font-semibold leading-none text-ink", SIZES[size], className)}>
      <span className="mr-0.5 align-top text-[0.42em] font-medium">¥</span>
      {int}
      <span className="text-[0.46em] font-medium text-quiet">.{dec}</span>
    </p>
  );
}
