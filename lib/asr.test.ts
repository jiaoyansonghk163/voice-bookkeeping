import assert from "node:assert/strict";
import test from "node:test";
import {
  LISTEN_TIMING,
  QUIET_LISTEN_HINT,
  listenFallbackHint,
  prepareMicrophone,
  startListening,
  usesSingleUtterance,
  type ListenSession,
  type MicMemory,
  type RecognizerSlot,
} from "./asr";

class FakeRec {
  lang = "";
  interimResults = false;
  continuous = true;
  maxAlternatives = 1;
  processLocally?: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null =
    null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  starts = 0;
  stops = 0;
  aborts = 0;
  failStart = false;

  start() {
    this.starts += 1;
    if (this.failStart) throw new Error("start failed");
  }

  stop() {
    this.stops += 1;
    this.onend?.();
  }

  abort() {
    this.aborts += 1;
    this.onerror?.({ error: "aborted" });
    this.onend?.();
  }

  emit(text: string) {
    const row = Object.assign([{ transcript: text }], { isFinal: true });
    this.onresult?.({ resultIndex: 0, results: [row] });
  }

  error(code: string) {
    this.onerror?.({ error: code });
  }

  end() {
    this.onend?.();
  }
}

function createClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => now,
    schedule(fn: () => void, delayMs: number) {
      const id = nextId++;
      timers.set(id, { at: now + delayMs, fn });
      return id;
    },
    clear(id: number) {
      timers.delete(id);
    },
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        let next: { id: number; at: number; fn: () => void } | null = null;
        for (const [id, timer] of timers) {
          if (timer.at <= target && (!next || timer.at < next.at || (timer.at === next.at && id < next.id))) {
            next = { id, at: timer.at, fn: timer.fn };
          }
        }
        if (!next) break;
        timers.delete(next.id);
        now = next.at;
        next.fn();
      }
      now = target;
    },
  };
}

function setup(singleUtterance: boolean, mode: "local" | "vendor" = "vendor", create?: () => FakeRec) {
  const created: FakeRec[] = [];
  const transcripts: string[] = [];
  const notices: string[] = [];
  const errors: string[] = [];
  const clock = createClock();
  const recognizer: RecognizerSlot = { current: null, epoch: 0, discardEndUntil: 0 };
  const mic: MicMemory = { grant: "unknown" };
  const session = startListening(
    mode,
    {
      onTranscript: (text) => transcripts.push(text),
      onNotice: (notice) => notices.push(notice),
      onError: (code) => errors.push(code),
    },
    {
      singleUtterance,
      recognizer,
      mic,
      schedule: clock.schedule,
      clearSchedule: clock.clear,
      now: clock.now,
      create:
        create ??
        (() => {
          const fake = new FakeRec();
          created.push(fake);
          return fake;
        }),
    },
  );
  return { created, transcripts, notices, errors, clock, session, mic, recognizer };
}

test("WebKit hosts use one utterance at a time", () => {
  assert.equal(
    usesSingleUtterance({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    }),
    true,
  );
  assert.equal(
    usesSingleUtterance({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
    }),
    true,
  );
  assert.equal(usesSingleUtterance({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15" }), true);
  assert.equal(
    usesSingleUtterance({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Safari/605.1.15",
      maxTouchPoints: 5,
    }),
    true,
  );
  assert.equal(
    usesSingleUtterance({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
      maxTouchPoints: 0,
    }),
    true,
  );
  assert.equal(
    usesSingleUtterance({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      hasWebkitSpeech: true,
      hasUnprefixedSpeech: true,
    }),
    false,
  );
  assert.equal(
    usesSingleUtterance({
      userAgent: "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36",
      hasWebkitSpeech: true,
      hasUnprefixedSpeech: false,
    }),
    true,
  );
  assert.equal(usesSingleUtterance({ userAgent: "" }), false);
});

test("fallback hints name the way out of a stuck listen", () => {
  assert.equal(QUIET_LISTEN_HINT, "没听到，点完成或改输入");
  assert.match(listenFallbackHint("no-speech"), /没有听到内容/);
  assert.equal(listenFallbackHint("timeout"), listenFallbackHint("no-speech"));
  assert.match(listenFallbackHint("not-allowed"), /麦克风权限/);
  assert.match(listenFallbackHint("service-not-allowed"), /麦克风权限/);
  assert.match(listenFallbackHint("audio-capture"), /麦克风没法用/);
  assert.match(listenFallbackHint("start-failed"), /没能开始/);
  assert.match(listenFallbackHint("restart-denied"), /识别中断了/);
  assert.match(listenFallbackHint("network"), /没连上/);
});

test("Safari settings are single-utterance and Chrome stays continuous", () => {
  const webkit = setup(true);
  assert.ok(webkit.session);
  assert.equal(webkit.created[0]?.continuous, false);
  assert.equal(webkit.created[0]?.interimResults, true);
  assert.equal(webkit.created[0]?.lang, "zh-CN");
  assert.equal(webkit.created[0]?.maxAlternatives, 1);
  assert.equal(webkit.created[0]?.processLocally, undefined);
  assert.equal(webkit.created[0]?.starts, 1);

  const chrome = setup(false);
  assert.equal(chrome.created[0]?.continuous, true);
  assert.equal(chrome.created[0]?.interimResults, true);

  const local = setup(true, "local");
  assert.equal(local.created[0]?.processLocally, true);
  assert.equal(local.created[0]?.continuous, false);
});

test("interim text replaces within one utterance and appends across restarts", () => {
  const { created, transcripts, clock } = setup(true);
  created[0]?.emit("打车");
  created[0]?.emit("打车二十五");
  assert.equal(transcripts.at(-1), "打车二十五");
  created[0]?.emit("");
  assert.equal(transcripts.at(-1), "打车二十五");
  created[0]?.end();
  clock.advance(LISTEN_TIMING.restartMs);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.starts, 2);
  created[0]?.emit("午饭三十");
  assert.equal(transcripts.at(-1), "打车二十五午饭三十");
});

test("onend restarts while listening and stop cancels that restart", () => {
  const restarted = setup(true);
  restarted.clock.advance(LISTEN_TIMING.glitchMs);
  restarted.created[0]?.end();
  restarted.clock.advance(LISTEN_TIMING.restartMs - 1);
  assert.equal(restarted.created.length, 1);
  assert.equal(restarted.created[0]?.starts, 1);
  restarted.clock.advance(1);
  assert.equal(restarted.created.length, 1);
  assert.equal(restarted.created[0]?.starts, 2);
  assert.equal(restarted.created[0]?.continuous, false);
  assert.equal(restarted.created[0]?.aborts, 0);

  const stopped = setup(true);
  stopped.created[0]?.end();
  stopped.session?.stop();
  stopped.clock.advance(1_000);
  assert.equal(stopped.created.length, 1);

  const chrome = setup(false);
  chrome.clock.advance(LISTEN_TIMING.glitchMs);
  chrome.created[0]?.end();
  chrome.clock.advance(LISTEN_TIMING.restartMs);
  assert.equal(chrome.created.length, 1);
  assert.equal(chrome.created[0]?.starts, 2);
  assert.equal(chrome.created[0]?.continuous, true);
  assert.equal(chrome.created[0]?.aborts, 0);
});

test("finish releases a WebKit mic even when no result arrived", () => {
  const webkit = setup(true);
  webkit.session?.stop();
  assert.equal(webkit.created[0]?.stops, 1);
  assert.equal(webkit.created[0]?.aborts, 0);
  assert.deepEqual(webkit.errors, []);
  webkit.clock.advance(1_000);
  assert.equal(webkit.created.length, 1);

  const chrome = setup(false);
  chrome.session?.stop();
  assert.equal(chrome.created[0]?.stops, 1);
  assert.equal(chrome.created[0]?.aborts, 0);
  chrome.session?.abort();
  assert.deepEqual(chrome.errors, []);
});

test("two empty no-speech sessions fall back and a heard phrase does not", () => {
  const silent = setup(true);
  silent.created[0]?.error("no-speech");
  assert.deepEqual(silent.notices, ["quiet"]);
  silent.created[0]?.end();
  silent.clock.advance(LISTEN_TIMING.restartMs);
  assert.equal(silent.created.length, 1);
  assert.equal(silent.created[0]?.starts, 2);
  assert.deepEqual(silent.errors, []);
  silent.created[0]?.error("no-speech");
  assert.deepEqual(silent.errors, ["no-speech"]);
  silent.clock.advance(1_000);
  assert.equal(silent.created[0]?.starts, 2);
  assert.equal(silent.created[0]?.aborts, 0);

  const heard = setup(true);
  heard.created[0]?.error("no-speech");
  heard.created[0]?.end();
  heard.clock.advance(LISTEN_TIMING.restartMs);
  heard.created[0]?.emit("打车二十五");
  heard.created[0]?.error("no-speech");
  heard.created[0]?.end();
  heard.clock.advance(LISTEN_TIMING.restartMs);
  assert.deepEqual(heard.errors, []);
  assert.equal(heard.created.length, 1);
  assert.equal(heard.created[0]?.starts, 3);
  assert.equal(heard.mic.grant, "granted");
});

test("silence without an end event still leaves listening", () => {
  const hung = setup(true);
  hung.clock.advance(LISTEN_TIMING.quietMs);
  assert.deepEqual(hung.notices, ["quiet"]);
  assert.deepEqual(hung.errors, []);
  hung.clock.advance(LISTEN_TIMING.emptyFallbackMs - LISTEN_TIMING.quietMs);
  assert.deepEqual(hung.errors, ["timeout"]);
  hung.clock.advance(1_000);
  assert.equal(hung.created.length, 1);

  const oneNoSpeech = setup(true);
  oneNoSpeech.created[0]?.error("no-speech");
  oneNoSpeech.created[0]?.end();
  oneNoSpeech.clock.advance(LISTEN_TIMING.restartMs);
  oneNoSpeech.clock.advance(LISTEN_TIMING.emptyFallbackMs);
  assert.deepEqual(oneNoSpeech.errors, ["timeout"]);
  assert.equal(oneNoSpeech.notices.length, 1);

  const spoke = setup(true);
  spoke.clock.advance(1_000);
  spoke.created[0]?.emit("打车二十五");
  spoke.clock.advance(LISTEN_TIMING.emptyFallbackMs);
  assert.deepEqual(spoke.errors, []);
  assert.deepEqual(spoke.notices, []);
});

test("permission, network, and start failures do not restart", () => {
  const denied = setup(true);
  denied.created[0]?.error("not-allowed");
  assert.deepEqual(denied.errors, ["not-allowed"]);
  assert.equal(denied.created[0]?.aborts, 0);
  assert.equal(denied.created[0]?.stops, 1);
  assert.equal(denied.mic.grant, "denied");
  denied.clock.advance(1_000);
  assert.equal(denied.created.length, 1);
  assert.equal(denied.created[0]?.starts, 1);

  const interrupted = setup(true);
  interrupted.created[0]?.emit("打车二十五");
  interrupted.created[0]?.error("not-allowed");
  assert.deepEqual(interrupted.errors, ["restart-denied"]);

  const offline = setup(true);
  offline.created[0]?.error("network");
  assert.deepEqual(offline.errors, ["network"]);
  offline.clock.advance(1_000);
  assert.equal(offline.created.length, 1);

  const created: FakeRec[] = [];
  let session: ListenSession | null = null;
  const errors: string[] = [];
  session = startListening(
    "vendor",
    { onTranscript: () => {}, onError: (code) => errors.push(code) },
    {
      singleUtterance: true,
      schedule: () => 1,
      clearSchedule: () => {},
      now: () => 0,
      create: () => {
        const fake = new FakeRec();
        fake.failStart = true;
        created.push(fake);
        return fake;
      },
    },
  );
  assert.equal(session, null);
  assert.deepEqual(errors, ["start-failed"]);

  const missing = startListening("vendor", { onTranscript: () => {}, onError: (code) => errors.push(code) });
  assert.equal(missing, null);
  assert.deepEqual(errors, ["start-failed", "start-failed"]);
});

test("the same recognizer is reused across opens without aborting", () => {
  const recognizer: RecognizerSlot = { current: null, epoch: 0, discardEndUntil: 0 };
  const mic: MicMemory = { grant: "unknown" };
  const created: FakeRec[] = [];
  const clock = createClock();
  const deps = {
    singleUtterance: true,
    recognizer,
    mic,
    schedule: clock.schedule,
    clearSchedule: clock.clear,
    now: clock.now,
    create: () => {
      const fake = new FakeRec();
      created.push(fake);
      return fake;
    },
  };
  const errors: string[] = [];
  const first = startListening("vendor", { onTranscript: () => {}, onError: (code) => errors.push(code) }, deps);
  assert.ok(first);
  first.stop();
  clock.advance(LISTEN_TIMING.glitchMs);
  const second = startListening("vendor", { onTranscript: () => {}, onError: (code) => errors.push(code) }, deps);
  assert.ok(second);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.starts, 2);
  assert.equal(created[0]?.aborts, 0);
  created[0]?.onstart?.();
  assert.equal(mic.grant, "granted");
  created[0]?.emit("午饭三十");
  assert.deepEqual(errors, []);
});

test("instant onend loops give up instead of spinning", () => {
  const { created, errors, clock } = setup(true);
  const rec = created[0];
  assert.ok(rec);
  for (let index = 0; index < LISTEN_TIMING.maxGlitches - 1; index += 1) {
    rec.end();
    assert.deepEqual(errors, []);
    clock.advance(LISTEN_TIMING.restartMs);
  }
  assert.equal(created.length, 1);
  assert.equal(rec.starts, LISTEN_TIMING.maxGlitches);
  rec.end();
  assert.deepEqual(errors, ["start-failed"]);
  clock.advance(1_000);
  assert.equal(rec.starts, LISTEN_TIMING.maxGlitches);
  assert.equal(rec.aborts, 0);
});

test("an already-started recognizer is stopped and reused", () => {
  const created: FakeRec[] = [];
  const errors: string[] = [];
  const clock = createClock();
  let calls = 0;
  startListening(
    "vendor",
    { onTranscript: () => {}, onError: (code) => errors.push(code) },
    {
      singleUtterance: true,
      recognizer: { current: null, epoch: 0, discardEndUntil: 0 },
      mic: { grant: "unknown" },
      schedule: clock.schedule,
      clearSchedule: clock.clear,
      now: clock.now,
      create: () => {
        const fake = new FakeRec();
        const baseStart = fake.start.bind(fake);
        fake.start = () => {
          calls += 1;
          if (calls === 2) {
            const error = new Error("already started");
            error.name = "InvalidStateError";
            throw error;
          }
          baseStart();
        };
        created.push(fake);
        return fake;
      },
    },
  );
  clock.advance(LISTEN_TIMING.glitchMs);
  created[0]?.end();
  clock.advance(LISTEN_TIMING.restartMs);
  assert.equal(created.length, 1);
  assert.deepEqual(errors, []);
  assert.equal(created[0]?.aborts, 0);
  assert.ok((created[0]?.starts ?? 0) >= 2);
});

test("microphone grant is reused and a denial is not asked again", async () => {
  const granted = { grant: "unknown" } as MicMemory;
  let grantedQueries = 0;
  assert.equal(
    await prepareMicrophone({
      memory: granted,
      query: async () => {
        grantedQueries += 1;
        return "granted";
      },
      request: async () => {
        throw new Error("should not request");
      },
    }),
    "granted",
  );
  assert.equal(grantedQueries, 1);
  assert.equal(
    await prepareMicrophone({
      memory: granted,
      query: async () => {
        throw new Error("should not query");
      },
      request: async () => {
        throw new Error("should not request");
      },
    }),
    "granted",
  );

  const denied = { grant: "unknown" } as MicMemory;
  let deniedRequests = 0;
  assert.equal(
    await prepareMicrophone({
      memory: denied,
      query: async () => "denied",
      request: async () => {
        deniedRequests += 1;
        return { stopTracks() {} };
      },
    }),
    "denied",
  );
  assert.equal(deniedRequests, 0);
  assert.equal(await prepareMicrophone({ memory: denied, query: async () => "prompt" }), "denied");

  const prompted = { grant: "unknown" } as MicMemory;
  let requests = 0;
  let stopped = 0;
  assert.equal(
    await prepareMicrophone({
      memory: prompted,
      query: async () => "prompt",
      request: async () => {
        requests += 1;
        return {
          stopTracks() {
            stopped += 1;
          },
        };
      },
    }),
    "granted",
  );
  assert.equal(requests, 1);
  assert.equal(stopped, 1);
  assert.equal(await prepareMicrophone({ memory: prompted, query: async () => "prompt" }), "granted");
  assert.equal(requests, 1);

  const blocked = { grant: "unknown" } as MicMemory;
  const deniedError = new Error("nope");
  deniedError.name = "NotAllowedError";
  assert.equal(
    await prepareMicrophone({
      memory: blocked,
      query: async () => "prompt",
      request: async () => {
        throw deniedError;
      },
    }),
    "denied",
  );
  assert.equal(blocked.grant, "denied");

  let unknownRequests = 0;
  assert.equal(
    await prepareMicrophone({
      memory: { grant: "unknown" },
      query: async () => {
        throw new Error("microphone is not a valid PermissionName");
      },
      request: async () => {
        unknownRequests += 1;
        return { stopTracks() {} };
      },
    }),
    "granted",
  );
  assert.equal(unknownRequests, 0);

  let parallelRequests = 0;
  let release: (stream: { stopTracks: () => void }) => void = () => {};
  const gate = new Promise<{ stopTracks: () => void }>((resolve) => {
    release = resolve;
  });
  const shared = { grant: "unknown" } as MicMemory;
  const first = prepareMicrophone({
    memory: shared,
    query: async () => "prompt",
    request: () => {
      parallelRequests += 1;
      return gate;
    },
  });
  const second = prepareMicrophone({
    memory: shared,
    query: async () => "prompt",
    request: () => {
      parallelRequests += 1;
      return gate;
    },
  });
  release({ stopTracks() {} });
  assert.equal(await first, "granted");
  assert.equal(await second, "granted");
  assert.equal(parallelRequests, 1);
});
