const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const WEEKDAY_SHORT = ["日", "一", "二", "三", "四", "五", "六"];

export function weekdayShort(date: Date): string {
  return WEEKDAY_SHORT[date.getDay()];
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function formatYuan(amount: number): string {
  const [int, dec] = amount.toFixed(2).split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

export function formatYuanTrim(amount: number): string {
  const value = roundMoney(amount);
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return formatYuan(value);
}

export function splitYuan(amount: number): { int: string; dec: string } {
  const formatted = formatYuan(amount);
  const dot = formatted.lastIndexOf(".");
  return { int: formatted.slice(0, dot), dec: formatted.slice(dot + 1) };
}

export function formatFullDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${WEEKDAYS[date.getDay()]}`;
}

export function formatMonth(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function formatClock(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Home subtitle: 今天 · 10月22日 周四 */
export function formatTodayLine(date: Date): string {
  return `今天 · ${date.getMonth() + 1}月${date.getDate()}日 周${WEEKDAY_SHORT[date.getDay()]}`;
}

/** Bill line after the title: 刚刚, or 今天 18:20. */
export function formatBillWhen(date: Date, now: Date): string {
  const delta = now.getTime() - date.getTime();
  if (delta >= 0 && delta < 5 * 60 * 1000) return "刚刚";
  const clock = formatClock(date);
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (days === 0) return `今天 ${clock}`;
  if (days === 1) return `昨天 ${clock}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${clock}`;
}

export function formatDayGroup(date: Date, now: Date): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** List section title: 今天, 昨天, or 10月18日 周六. */
export function formatDayHeading(date: Date, now: Date): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  return `${date.getMonth() + 1}月${date.getDate()}日 周${WEEKDAY_SHORT[date.getDay()]}`;
}

export function formatDetailStamp(date: Date, now: Date): string {
  return `${formatDayGroup(date, now)} ${formatClock(date)}`;
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
