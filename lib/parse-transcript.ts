import { classifyClause } from "./categories";
import type { CategoryId, ParseResult } from "./types";

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

const AMOUNT_RE = /(?:¥|￥)?\s*([零〇一二两三四五六七八九十百千]+|\d+(?:\.\d{1,2})?)/g;
const LEADING_RE = /^(?:然后|还有|以及|另外|接着|再来|再|和|跟|并且)/;

function parseChineseInteger(raw: string): number | null {
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
  if (amount <= 0 || amount > 99_999) return null;
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
    const jiao = /^\s*(?:([零〇一二两三四五六七八九])(?![十百千])|(\d)(?!\d))(?:\s*(?:毛|角))?/.exec(after);
    if (jiao) end += jiao[0].length;
    return { jiao: jiao?.[1] ?? jiao?.[2], end, hasUnit: true };
  }
  if (!allowBare) return { end: from, hasUnit: false };
  const spoken = /^\s*([零〇一二两三四五六七八九]|\d)\s*(?:毛|角)/.exec(rest);
  if (!spoken) return { end: from, hasUnit: false };
  return { jiao: spoken[1], end: from + spoken[0].length, hasUnit: true };
}

function findAmounts(text: string): AmountMatch[] {
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
    const numberEnd = match.index + match[0].length;
    const tail = readJiao(text, numberEnd, !intRaw.includes("."));
    const amount = parseAmount(intRaw, tail.jiao);
    const end = Math.max(tail.end, numberEnd);
    if (end <= match.index) break;
    cursor = end;
    re.lastIndex = end;
    if (amount == null) continue;
    const candidate: AmountMatch = {
      index: match.index,
      end,
      amount,
      hasUnit: tail.hasUnit || /[¥￥]/.test(match[0]),
      intRaw,
    };
    if (isConfidentAmount(candidate)) matches.push(candidate);
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

export function parseTranscript(transcript: string, now: Date = new Date()): ParseResult {
  const text = transcript.trim();
  if (!text) return { ok: false, transcript: text, reason: "empty" };

  const matches = findAmounts(text);
  if (matches.length === 0) return { ok: false, transcript: text, reason: "no-amount" };

  let previous = 0;
  const entries = matches.map((match) => {
    const clause = cleanupTitle(text.slice(previous, match.index));
    previous = match.end;
    const classified = classifyClause(clause, now);
    return {
      amount: match.amount,
      category: classified.category,
      subcategory: classified.subcategory,
      title: classified.title,
      transcript: text,
      confidence: entryConfidence(match.hasUnit, classified.category, classified.title),
    };
  });

  return { ok: true, transcript: text, entries };
}
