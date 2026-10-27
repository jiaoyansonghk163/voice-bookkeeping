import {
  emptyLedger,
  normalizeLedgerReport,
  normalizeTransaction,
  pickNewer,
  type LedgerState,
} from "./backup";

const DB_NAME = "voice-ledger";
const DB_VERSION = 1;
const STORE = "kv";
const STATE_KEY = "state";
const PREVIOUS_KEY = "previous-ledger";
const FALLBACK_KEY = "voice-ledger.v1";
const QUARANTINE_KEY = "voice-ledger.quarantine.v1";
const PREVIOUS_FALLBACK_KEY = "voice-ledger.previous.v1";
const META_KEY = "liji.meta.v1";
const LEGACY_KEY = "liji.ledger.v2";
const CHANNEL = "liji-ledger";

let queue: Promise<unknown> = Promise.resolve();

export interface LedgerMeta {
  lastExportAt: number | null;
  reminderDismissedAt: number | null;
}

export function readMeta(): LedgerMeta {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_KEY) ?? "{}") as Partial<LedgerMeta>;
    const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
    return { lastExportAt: num(parsed.lastExportAt), reminderDismissedAt: num(parsed.reminderDismissedAt) };
  } catch {
    return { lastExportAt: null, reminderDismissedAt: null };
  }
}

export function writeMeta(patch: Partial<LedgerMeta>): LedgerMeta {
  const next = { ...readMeta(), ...patch };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(next));
  } catch {
    /* meta is a convenience; a refusal is not worth a warning */
  }
  return next;
}

function legacyVoiceEntries(): LedgerState["transactions"] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { transactions?: unknown };
    if (!Array.isArray(parsed.transactions)) return [];
    const transactions: LedgerState["transactions"] = [];
    for (const item of parsed.transactions) {
      const transaction = normalizeTransaction(item);
      if (transaction?.source === "voice") transactions.push(transaction);
    }
    return transactions;
  } catch {
    return [];
  }
}

/** Rows that failed normalisation are kept here instead of being dropped. */
export function quarantine(rows: unknown[]) {
  if (rows.length === 0) return;
  try {
    const existing = JSON.parse(localStorage.getItem(QUARANTINE_KEY) ?? "[]") as unknown[];
    const merged = [...(Array.isArray(existing) ? existing : []), ...rows].slice(-500);
    localStorage.setItem(QUARANTINE_KEY, JSON.stringify(merged));
  } catch {
    /* nothing more to do */
  }
}

function readFallback(): LedgerState | null {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as LedgerState).transactions)) return null;
    const report = normalizeLedgerReport(parsed);
    quarantine(report.rejected);
    return report.ledger;
  } catch {
    return null;
  }
}

function writeFallback(state: LedgerState) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no indexedDB"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function mergeLegacy(base: LedgerState): LedgerState {
  const voice = legacyVoiceEntries();
  if (voice.length === 0) return base;
  const seen = new Set(base.transactions.map((item) => item.id));
  const transactions = [...base.transactions];
  for (const item of voice) {
    if (!seen.has(item.id)) transactions.push(item);
  }
  return { ...base, transactions };
}

async function readIdb(): Promise<LedgerState | null> {
  try {
    const db = await openDb();
    try {
      const stored = await idbGet(db, STATE_KEY);
      if (!stored) return null;
      const report = normalizeLedgerReport(stored);
      quarantine(report.rejected);
      return report.ledger;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Read both copies and keep the one with the newer updatedAt. Does not write. */
export async function readLedger(): Promise<LedgerState> {
  const [fromIdb, fromLocal] = [await readIdb(), readFallback()];
  return pickNewer(fromIdb, fromLocal) ?? emptyLedger();
}

export async function loadLedger(): Promise<LedgerState> {
  const base = await readLedger();
  const next = mergeLegacy(base);
  if (next !== base) {
    const stamped = { ...next, updatedAt: Date.now() };
    const ok = await writeLedger(stamped);
    if (ok) {
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignore */
      }
    }
    return stamped;
  }
  return base;
}

/** Writes both copies. Resolves false only when neither could be written. */
async function writeLedger(state: LedgerState): Promise<boolean> {
  let idbOk = false;
  let localOk = false;
  try {
    const db = await openDb();
    try {
      await idbPut(db, STATE_KEY, state);
      idbOk = true;
    } finally {
      db.close();
    }
  } catch {
    idbOk = false;
  }
  try {
    writeFallback(state);
    localOk = true;
  } catch {
    localOk = false;
  }
  return idbOk || localOk;
}

export function saveLedger(state: LedgerState): Promise<boolean> {
  const job = queue.then(() => writeLedger(state));
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  return job.then((ok) => {
    if (ok) announce(state.updatedAt ?? 0);
    return ok;
  });
}

/** Keep the ledger as it was before a replacing import so it can be undone. */
export async function savePreviousLedger(state: LedgerState | null): Promise<boolean> {
  let ok = false;
  try {
    const db = await openDb();
    try {
      await idbPut(db, PREVIOUS_KEY, state);
      ok = true;
    } finally {
      db.close();
    }
  } catch {
    /* try localStorage below */
  }
  try {
    if (state) localStorage.setItem(PREVIOUS_FALLBACK_KEY, JSON.stringify(state));
    else localStorage.removeItem(PREVIOUS_FALLBACK_KEY);
    ok = true;
  } catch {
    /* too big for localStorage is fine when IDB took it */
  }
  return ok;
}

export async function loadPreviousLedger(): Promise<LedgerState | null> {
  try {
    const db = await openDb();
    try {
      const stored = await idbGet(db, PREVIOUS_KEY);
      if (stored) return normalizeLedgerReport(stored).ledger;
    } finally {
      db.close();
    }
  } catch {
    /* fall through */
  }
  try {
    const raw = localStorage.getItem(PREVIOUS_FALLBACK_KEY);
    return raw ? normalizeLedgerReport(JSON.parse(raw)).ledger : null;
  } catch {
    return null;
  }
}

let channel: BroadcastChannel | null = null;
const SELF = Math.random().toString(36).slice(2);

function announce(stamp: number) {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    channel ??= new BroadcastChannel(CHANNEL);
    channel.postMessage({ from: SELF, stamp });
  } catch {
    /* other tabs will still see the localStorage event */
  }
}

/** Call back when another tab saved. Returns the unsubscribe. */
export function subscribeExternal(onChange: () => void): () => void {
  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = (event: MessageEvent) => {
        if (event.data?.from !== SELF) onChange();
      };
    } catch {
      bc = null;
    }
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === FALLBACK_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    bc?.close();
  };
}
