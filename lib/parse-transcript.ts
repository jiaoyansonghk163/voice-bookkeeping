import { categorize, categoryLabel } from "./categories";
import type { ParseResult } from "./types";

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

const AMOUNT_RE =
  /([零〇一二两三四五六七八九十百千]+|\d+(?:\.\d{1,2})?)\s*(块钱|块|元)?(?:\s*([零〇一二两三四五六七八九]|\d)\s*(毛|角)?)?/g;

function parseChineseInteger(raw: string): number | null {
  let total = 0;
  let current = 0;
  let seen = false;

  for (const char of raw) {
    if (char in DIGITS) {
      current = DIGITS[char];
      seen = true;
      continue;
    }
    const unit = UNITS[char];
    if (!unit) return null;
    seen = true;
    total += (current || 1) * unit;
    current = 0;
  }

  if (!seen) return null;
  return total + current;
}

function parseAmount(intRaw: string, jiaoRaw: string | undefined): number | null {
  let whole: number | null;
  let fraction = jiaoRaw;

  if (/^\d/.test(intRaw)) {
    whole = Number(intRaw);
    if (!Number.isFinite(whole)) return null;
    if (intRaw.includes(".")) fraction = undefined;
  } else {
    whole = parseChineseInteger(intRaw);
  }

  if (whole == null) return null;

  let jiao = 0;
  if (fraction) {
    jiao = /^\d$/.test(fraction) ? Number(fraction) : (DIGITS[fraction] ?? 0);
  }

  const amount = Math.round((whole + jiao / 10) * 100) / 100;
  if (amount <= 0 || amount > 99_999) return null;
  return amount;
}

interface AmountMatch {
  index: number;
  length: number;
  amount: number;
  hasUnit: boolean;
  intRaw: string;
}

function isConfidentAmount(match: AmountMatch): boolean {
  if (match.hasUnit || /^\d/.test(match.intRaw) || /[十百千]/.test(match.intRaw)) return true;
  return match.intRaw.length >= 2;
}

function findAmount(transcript: string): AmountMatch | null {
  const matches: AmountMatch[] = [];
  for (const match of transcript.matchAll(AMOUNT_RE)) {
    const intRaw = match[1];
    if (!intRaw) continue;
    const amount = parseAmount(intRaw, match[3]);
    if (amount == null || match.index == null) continue;
    const candidate = {
      index: match.index,
      length: match[0].length,
      amount,
      hasUnit: Boolean(match[2] || match[4]),
      intRaw,
    };
    if (isConfidentAmount(candidate)) matches.push(candidate);
  }

  if (matches.length === 0) return null;
  matches.sort((a, b) => Number(b.hasUnit) - Number(a.hasUnit) || b.length - a.length);
  return matches[0];
}

function cleanupTitle(input: string): string {
  return input
    .replace(/[，。,.、！!？?\s]/g, "")
    .replace(/花了|付了|支付了|支付|花费|用了|一共|人民币/g, "")
    .replace(/^的+|的+$/g, "");
}

export function parseTranscript(transcript: string): ParseResult {
  const text = transcript.trim();
  if (!text) return { ok: false, transcript: text, reason: "empty" };

  const match = findAmount(text);
  if (!match) return { ok: false, transcript: text, reason: "no-amount" };

  const rawTitle = cleanupTitle(text.slice(0, match.index) + text.slice(match.index + match.length));
  const category = categorize(text);

  return {
    ok: true,
    amount: match.amount,
    category,
    title: rawTitle || categoryLabel(category),
    transcript: text,
  };
}
