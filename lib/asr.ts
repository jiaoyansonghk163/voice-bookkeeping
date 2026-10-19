export interface AsrResult {
  transcript: string;
  confidence: number;
  engine: "mock" | "webspeech";
}

export interface RecognizeOptions {
  /** Skip capture and return this phrase. Used by the demo chips. */
  hint?: string;
  signal?: AbortSignal;
  delayMs?: number;
}

/**
 * Speech engines plug in behind this interface.
 * The prototype ships a scripted mock so the demo runs without a microphone,
 * a network call, or an API key. Swap `createSpeechRecognizer()` for a real engine.
 */
export interface SpeechRecognizer {
  recognize(options?: RecognizeOptions): Promise<AsrResult>;
}

export const DEMO_PHRASES = [
  "午饭三十八块",
  "打车十五块五",
  "咖啡二十八",
  "超市买菜六十二块三",
  "地铁四块",
  "电影票七十八",
] as const;

export class MockSpeechRecognizer implements SpeechRecognizer {
  private cursor = 0;

  constructor(private readonly scripts: readonly string[] = DEMO_PHRASES) {}

  recognize(options: RecognizeOptions = {}): Promise<AsrResult> {
    const delayMs = options.delayMs ?? 1200;

    return new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abort);
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      };

      const timer = setTimeout(() => {
        options.signal?.removeEventListener("abort", abort);
        const transcript = options.hint ?? this.scripts[this.cursor % this.scripts.length];
        if (!options.hint) this.cursor += 1;
        resolve({ transcript, confidence: options.hint ? 0.99 : 0.95, engine: "mock" });
      }, delayMs);

      if (options.signal?.aborted) {
        abort();
        return;
      }
      options.signal?.addEventListener("abort", abort, { once: true });
    });
  }
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

interface BrowserSpeechEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>>;
}

type SpeechCtor = new () => BrowserSpeechRecognition;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

/** Optional browser speech engine. Not selected by the demo factory. */
export class WebSpeechRecognizer implements SpeechRecognizer {
  constructor(private readonly lang = "zh-CN") {}

  recognize(options: RecognizeOptions = {}): Promise<AsrResult> {
    if (options.hint) {
      return Promise.resolve({ transcript: options.hint, confidence: 1, engine: "webspeech" });
    }

    const Ctor = getSpeechCtor();
    if (!Ctor) {
      return Promise.reject(new Error("SpeechRecognition is not available in this browser"));
    }

    return new Promise((resolve, reject) => {
      const rec = new Ctor();
      rec.lang = this.lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      const finish = (callback: () => void) => {
        options.signal?.removeEventListener("abort", onAbort);
        callback();
      };

      const onAbort = () => {
        rec.abort();
        const error = new Error("aborted");
        error.name = "AbortError";
        finish(() => reject(error));
      };

      rec.onresult = (event) => {
        const best = event.results[0]?.[0];
        finish(() =>
          resolve({
            transcript: best?.transcript?.trim() ?? "",
            confidence: best?.confidence ?? 0,
            engine: "webspeech",
          }),
        );
      };
      rec.onerror = (event) => {
        finish(() => reject(new Error(event.error || "speech error")));
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });
      rec.start();
    });
  }
}

export function createSpeechRecognizer(): SpeechRecognizer {
  return new MockSpeechRecognizer();
}
