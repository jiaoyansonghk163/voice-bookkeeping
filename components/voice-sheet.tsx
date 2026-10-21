"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Glyph, categoryChipStyle, categoryGlyph, categoryName } from "@/components/glyphs";
import {
  captureMode,
  prepareMicrophone,
  speechRecognitionSupported,
  startListening,
  type ListenSession,
} from "@/lib/asr";
import { CATEGORY_ORDER, SUBCATEGORIES, categoryDetail, defaultPick } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { commitOrDrop, createdAtFromDay, stageUtterance, type EditableDraft } from "@/lib/drafts";
import { VOICE_COPY, confirmCount, confirmSubtitle } from "@/lib/voice-copy";
import type { CategoryId, ParsedExpense } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const LOW_BARS = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6];
/** Last resort if recognition never starts and never errors. The session has its own shorter timer. */
const SHEET_WATCHDOG_MS = 15_000;

type Capture = "listen" | "quiet" | "failed" | "type";

interface DraftEntry extends EditableDraft {
  key: string;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
    </svg>
  );
}

function LiveTranscript({ text }: { text: string }) {
  return (
    <div className="transcript">
      {text}
      <span className="cur" />
    </div>
  );
}

function StaticWave() {
  return (
    <div className="wave" aria-hidden="true">
      {LOW_BARS.map((height, index) => (
        <i key={index} style={{ height, opacity: 0.45 }} />
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
  const reduceMotion = useReducedMotion() === true;
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

  const updateEntry = (key: string, patch: Partial<DraftEntry>) => {
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
  };

  const keepEditing = () => {
    commitOrDrop("retry", entries);
    const text = entries[0]?.transcript ?? typed;
    finishLock.current = false;
    commitLock.current = false;
    setCommitLocked(false);
    setEntries([]);
    setPicking(null);
    setTyped(text);
    setCapture("type");
    setPhase("capture");
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

  const motionProps = reduceMotion ? { duration: 0.01 } : { duration: 0.3, ease: EASE };
  const ready = commitOrDrop("confirm", entries) !== null && !commitLocked;
  const listening = capture === "listen" || capture === "quiet";
  const title =
    capture === "quiet" ? VOICE_COPY.quietTitle : capture === "failed" ? VOICE_COPY.failTitle : capture === "type" ? VOICE_COPY.typeTitle : VOICE_COPY.listenTitle;
  const subtitle = capture === "quiet" ? VOICE_COPY.quietSubtitle : capture === "failed" ? VOICE_COPY.failSubtitle : capture === "listen" ? VOICE_COPY.listenSubtitle : "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="dim"
          className="dim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 0.25, ease: "easeOut" }}
          onClick={requestClose}
        />
      )}
      {open && (
        <motion.section
          key="sheet"
          className="sheet glass"
          role="dialog"
          aria-modal="true"
          aria-label={phase === "review" ? VOICE_COPY.confirmTitle : title}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={motionProps}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="grab" />
          {phase === "review" ? (
            <ConfirmEntries
              entries={entries}
              picking={picking}
              onPick={(key) => setPicking((value) => (value === key ? null : key))}
              onChange={updateEntry}
              onRemove={(key) => {
                setEntries((current) => current.filter((entry) => entry.key !== key));
                setPicking((value) => (value === key ? null : value));
              }}
              recordedAt={recordedAt}
              onClose={requestClose}
              onKeepEditing={keepEditing}
              canSave={ready}
              onCommit={confirmEntries}
            />
          ) : (
            <>
              <div className="shead">
                <h2>{title}</h2>
                <button type="button" className="x" aria-label="关闭" onClick={requestClose}>
                  <CloseIcon />
                </button>
              </div>
              {subtitle ? (
                <div className="hint" role="status" aria-live="polite">
                  {subtitle}
                </div>
              ) : null}
              {listening ? (
                <div aria-live="polite">
                  <LiveTranscript text={transcript} />
                </div>
              ) : null}
              {capture === "type" ? (
                <input
                  className="typebox"
                  value={typed}
                  placeholder={VOICE_COPY.typePlaceholder}
                  autoFocus
                  aria-label={VOICE_COPY.typeTitle}
                  onChange={(event) => setTyped(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && typed.trim()) finish();
                  }}
                />
              ) : null}
              {presetCategory && capture === "type" ? (
                <div className="preset">
                  <span className="chip" style={categoryChipStyle(presetCategory)}>
                    <Glyph name={categoryGlyph(presetCategory)} size={16} strokeWidth={2} />
                    {categoryName(presetCategory)}
                  </span>
                </div>
              ) : null}
              {listening ? <StaticWave /> : null}
              {capture === "failed" ? (
                <button type="button" className="go" onClick={() => switchToType(transcriptRef.current)}>
                  {VOICE_COPY.typeInstead}
                </button>
              ) : null}
              {listening ? (
                <div className="ctrl pair">
                  <button type="button" className="tbtn l" onClick={() => switchToType(transcriptRef.current)}>
                    {VOICE_COPY.typeInstead}
                  </button>
                  <button type="button" className="tbtn r" onClick={finish}>
                    {VOICE_COPY.done}
                  </button>
                </div>
              ) : null}
              {capture === "type" ? (
                <div className="ctrl">
                  <button type="button" className="tbtn l" onClick={requestClose}>
                    {VOICE_COPY.cancel}
                  </button>
                  <button type="button" className="rec" aria-label={VOICE_COPY.startMic} onClick={startRecording}>
                    <MicIcon />
                  </button>
                  <button type="button" className="tbtn r" onClick={finish} disabled={!typed.trim()}>
                    {VOICE_COPY.typeDone}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function CategoryPicker({
  category,
  subcategory,
  onCategory,
  onSubcategory,
}: {
  category: CategoryId;
  subcategory: string;
  onCategory: (category: CategoryId) => void;
  onSubcategory: (subcategory: string) => void;
}) {
  const subs = SUBCATEGORIES[category];
  return (
    <div className="picker" role="group" aria-label={VOICE_COPY.category}>
      <span className="picker-lab">大类</span>
      {CATEGORY_ORDER.map((id) => (
        <button key={id} type="button" className={cn(id === category && "on")} onClick={() => onCategory(id)}>
          {categoryName(id)}
        </button>
      ))}
      {subs.length > 0 ? (
        <>
          <span className="picker-lab">小类</span>
          {subs.map((name) => (
            <button key={name} type="button" className={cn(name === subcategory && "on")} onClick={() => onSubcategory(name)}>
              {name}
            </button>
          ))}
        </>
      ) : null}
    </div>
  );
}

function EntryFields({
  entry,
  openPicker,
  onTogglePicker,
  onChange,
  recordedAt,
  onRemove,
}: {
  entry: DraftEntry;
  openPicker: boolean;
  onTogglePicker: () => void;
  onChange: (patch: Partial<DraftEntry>) => void;
  recordedAt: Date;
  onRemove?: () => void;
}) {
  return (
    <div className="entry-fields">
      <label className="field">
        <span>{VOICE_COPY.amount}</span>
        <input
          inputMode="decimal"
          aria-label={VOICE_COPY.amount}
          value={entry.amount}
          onChange={(event) => onChange({ amount: event.target.value })}
        />
      </label>
      <div className="field">
        <span>{VOICE_COPY.category}</span>
        <button type="button" className="esub" onClick={onTogglePicker}>
          {categoryDetail(entry.category, entry.subcategory)}
        </button>
        {openPicker ? (
          <CategoryPicker
            category={entry.category}
            subcategory={entry.subcategory}
            onCategory={(category) =>
              onChange({
                category,
                subcategory: category === entry.category ? entry.subcategory : defaultPick(category, recordedAt),
              })
            }
            onSubcategory={(subcategory) => {
              onChange({ subcategory });
              onTogglePicker();
            }}
          />
        ) : null}
      </div>
      <label className="field">
        <span>{VOICE_COPY.date}</span>
        <input
          type="date"
          aria-label={VOICE_COPY.date}
          value={entry.day}
          onChange={(event) => onChange({ day: event.target.value })}
        />
      </label>
      <label className="field">
        <span>{VOICE_COPY.note}</span>
        <input
          aria-label={VOICE_COPY.note}
          value={entry.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </label>
      {onRemove ? (
        <button type="button" className="edel" aria-label={`删除${entry.title || VOICE_COPY.note}`} onClick={onRemove}>
          ×
        </button>
      ) : null}
    </div>
  );
}

function ConfirmEntries({
  entries,
  picking,
  onPick,
  onChange,
  onRemove,
  recordedAt,
  onClose,
  onKeepEditing,
  canSave,
  onCommit,
}: {
  entries: DraftEntry[];
  picking: string | null;
  onPick: (key: string) => void;
  onChange: (key: string, patch: Partial<DraftEntry>) => void;
  onRemove: (key: string) => void;
  recordedAt: Date;
  onClose: () => void;
  onKeepEditing: () => void;
  canSave: boolean;
  onCommit: () => void;
}) {
  const many = entries.length !== 1;
  const unsure = entries.some((entry) => entry.confidence === "low");

  return (
    <>
      <div className="shead">
        <h2>{VOICE_COPY.confirmTitle}</h2>
        <button type="button" className="x" aria-label="关闭" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="sheet-body">
        <p className="hint confirm-sub">{confirmSubtitle(entries.length)}</p>
        {unsure ? <p className="hint warn">{VOICE_COPY.lowConfidence}</p> : null}
        {many ? <p className="count-line">{confirmCount(entries.length)}</p> : null}
        <div className="erows">
          {entries.map((entry) => (
            <div className={cn("erow", many && "card")} key={entry.key}>
              <EntryFields
                entry={entry}
                openPicker={!many || picking === entry.key}
                onTogglePicker={() => onPick(entry.key)}
                onChange={(patch) => onChange(entry.key, patch)}
                recordedAt={recordedAt}
                onRemove={many ? () => onRemove(entry.key) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="sheet-foot">
        {many ? (
          <>
            <button type="button" className="go" onClick={onCommit} disabled={!canSave}>
              {VOICE_COPY.confirmAll}
            </button>
            <button type="button" className="again" onClick={onKeepEditing}>
              {VOICE_COPY.keepEditing}
            </button>
          </>
        ) : (
          <button type="button" className="go" onClick={onCommit} disabled={!canSave}>
            {VOICE_COPY.confirmOne}
          </button>
        )}
      </div>
    </>
  );
}
