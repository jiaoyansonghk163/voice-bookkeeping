import { emptyLedger, isTransaction, type LedgerState } from "./backup";

const DB_NAME = "voice-ledger";
const DB_VERSION = 1;
const STORE = "kv";
const STATE_KEY = "state";
const FALLBACK_KEY = "voice-ledger.v1";
const LEGACY_KEY = "liji.ledger.v2";

let queue: Promise<void> = Promise.resolve();

function legacyVoiceEntries(): LedgerState["transactions"] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { transactions?: unknown };
    if (!Array.isArray(parsed.transactions)) return [];
    return parsed.transactions.filter(isTransaction).filter((item) => item.source === "voice");
  } catch {
    return [];
  }
}

function readFallback(): LedgerState | null {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LedgerState>;
    if (!Array.isArray(parsed.transactions)) return null;
    const transactions = parsed.transactions.filter(isTransaction);
    const monthlyBudget =
      typeof parsed.monthlyBudget === "number" && Number.isFinite(parsed.monthlyBudget)
        ? parsed.monthlyBudget
        : null;
    return { transactions, monthlyBudget };
  } catch {
    return null;
  }
}

function writeFallback(state: LedgerState) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(db: IDBDatabase): Promise<LedgerState | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result as LedgerState | undefined);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(db: IDBDatabase, state: LedgerState): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, STATE_KEY);
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

export async function loadLedger(): Promise<LedgerState> {
  try {
    const db = await openDb();
    const stored = await idbGet(db);
    const next = mergeLegacy(stored ?? readFallback() ?? emptyLedger());
    await idbPut(db, next);
    localStorage.removeItem(LEGACY_KEY);
    db.close();
    return next;
  } catch {
    const next = mergeLegacy(readFallback() ?? emptyLedger());
    try {
      writeFallback(next);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* private mode can refuse both stores; the session still works in memory */
    }
    return next;
  }
}

async function writeLedger(state: LedgerState): Promise<void> {
  try {
    const db = await openDb();
    await idbPut(db, state);
    db.close();
  } catch {
    try {
      writeFallback(state);
    } catch {
      /* keep the in-memory ledger for this session */
    }
  }
}

export function saveLedger(state: LedgerState): Promise<void> {
  const job = queue.then(() => writeLedger(state));
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}
