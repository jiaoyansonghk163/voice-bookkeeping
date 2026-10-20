interface BrowserSpeechRecognition extends EventTarget {
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
}

interface BrowserSpeechEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
}

type SpeechCtor = (new () => BrowserSpeechRecognition) & {
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
};

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
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
  stop: () => void;
  abort: () => void;
}

export function startListening(
  mode: Exclude<CaptureMode, "type">,
  handlers: {
    onTranscript: (text: string) => void;
    onError: (code: string) => void;
  },
): ListenSession | null {
  const Ctor = getSpeechCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "zh-CN";
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;
  if (mode === "local") rec.processLocally = true;

  rec.onresult = (event) => {
    let text = "";
    for (let index = 0; index < event.results.length; index += 1) {
      text += event.results[index]?.[0]?.transcript ?? "";
    }
    handlers.onTranscript(text.trim());
  };
  rec.onerror = (event) => {
    handlers.onError(event.error || "speech-error");
  };
  try {
    rec.start();
  } catch {
    handlers.onError("start-failed");
    return null;
  }
  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
    abort: () => {
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    },
  };
}
