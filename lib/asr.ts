interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface BrowserSpeechEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
}

type SpeechCtor = (new () => BrowserSpeechRecognition) & {
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
};

/**
 * iOS Safari (and every other iOS browser, which is WebKit) often never
 * delivers `onresult` or `onend` when `continuous` is true, so the listening
 * sheet sits on「正在聆听…」. Those hosts get one utterance at a time and the
 * same recognizer is started again after `onend`. A new recognizer, or
 * `abort()`, makes iOS show the microphone prompt on every open.
 */
export const LISTEN_TIMING = {
  quietMs: 6_000,
  emptyFallbackMs: 12_000,
  restartMs: 250,
  glitchMs: 400,
  maxGlitches: 6,
  noSpeechLimit: 2,
} as const;

export const QUIET_LISTEN_HINT = "没听到，点完成或改输入";

export function listenFallbackHint(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "没有麦克风权限，改为输入，比如「午饭三十八」";
  }
  if (code === "audio-capture") {
    return "麦克风没法用，改为输入，比如「午饭三十八」";
  }
  if (code === "no-speech" || code === "timeout") {
    return "没有听到内容，可以直接输入，比如「午饭三十八」";
  }
  if (code === "start-failed") {
    return "语音没能开始，改为输入，比如「午饭三十八」";
  }
  if (code === "restart-denied") {
    return "识别中断了，可以直接修改这句";
  }
  return "识别没连上，改为输入，比如「午饭三十八」";
}

export function usesSingleUtterance(env: {
  userAgent?: string;
  maxTouchPoints?: number;
  hasWebkitSpeech?: boolean;
  hasUnprefixedSpeech?: boolean;
}): boolean {
  if (env.hasWebkitSpeech && !env.hasUnprefixedSpeech) return true;
  const ua = env.userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && (env.maxTouchPoints ?? 0) > 1) return true;
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/i.test(ua);
}

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function detectSingleUtterance(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const host = window as Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return usesSingleUtterance({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    hasWebkitSpeech: typeof host.webkitSpeechRecognition === "function",
    hasUnprefixedSpeech: typeof host.SpeechRecognition === "function",
  });
}

export function speechRecognitionSupported(): boolean {
  return getSpeechCtor() != null;
}

export type CaptureMode = "local" | "vendor" | "type";

/**
 * `local` means this browser can recognize zh-CN on the device.
 * `vendor` means the browser will use its own speech service (Google or Apple).
 * `type` means we should not start the microphone.
 */
export async function captureMode(): Promise<CaptureMode> {
  const Ctor = getSpeechCtor();
  if (!Ctor) return "type";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "type";
  if (typeof Ctor.available === "function") {
    try {
      const status = await Ctor.available({ langs: ["zh-CN"], processLocally: true });
      if (status === "available") return "local";
    } catch {
      /* the browser has no on-device probe; fall through */
    }
  }
  return "vendor";
}

export interface ListenSession {
  /** End this capture. Does not call `SpeechRecognition.abort()` — on iOS that prompts again. */
  stop: () => void;
  abort: () => void;
}

export interface MicMemory {
  grant: "unknown" | "granted" | "denied";
}

export interface RecognizerSlot {
  current: BrowserSpeechRecognition | null;
  epoch: number;
  /** Ignore one `onend` caused by stopping the previous capture, until this time. */
  discardEndUntil: number;
}

export interface MicrophoneDeps {
  memory?: MicMemory;
  query?: () => Promise<"granted" | "denied" | "prompt" | "unknown">;
  request?: () => Promise<{ stopTracks: () => void }>;
}

const pageMic: MicMemory = { grant: "unknown" };
const pageRecognizer: RecognizerSlot = { current: null, epoch: 0, discardEndUntil: 0 };
const micInflight = new WeakMap<MicMemory, Promise<"granted" | "denied">>();

function deniedErrorName(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  return name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError";
}

export async function queryMicrophonePermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  const permissions = typeof navigator === "undefined" ? undefined : navigator.permissions;
  if (!permissions?.query) return "unknown";
  try {
    const status = await permissions.query({ name: "microphone" } as PermissionDescriptor);
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") return status.state;
  } catch {
    /* iOS Safari throws for the microphone permission name on some versions */
  }
  return "unknown";
}

async function requestMicrophone(): Promise<{ stopTracks: () => void }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    const error = new Error("unsupported");
    error.name = "NotSupportedError";
    throw error;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return {
    stopTracks() {
      // Release the device so speech recognition can open it. The grant is
      // remembered for this page visit, so this request is not repeated.
      for (const track of stream.getTracks()) track.stop();
    },
  };
}

async function resolveMicrophone(
  memory: MicMemory,
  query: () => Promise<"granted" | "denied" | "prompt" | "unknown">,
  request: () => Promise<{ stopTracks: () => void }>,
): Promise<"granted" | "denied"> {
  if (memory.grant === "granted" || memory.grant === "denied") return memory.grant;
  let queried: "granted" | "denied" | "prompt" | "unknown" = "unknown";
  try {
    queried = await query();
  } catch {
    queried = "unknown";
  }
  if (queried === "granted") {
    memory.grant = "granted";
    return "granted";
  }
  if (queried === "denied") {
    memory.grant = "denied";
    return "denied";
  }
  // `unknown` means this Safari can't answer. Don't call getUserMedia here:
  // speech recognition asks on its own, and a second request is another dialog.
  if (queried !== "prompt") return "granted";
  try {
    const stream = await request();
    stream.stopTracks();
    memory.grant = "granted";
    return "granted";
  } catch (error) {
    if (deniedErrorName(error)) {
      memory.grant = "denied";
      return "denied";
    }
    return "granted";
  }
}

/**
 * Reuse a microphone grant for this page visit.
 * Already granted: do not call getUserMedia.
 * Denied: do not ask again.
 * Prompt: ask once, then remember the answer.
 */
export function prepareMicrophone(deps?: MicrophoneDeps): Promise<"granted" | "denied"> {
  const memory = deps?.memory ?? pageMic;
  if (memory.grant === "granted" || memory.grant === "denied") return Promise.resolve(memory.grant);
  const existing = micInflight.get(memory);
  if (existing) return existing;
  const promise = resolveMicrophone(memory, deps?.query ?? queryMicrophonePermission, deps?.request ?? requestMicrophone);
  micInflight.set(memory, promise);
  return promise.finally(() => {
    micInflight.delete(memory);
  });
}

export interface ListenHandlers {
  onTranscript: (text: string) => void;
  onError: (code: string) => void;
  /** Still listening, but nothing has been heard yet. */
  onNotice?: (notice: "quiet") => void;
}

export interface ListenDeps {
  create?: () => BrowserSpeechRecognition;
  singleUtterance?: boolean;
  schedule?: (fn: () => void, delayMs: number) => number;
  clearSchedule?: (id: number) => void;
  now?: () => number;
  /** Reuse this recognizer across opens. Omit to keep one for the page. */
  recognizer?: RecognizerSlot;
  mic?: MicMemory;
}

function joinUtterance(previous: string, next: string): string {
  const left = previous.trim();
  const right = next.trim();
  if (!left) return right;
  if (!right) return left;
  return `${left}${right}`;
}

function defaultCreate(): BrowserSpeechRecognition {
  const Ctor = getSpeechCtor();
  if (!Ctor) throw new Error("unsupported");
  return new Ctor();
}

export function startListening(
  mode: Exclude<CaptureMode, "type">,
  handlers: ListenHandlers,
  deps?: ListenDeps,
): ListenSession | null {
  const singleUtterance = deps?.singleUtterance ?? detectSingleUtterance();
  const schedule = deps?.schedule ?? ((fn, delayMs) => window.setTimeout(fn, delayMs) as unknown as number);
  const clearSchedule = deps?.clearSchedule ?? ((id) => window.clearTimeout(id));
  const now = deps?.now ?? (() => Date.now());
  const create = deps?.create ?? defaultCreate;
  const slot =
    deps?.recognizer ?? (deps?.create ? { current: null, epoch: 0, discardEndUntil: 0 } : pageRecognizer);
  const memory = deps?.mic ?? (deps?.create ? { grant: "unknown" as const } : pageMic);

  let active = true;
  let closing = false;
  let recovering = false;
  let heard = false;
  let quietNotified = false;
  let noSpeech = 0;
  let glitches = 0;
  let sawNoSpeech = false;
  let startedAt = 0;
  let wiredToken = 0;
  let committed = "";
  let sessionText = "";
  let rec: BrowserSpeechRecognition | null = null;
  let quietTimer: number | null = null;
  let emptyTimer: number | null = null;
  let restartTimer: number | null = null;

  const ownsRecognizer = () => wiredToken !== 0 && wiredToken === slot.epoch;

  const clearTimer = (id: number | null) => {
    if (id == null) return;
    clearSchedule(id);
  };

  const clearSilenceTimers = () => {
    clearTimer(quietTimer);
    clearTimer(emptyTimer);
    quietTimer = null;
    emptyTimer = null;
  };

  const clearRestartTimer = () => {
    clearTimer(restartTimer);
    restartTimer = null;
  };

  const notifyQuiet = () => {
    if (quietNotified || !active || heard || !ownsRecognizer()) return;
    quietNotified = true;
    handlers.onNotice?.("quiet");
  };

  const noteGrant = () => {
    if (memory.grant !== "denied") memory.grant = "granted";
  };

  const endRecognizer = () => {
    // Swallow the onend that belongs to this stop so the next open is not cut off.
    slot.discardEndUntil = now() + LISTEN_TIMING.glitchMs;
    try {
      rec?.stop();
    } catch {
      /* already stopped */
    }
  };

  const fail = (code: string) => {
    if (!active || closing || !ownsRecognizer()) return;
    active = false;
    closing = true;
    clearSilenceTimers();
    clearRestartTimer();
    if (code === "not-allowed" || code === "service-not-allowed") memory.grant = "denied";
    endRecognizer();
    handlers.onError(code);
  };

  const armSilenceTimers = () => {
    clearSilenceTimers();
    quietTimer = schedule(() => {
      quietTimer = null;
      if (!active || heard || !ownsRecognizer()) return;
      notifyQuiet();
    }, LISTEN_TIMING.quietMs);
    emptyTimer = schedule(() => {
      emptyTimer = null;
      if (!active || heard || !ownsRecognizer()) return;
      fail("timeout");
    }, LISTEN_TIMING.emptyFallbackMs);
  };

  const scheduleRestart = () => {
    if (!active || !ownsRecognizer()) return;
    clearRestartTimer();
    restartTimer = schedule(() => {
      restartTimer = null;
      if (!active || !ownsRecognizer()) return;
      begin(false);
    }, LISTEN_TIMING.restartMs);
  };

  const wire = (target: BrowserSpeechRecognition, token: number) => {
    target.lang = "zh-CN";
    target.interimResults = true;
    target.continuous = !singleUtterance;
    target.maxAlternatives = 1;
    if (mode === "local") target.processLocally = true;

    target.onstart = () => {
      if (token !== slot.epoch) return;
      noteGrant();
    };

    target.onresult = (event) => {
      if (token !== slot.epoch) return;
      let text = "";
      for (let index = 0; index < event.results.length; index += 1) {
        text += event.results[index]?.[0]?.transcript ?? "";
      }
      if (!text.trim()) return;
      sessionText = text;
      const spoken = joinUtterance(committed, sessionText);
      if (spoken) {
        heard = true;
        noSpeech = 0;
        clearSilenceTimers();
        noteGrant();
      }
      handlers.onTranscript(spoken);
    };

    target.onerror = (event) => {
      if (recovering || token !== slot.epoch) return;
      const code = event.error || "speech-error";
      if (code === "aborted" || !active || closing) return;
      if (code === "no-speech") {
        sawNoSpeech = true;
        noSpeech += 1;
        if (!heard && noSpeech >= LISTEN_TIMING.noSpeechLimit) {
          fail("no-speech");
          return;
        }
        if (!heard) notifyQuiet();
        return;
      }
      if (code === "not-allowed" || code === "service-not-allowed") {
        fail(heard ? "restart-denied" : "not-allowed");
        return;
      }
      fail(code);
    };

    target.onend = () => {
      if (recovering || token !== slot.epoch) return;
      if (now() < slot.discardEndUntil) {
        slot.discardEndUntil = 0;
        return;
      }
      const utterance = sessionText;
      const endedAfterNoSpeech = sawNoSpeech;
      sawNoSpeech = false;
      committed = joinUtterance(committed, sessionText);
      sessionText = "";
      if (!active) return;
      const elapsed = now() - startedAt;
      if (!utterance && !endedAfterNoSpeech && elapsed < LISTEN_TIMING.glitchMs) {
        glitches += 1;
        if (glitches >= LISTEN_TIMING.maxGlitches) {
          fail("start-failed");
          return;
        }
      } else {
        glitches = 0;
      }
      scheduleRestart();
    };
  };

  const tryStart = (): "ok" | "invalid" | "failed" => {
    if (!rec) return "failed";
    try {
      rec.start();
      return "ok";
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      return name === "InvalidStateError" ? "invalid" : "failed";
    }
  };

  const startOrRecover = (): boolean => {
    const first = tryStart();
    if (first === "ok") return true;
    if (first !== "invalid" || !rec) return false;
    // Already started: stop the previous capture and reuse this object.
    // Replacing it would show the iOS microphone prompt again.
    recovering = true;
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
    recovering = false;
    return tryStart() === "ok";
  };

  const obtain = (): BrowserSpeechRecognition => {
    if (!slot.current) slot.current = create();
    return slot.current;
  };

  const resetUtterance = () => {
    committed = "";
    sessionText = "";
    heard = false;
    noSpeech = 0;
    glitches = 0;
    quietNotified = false;
    sawNoSpeech = false;
  };

  function begin(fresh: boolean): boolean {
    if (!active) return false;
    try {
      rec = obtain();
    } catch {
      wiredToken = 0;
      active = false;
      closing = true;
      handlers.onError("start-failed");
      return false;
    }
    if (fresh) {
      slot.epoch += 1;
      wiredToken = slot.epoch;
      wire(rec, wiredToken);
      resetUtterance();
    }
    startedAt = now();
    if (startOrRecover()) return true;
    fail("start-failed");
    return false;
  }

  const release = () => {
    if (wiredToken !== 0 && wiredToken !== slot.epoch) return;
    if (!active && closing) return;
    active = false;
    closing = true;
    clearSilenceTimers();
    clearRestartTimer();
    slot.epoch += 1;
    endRecognizer();
  };

  if (!begin(true)) return null;
  armSilenceTimers();
  return {
    stop: release,
    abort: release,
  };
}
