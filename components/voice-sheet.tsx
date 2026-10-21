"use client";

import { useEffect, useRef, useState } from "react";
import { MicButton } from "@/components/bottom-nav";
import {
  captureMode,
  prepareMicrophone,
  speechRecognitionSupported,
  startListening,
  type ListenSession,
} from "@/lib/asr";
import { CATEGORY_ORDER, CATEGORIES, defaultPick } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { commitOrDrop, createdAtFromDay, stageUtterance, type EditableDraft } from "@/lib/drafts";
import { VOICE_COPY, sourceLine } from "@/lib/voice-copy";
import type { CategoryId, ParsedExpense } from "@/lib/types";

const WAVE = [8, 14, 10, 18, 12, 16, 9];
/** Last resort if recognition never starts and never errors. The session has its own shorter timer. */
const SHEET_WATCHDOG_MS = 15_000;

type Capture = "listen" | "quiet" | "failed" | "type";
type Pane = "listen" | "failed" | "type" | "review";

interface Face {
  pane: Pane;
  title: string;
  subtitle: string;
  transcript: string;
  typed: string;
  entries: DraftEntry[];
  picking: string | null;
}

interface DraftEntry extends EditableDraft {
  key: string;
}

function StaticWave() {
  return (
    <div className="wave" aria-hidden="true">
      {WAVE.map((height, index) => (
        <i key={index} style={{ height }} />
      ))}
    </div>
  );
}

export function VoiceSheet({
  open,
  onClose,
  onCommit,
  presetCategory = null,
}: {
  open: boolean;
  onClose: () => void;
  onCommit: (expenses: ParsedExpense[], at: Date) => void;
  presetCategory?: CategoryId | null;
}) {
  const session = useRef(0);
  const listenRef = useRef<ListenSession | null>(null);
  const listeningRef = useRef(false);
  const transcriptRef = useRef("");
  const onCloseRef = useRef(onClose);
  const wantSpeech = useRef(false);
  const [phase, setPhase] = useState<"capture" | "review">("capture");
  const [capture, setCapture] = useState<Capture>(presetCategory ? "type" : "listen");
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [recordedAt, setRecordedAt] = useState<Date>(() => new Date());
  const [picking, setPicking] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [commitLocked, setCommitLocked] = useState(false);
  const finishLock = useRef(false);
  const commitLock = useRef(false);

  onCloseRef.current = onClose;

  const stopMic = () => {
    // stop(), not abort(): aborting makes iOS ask for the microphone again next open.
    listenRef.current?.stop();
    listenRef.current = null;
  };

  const requestClose = () => {
    commitOrDrop("close", entries);
    listeningRef.current = false;
    session.current += 1;
    stopMic();
    onCloseRef.current();
  };

  const switchToType = (text: string) => {
    listeningRef.current = false;
    session.current += 1;
    stopMic();
    finishLock.current = false;
    setCapture("type");
    setTyped(text);
    setPhase("capture");
  };

  const showFailed = () => {
    listeningRef.current = false;
    session.current += 1;
    stopMic();
    finishLock.current = false;
    setCapture("failed");
    setPhase("capture");
  };

  const goReview = (text: string) => {
    const staged = stageUtterance(text, new Date(), presetCategory);
    if (!staged) return false;
    stopMic();
    setEntries(staged.entries.map((entry) => ({ key: crypto.randomUUID(), ...entry })));
    setRecordedAt(new Date());
    setPicking(null);
    setPhase("review");
    return true;
  };

  const finish = () => {
    if (finishLock.current) return;
    if (capture === "type") {
      const text = typed.trim();
      if (!text) return;
      if (!stageUtterance(text, new Date(), presetCategory)) return;
      finishLock.current = true;
      session.current += 1;
      goReview(text);
      return;
    }
    finishLock.current = true;
    const handle = listenRef.current;
    listenRef.current = null;
    listeningRef.current = false;
    handle?.stop();
    const text = transcriptRef.current.trim();
    if (!text || !stageUtterance(text, new Date(), presetCategory)) {
      finishLock.current = false;
      showFailed();
      return;
    }
    session.current += 1;
    goReview(text);
  };

  const startRecording = () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    if (!speechRecognitionSupported()) return;
    wantSpeech.current = true;
    finishLock.current = false;
    setRun((value) => value + 1);
  };

  const clearTyped = () => {
    if (!typed.trim()) {
      requestClose();
      return;
    }
    setTyped("");
  };

  const updateEntry = (key: string, patch: Partial<DraftEntry>) => {
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
  };

  const confirmEntries = () => {
    if (commitLock.current) return;
    const expenses = commitOrDrop("confirm", entries);
    if (!expenses) return;
    commitLock.current = true;
    setCommitLocked(true);
    onCommit(
      expenses.map((expense, index) => ({
        ...expense,
        createdAt: createdAtFromDay(entries[index]?.day ?? "", recordedAt),
      })),
      recordedAt,
    );
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = session.current + 1;
    session.current = id;
    listeningRef.current = false;
    finishLock.current = false;
    commitLock.current = false;
    setCommitLocked(false);
    stopMic();
    setPhase("capture");
    transcriptRef.current = "";
    setTranscript("");
    setTyped("");
    setEntries([]);
    setPicking(null);

    let cancelled = false;
    let watchdog = 0;
    const cleanup = () => {
      cancelled = true;
      listeningRef.current = false;
      if (watchdog) window.clearTimeout(watchdog);
      session.current += 1;
      stopMic();
    };

    const speak = wantSpeech.current;
    wantSpeech.current = false;
    if (presetCategory && !speak) {
      setCapture("type");
      return cleanup;
    }

    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (offline || !speechRecognitionSupported()) {
      setCapture("type");
      return cleanup;
    }
    setCapture("listen");
    listeningRef.current = true;

    void (async () => {
      // Ask only when this visit does not already have a grant. A denial opens typing
      // and is remembered, so the next open does not raise the prompt again.
      const access = await prepareMicrophone();
      if (cancelled || session.current !== id) return;
      if (access === "denied") {
        switchToType("");
        return;
      }
      watchdog = window.setTimeout(() => {
        if (cancelled || session.current !== id || !listeningRef.current) return;
        if (transcriptRef.current.trim()) return;
        showFailed();
      }, SHEET_WATCHDOG_MS);
      const mode = await captureMode();
      if (cancelled || session.current !== id) return;
      if (mode === "type") {
        switchToType("");
        return;
      }
      const sessionHandle = startListening(mode, {
        onTranscript: (text) => {
          if (session.current !== id) return;
          transcriptRef.current = text;
          setTranscript(text);
          if (text.trim()) setCapture("listen");
        },
        onNotice: (notice) => {
          if (session.current !== id || notice !== "quiet") return;
          if (transcriptRef.current.trim()) return;
          setCapture("quiet");
        },
        onError: (code) => {
          if (session.current !== id || code === "aborted") return;
          if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
            switchToType(transcriptRef.current);
            return;
          }
          showFailed();
        },
      });
      if (cancelled || session.current !== id) {
        sessionHandle?.stop();
        return;
      }
      if (!sessionHandle) {
        showFailed();
        return;
      }
      listenRef.current = sessionHandle;
    })();

    return cleanup;
  }, [open, run, presetCategory]);

  useEffect(() => {
    if (!open) return;
    const onOffline = () => {
      if (!listeningRef.current) return;
      switchToType(transcriptRef.current);
    };
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, [open]);

  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const place = () => {
      const node = stageRef.current;
      if (!node) return;
      node.style.top = `${viewport.offsetTop}px`;
      node.style.height = `${viewport.height}px`;
      node.style.bottom = "auto";
    };
    viewport.addEventListener("resize", place);
    viewport.addEventListener("scroll", place);
    place();
    return () => {
      viewport.removeEventListener("resize", place);
      viewport.removeEventListener("scroll", place);
    };
  }, [open]);

  const ready = commitOrDrop("confirm", entries) !== null && !commitLocked;
  const listening = capture === "listen" || capture === "quiet";
  const title =
    capture === "quiet" ? VOICE_COPY.quietTitle : capture === "failed" ? VOICE_COPY.failTitle : capture === "type" ? VOICE_COPY.typeTitle : VOICE_COPY.listenTitle;
  const subtitle = capture === "quiet" ? VOICE_COPY.quietSubtitle : capture === "failed" ? VOICE_COPY.failSubtitle : capture === "listen" ? VOICE_COPY.listenSubtitle : "";
  const pane: Pane = phase === "review" ? "review" : listening ? "listen" : capture === "failed" ? "failed" : "type";
  const live: Face = { pane, title, subtitle, transcript, typed, entries, picking };
  const frontRef = useRef(live);
  const [front, setFront] = useState(live);
  const [back, setBack] = useState<Face | null>(null);
  frontRef.current = front;

  useEffect(() => {
    if (frontRef.current.pane === pane) return;
    setBack(frontRef.current);
    setFront(live);
    const id = window.setTimeout(() => setBack(null), 180);
    return () => window.clearTimeout(id);
  }, [pane]);

  useEffect(() => {
    setFront((current) => (current.pane === pane ? live : current));
  }, [pane, title, subtitle, transcript, typed, entries, picking]);

  if (!open) return null;

  const paint = (face: Face) => {
    if (face.pane === "review") {
      return (
        <ConfirmEntries
          entries={face.entries}
          picking={face.picking}
          onPick={(key) => setPicking((value) => (value === key ? null : key))}
          onChange={updateEntry}
          onRemove={(key) => {
            setEntries((current) => current.filter((entry) => entry.key !== key));
            setPicking((value) => (value === key ? null : value));
          }}
          canSave={ready}
          onCancel={requestClose}
          onCommit={confirmEntries}
        />
      );
    }
    if (face.pane === "listen") {
      return (
        <ListenStage
          title={face.title}
          subtitle={face.subtitle}
          transcript={face.transcript}
          onType={() => switchToType(transcriptRef.current)}
          onFinish={finish}
        />
      );
    }
    if (face.pane === "failed") {
      return (
        <div className="listen-col">
          <h1 className="listen-title">{VOICE_COPY.failTitle}</h1>
          <p className="listen-sub">{VOICE_COPY.failSubtitle}</p>
          <button type="button" className="primary wide" onClick={() => switchToType(transcriptRef.current)}>
            {VOICE_COPY.typeInstead}
          </button>
        </div>
      );
    }
    return <TypeStage typed={face.typed} onChange={setTyped} onClear={clearTyped} onFinish={finish} onRecord={startRecording} />;
  };

  return (
    <section ref={stageRef} className="stage" role="dialog" aria-modal="true" aria-label={phase === "review" ? VOICE_COPY.confirmTitle : title}>
      <div className="slot">
        {back ? (
          <div className={cn("pane", "out", back.pane === "listen" && "listen")} aria-hidden="true">
            {paint(back)}
          </div>
        ) : null}
        <div className={cn("pane", back && "in", front.pane === "listen" && "listen")}>{paint(front)}</div>
      </div>
    </section>
  );
}

function ListenStage({
  title,
  subtitle,
  transcript,
  onType,
  onFinish,
}: {
  title: string;
  subtitle: string;
  transcript: string;
  onType: () => void;
  onFinish: () => void;
}) {
  return (
    <>
      <div className="listen-col">
        <div className="halo" aria-hidden="true">
          <span className="halo-ring" />
          <span className="halo-core">
            <MicMark />
          </span>
        </div>
        <h1 className="listen-title">{title}</h1>
        {transcript.trim() ? <p className="heard">{transcript}</p> : null}
        <StaticWave />
        <p className="listen-sub">{subtitle}</p>
        <button type="button" className="text-link" onClick={onType}>
          {VOICE_COPY.typeInstead}
        </button>
      </div>
      <MicButton stop label={VOICE_COPY.done} onClick={onFinish} />
    </>
  );
}

function TypeStage({
  typed,
  onChange,
  onClear,
  onFinish,
  onRecord,
}: {
  typed: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onFinish: () => void;
  onRecord: () => void;
}) {
  const empty = !typed.trim();
  return (
    <div className="type-page">
      <h1>{VOICE_COPY.typeTitle}</h1>
      <p className="page-sub">{VOICE_COPY.typeHint}</p>
      <textarea
        className="typebox"
        value={typed}
        placeholder={VOICE_COPY.typePlaceholder}
        aria-label={VOICE_COPY.typeTitle}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="pair">
        <button type="button" className="ghost" onClick={onClear}>
          {VOICE_COPY.clear}
        </button>
        <button type="button" className="primary" onClick={onFinish} disabled={empty}>
          {VOICE_COPY.typeDone}
        </button>
      </div>
      <button type="button" className="record" aria-label={VOICE_COPY.startMic} onClick={onRecord}>
        <span className="face" aria-hidden="true">
          <MicMark />
        </span>
        {VOICE_COPY.startMic}
      </button>
    </div>
  );
}

function ConfirmEntries({
  entries,
  picking,
  onPick,
  onChange,
  onRemove,
  canSave,
  onCancel,
  onCommit,
}: {
  entries: DraftEntry[];
  picking: string | null;
  onPick: (key: string) => void;
  onChange: (key: string, patch: Partial<DraftEntry>) => void;
  onRemove: (key: string) => void;
  canSave: boolean;
  onCancel: () => void;
  onCommit: () => void;
}) {
  const many = entries.length > 1;
  const unsure = entries.some((entry) => entry.confidence === "low");

  return (
    <div className="confirm-page">
      <h1>{VOICE_COPY.confirmTitle}</h1>
      <p className="page-sub">{VOICE_COPY.confirmHint}</p>
      <p className={cn("warn-bar", unsure && "on")} aria-hidden={unsure ? undefined : true}>
        {VOICE_COPY.lowConfidence}
      </p>
      <div className="confirm-list">
        {entries.map((entry) => (
          <article className="confirm-card" key={entry.key}>
            <label className="money">
              <span aria-hidden="true">¥</span>
              <input
                aria-label={VOICE_COPY.amount}
                inputMode="decimal"
                value={entry.amount}
                onChange={(event) => onChange(entry.key, { amount: event.target.value })}
              />
            </label>
            <div className="confirm-fields">
              <button type="button" className="field-chip" aria-label={VOICE_COPY.category} onClick={() => onPick(entry.key)}>
                {CATEGORIES[entry.category].label}
              </button>
              <input
                className="field-chip"
                aria-label={VOICE_COPY.note}
                value={entry.title}
                onChange={(event) => onChange(entry.key, { title: event.target.value })}
              />
            </div>
            {picking === entry.key ? (
              <div className="cat-pop" role="group" aria-label={VOICE_COPY.category}>
                {CATEGORY_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={cn(id === entry.category && "on")}
                    onClick={() => {
                      onChange(entry.key, { category: id, subcategory: defaultPick(id, new Date()) });
                      onPick(entry.key);
                    }}
                  >
                    {CATEGORIES[id].label}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="source-line">
              <span>{sourceLine(entry.source || entry.transcript)}</span>
              {many ? (
                <button type="button" className="drop" aria-label={`${VOICE_COPY.delete}${entry.title}`} onClick={() => onRemove(entry.key)}>
                  {VOICE_COPY.delete}
                </button>
              ) : null}
            </p>
          </article>
        ))}
      </div>
      <div className="pair">
        <button type="button" className="ghost" onClick={onCancel}>
          {VOICE_COPY.cancel}
        </button>
        <button type="button" className="primary" onClick={onCommit} disabled={!canSave}>
          {VOICE_COPY.confirmAll}
        </button>
      </div>
    </div>
  );
}

function MicMark() {
  return (
    <svg width="22" height="30" viewBox="0 0 22 30" aria-hidden="true">
      <rect x="2" y="1" width="18" height="16" rx="8" fill="#fff" />
      <path d="M2 13a9 9 0 0 0 18 0" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M11 22v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
