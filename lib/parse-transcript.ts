import { classifyClause, hasKnownItem } from "./categories";
import { dayString } from "./format";
import type { CategoryId, ParseResult } from "./types";

export const MAX_AMOUNT = 9_999_999;

const DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const UNITS: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
};

const AMOUNT_RE = /(?:¥|￥)?\s*([零〇一二两三四五六七八九十百千万]+|\d+(?:\.\d{1,2})?)/g;
const LEADING_RE = /^(?:然后|还有|以及|另外|接着|再来|再|和|跟|并且)/;

function parseChineseInteger(raw: string): number | null {
  const wan = raw.indexOf("万");
  if (wan >= 0) {
    const headRaw = raw.slice(0, wan);
    const tailRaw = raw.slice(wan + 1);
    if (!headRaw || tailRaw.includes("万")) return null;
    const head = parseChineseIntegerBase(headRaw);
    if (head == null) return null;
    let tail = 0;
    if (tailRaw) {
      const parsed =
        tailRaw.length === 1 && tailRaw in DIGITS && tailRaw !== "零" && tailRaw !== "〇"
          ? DIGITS[tailRaw] * 1000
          : parseChineseIntegerBase(tailRaw);
      if (parsed == null) return null;
      tail = parsed;
    }
    return head * 10_000 + tail;
  }
  return parseChineseIntegerBase(raw);
}

function parseChineseIntegerBase(raw: string): number | null {
  let total = 0;
  let current = 0;
  let seen = false;
  let lastUnit = 0;
  let zeroSinceUnit = false;

  for (const char of raw) {
    if (char in DIGITS) {
      seen = true;
      if (char === "零" || char === "〇") {
        zeroSinceUnit = true;
        current = 0;
        continue;
      }
      current = DIGITS[char];
      continue;
    }
    const unit = UNITS[char];
    if (!unit) return null;
    seen = true;
    total += (current || 1) * unit;
    current = 0;
    lastUnit = unit;
    zeroSinceUnit = false;
  }

  if (!seen) return null;
  if (current > 0 && lastUnit >= 100 && !zeroSinceUnit) {
    total += current * (lastUnit / 10);
  } else {
    total += current;
  }
  return total;
}

function parseAmount(intRaw: string, jiaoRaw: string | undefined): number | null {
  let whole: number | null;
  if (/^\d/.test(intRaw)) {
    whole = Number(intRaw);
    if (!Number.isFinite(whole)) return null;
    if (intRaw.includes(".")) jiaoRaw = undefined;
  } else {
    whole = parseChineseInteger(intRaw);
  }
  if (whole == null) return null;

  let jiao = 0;
  if (jiaoRaw) jiao = /^\d$/.test(jiaoRaw) ? Number(jiaoRaw) : (DIGITS[jiaoRaw] ?? 0);

  const amount = Math.round((whole + jiao / 10) * 100) / 100;
  if (amount <= 0 || amount > MAX_AMOUNT) return null;
  return amount;
}

interface AmountMatch {
  index: number;
  end: number;
  amount: number;
  hasUnit: boolean;
  intRaw: string;
}

function isConfidentAmount(match: AmountMatch): boolean {
  if (match.hasUnit || /^\d/.test(match.intRaw) || /[十百千]/.test(match.intRaw)) return true;
  return match.intRaw.length >= 2;
}

function readJiao(text: string, from: number, allowBare: boolean): { jiao?: string; end: number; hasUnit: boolean } {
  const rest = text.slice(from);
  const unit = /^\s*(块钱|块|元)/.exec(rest);
  if (unit) {
    let end = from + unit[0].length;
    const after = text.slice(end);
    const half = /^\s*半/.exec(after);
    if (half) return { jiao: "五", end: end + half[0].length, hasUnit: true };
    const jiao = /^\s*(?:([零〇一二两三四五六七八九])(?![十百千])|(\d)(?!\d))(?:\s*(?:毛|角))?/.exec(after);
    if (jiao) end += jiao[0].length;
    return { jiao: jiao?.[1] ?? jiao?.[2], end, hasUnit: true };
  }
  if (!allowBare) return { end: from, hasUnit: false };
  const spoken = /^\s*([零〇一二两三四五六七八九]|\d)\s*(?:毛|角)/.exec(rest);
  if (!spoken) return { end: from, hasUnit: false };
  return { jiao: spoken[1], end: from + spoken[0].length, hasUnit: true };
}

/** A number followed by one of these is a count, a time or a place, not money. */
const NOT_MONEY_AFTER = /^\s*(?:点|分钟|分|个|人|号|月|日|次|天|岁|楼|路|年|小时|秒|层|条|公里|千米|斤|件|瓶|杯|份|只|张|套|位|周|倍|折|%|室|栋|街|站|岁|口)/;
const NOT_MONEY_BEFORE = /(?:周|期|拜)$/;
const BARE_NEXT_OK = /^(?:\s*$|\s*[,，。.、!！?？;；]|\s*(?:然后|还有|再|和|跟|以及|另外))/;

function findAmounts(text: string, now: Date): AmountMatch[] {
  const matches: AmountMatch[] = [];
  const re = new RegExp(AMOUNT_RE.source, "g");
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text))) {
    if (match.index < cursor) {
      re.lastIndex = cursor;
      continue;
    }
    const intRaw = match[1];
    if (!intRaw) continue;
    let numberEnd = match.index + match[0].length;
    let arabicWan = false;
    if (/^\d/.test(intRaw) && text[numberEnd] === "万") {
      arabicWan = true;
      numberEnd += 1;
    }
    const tail = readJiao(text, numberEnd, !intRaw.includes("."));
    let amount = parseAmount(intRaw, arabicWan ? undefined : tail.jiao);
    if (amount != null && arabicWan) {
      amount = Math.round(amount * 10_000 * 100) / 100;
      if (amount > MAX_AMOUNT) amount = null;
    }
    const end = Math.max(tail.end, numberEnd);
    if (end <= match.index) break;
    cursor = end;
    re.lastIndex = end;
    if (amount == null) continue;
    const hasUnit = tail.hasUnit || /[¥￥]/.test(match[0]);
    if (!hasUnit && NOT_MONEY_AFTER.test(text.slice(end))) continue;
    if (NOT_MONEY_BEFORE.test(text.slice(0, match.index))) continue;
    const candidate: AmountMatch = { index: match.index, end, amount, hasUnit, intRaw };
    if (isConfidentAmount(candidate)) {
      matches.push(candidate);
      continue;
    }
    // 打车五: a lone digit right after a known item word, with nothing else glued on.
    const before = cleanupTitle(text.slice(matches.length ? matches[matches.length - 1].end : 0, match.index));
    const stripped = stripDate(before, now).rest;
    if (stripped && hasKnownItem(stripped, now) && BARE_NEXT_OK.test(text.slice(end))) {
      matches.push(candidate);
    }
  }

  return matches;
}

export function entryConfidence(hasUnit: boolean, category: CategoryId, title: string): "high" | "low" {
  if (!hasUnit) return "low";
  if (category === "other" && title === "其他") return "low";
  return "high";
}

function cleanupTitle(input: string): string {
  let text = input.replace(/[，。,.、！!？?\s]/g, "");
  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text.replace(LEADING_RE, "");
  }
  return text.replace(/花了|付了|支付了|支付|花费|用了|一共|人民币|¥|￥/g, "").replace(/^的+|的+$/g, "");
}

const WEEK_INDEX: Record<string, number> = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
const NUM = "[零〇一二两三四五六七八九十\\d]+";

function readNumber(raw: string): number | null {
  if (/^\d+$/.test(raw)) return Number(raw);
  return parseChineseInteger(raw);
}

function validDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function addDays(base: Date, delta: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta);
}

/**
 * Pull a spoken date (今天 昨天 前天 大前天 上周五 10号 3月5日) out of a clause.
 * Returns the calendar day (local) and the clause with the date words removed.
 */
export function stripDate(clause: string, now: Date): { date: Date | null; rest: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let m: RegExpExecArray | null;

  if ((m = /大前天/.exec(clause))) return { date: addDays(today, -3), rest: clause.replace(m[0], "") };
  if ((m = /前天/.exec(clause))) return { date: addDays(today, -2), rest: clause.replace(m[0], "") };
  if ((m = /昨天|昨日|昨晚/.exec(clause))) {
    return { date: addDays(today, -1), rest: clause.replace(m[0], m[0] === "昨晚" ? "晚上" : "") };
  }
  if ((m = /今天|今日|今晚|今早/.exec(clause))) {
    const keep = m[0] === "今晚" ? "晚上" : m[0] === "今早" ? "早上" : "";
    return { date: today, rest: clause.replace(m[0], keep) };
  }

  if ((m = new RegExp(`(上|这|本)?(?:个)?(?:周|星期|礼拜)([日天一二三四五六])`).exec(clause))) {
    const target = WEEK_INDEX[m[2]];
    const mondayThis = addDays(today, -((today.getDay() + 6) % 7));
    let date: Date;
    if (m[1] === "上") date = addDays(mondayThis, -7 + ((target + 6) % 7));
    else if (m[1]) date = addDays(mondayThis, (target + 6) % 7);
    else {
      date = addDays(mondayThis, (target + 6) % 7);
      if (date.getTime() > today.getTime()) date = addDays(date, -7);
    }
    return { date, rest: clause.replace(m[0], "") };
  }

  if ((m = new RegExp(`(${NUM})月(${NUM})(?:日|号)`).exec(clause))) {
    const month = readNumber(m[1]);
    const day = readNumber(m[2]);
    if (month != null && day != null) {
      let date = validDate(today.getFullYear(), month, day);
      if (date && date.getTime() > today.getTime()) date = validDate(today.getFullYear() - 1, month, day);
      if (date) return { date, rest: clause.replace(m[0], "") };
    }
  }

  if ((m = new RegExp(`(${NUM})(?:号|日)`).exec(clause))) {
    const day = readNumber(m[1]);
    if (day != null) {
      let date = validDate(today.getFullYear(), today.getMonth() + 1, day);
      if (date && date.getTime() > today.getTime()) {
        date = validDate(today.getFullYear(), today.getMonth(), day) ?? validDate(today.getFullYear() - 1, 12, day);
      }
      if (date) return { date, rest: clause.replace(m[0], "") };
    }
  }

  return { date: null, rest: clause };
}

const VERB_TAIL = /(?:花了|付了|支付了|支付|花费|用了|一共|共)$/;

export function parseTranscript(transcript: string, now: Date = new Date()): ParseResult {
  const text = transcript.normalize("NFKC").trim();
  if (!text) return { ok: false, transcript: text, reason: "empty" };

  const matches = findAmounts(text, now);
  if (matches.length === 0) return { ok: false, transcript: text, reason: "no-amount" };

  let previous = 0;
  let carryDay: Date | null = null;
  const entries = matches.map((match, index) => {
    const start = previous;
    const rawClause = text.slice(start, match.index);
    let end = match.end;
    let clause = cleanupTitle(rawClause);
    previous = match.end;

    // 花了35午饭: the amount comes first, so the title is the text after it.
    if (!stripDate(clause, now).rest) {
      const nextIndex = index + 1 < matches.length ? matches[index + 1].index : text.length;
      const after = text.slice(match.end, nextIndex);
      const lastOne = index + 1 >= matches.length;
      const sep = after.search(/[，。,.、！!？?]/);
      const head = sep >= 0 ? after.slice(0, sep) : after;
      const trimmed = head.trim();
      const verbLed = VERB_TAIL.test(trimmed) || /(?:然后|还有|再|和|跟|以及|另外)$/.test(trimmed);
      if (trimmed && (sep >= 0 || lastOne || verbLed)) {
        const body = trimmed.replace(/(?:然后|还有|再|和|跟|以及|另外)$/, "").replace(VERB_TAIL, "");
        const extra = cleanupTitle(body);
        if (extra) {
          clause = `${clause}${extra}`;
          previous = match.end + head.length;
          end = previous;
        }
      }
    }

    const dated = stripDate(clause, now);
    if (dated.date) carryDay = dated.date;
    const source = text.slice(start, end).trim();
    const classified = classifyClause(dated.rest, now);
    return {
      amount: match.amount,
      category: classified.category,
      subcategory: classified.subcategory,
      title: classified.title,
      transcript: text,
      source,
      confidence: entryConfidence(match.hasUnit, classified.category, classified.title),
      ...(classified.kind === "income" ? { kind: "income" as const } : {}),
      ...(carryDay ? { day: dayString(carryDay) } : {}),
    };
  });

  return { ok: true, transcript: text, entries };
}
