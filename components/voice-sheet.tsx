"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Glyph, categoryChipStyle, categoryGlyph, categoryName } from "@/components/glyphs";
import { captureMode, speechRecognitionSupported, startListening, type ListenSession } from "@/lib/asr";
import { CATEGORY_ORDER, SUBCATEGORIES, defaultPick } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatDetailStamp, formatYuan } from "@/lib/format";
import { parseTranscript } from "@/lib/parse-transcript";
import type { CategoryId, ParsedExpense } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const WAVE = [6, 8, 12, 18, 26, 34, 28, 40, 48, 36, 30, 44, 52, 42, 34, 26, 38, 46, 32, 24, 30, 20, 14, 18, 12, 8, 10, 6, 5, 4];

interface DraftEntry {
  key: string;
  amount: string;
  category: CategoryId;
  subcategory: string;
  title: string;
  transcript: string;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="ch" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function readAmount(text: string): number | null {
  const value = Number(text.replace(/[¥￥,\s]/g, ""));
  if (!Number.isFinite(value) || value <= 0 || value > 99_999) return null;
  return Math.round(value * 100) / 100;
}

function amountText(amount: number): string {
  return String(amount);
}

function toExpenses(entries: DraftEntry[]): ParsedExpense[] | null {
  const expenses: ParsedExpense[] = [];
  for (const entry of entries) {
    const amount = readAmount(entry.amount);
    const title = entry.title.trim();
    if (amount == null || !title) return null;
    expenses.push({
      amount,
      category: entry.category,
      subcategory: entry.subcategory,
      title,
      transcript: entry.transcript,
    });
  }
  return expenses;
}

function LiveTranscript({ text }: { text: string }) {
  return (
    <div className="transcript">
      {text}
      <span className="cur" />
    </div>
  );
}

export function VoiceSheet({
  open,
  onClose,
  onCommit,
}: {
  open: boolean;
  onClose: () => void;
  onCommit: (expenses: ParsedExpense[], at: Date) => void;
}) {
  const reduceMotion = useReducedMotion() === true;
  const session = useRef(0);
  const listenRef = useRef<ListenSession | null>(null);
  const transcriptRef = useRef("");
  const onCloseRef = useRef(onClose);
  const [phase, setPhase] = useState<"capture" | "review">("capture");
  const [capture, setCapture] = useState<"speech" | "type">("speech");
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState("说出用途和金额，比如「打车二十五」");
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [recordedAt, setRecordedAt] = useState<Date>(() => new Date());
  const [picking, setPicking] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  onCloseRef.current = onClose;

  const stopMic = () => {
    listenRef.current?.abort();
    listenRef.current = null;
  };

  const requestClose = () => {
    session.current += 1;
    stopMic();
    onCloseRef.current();
  };

  const useTyping = (text: string, message: string) => {
    stopMic();
    setCapture("type");
    setTyped(text);
    setHint(message);
    setPhase("capture");
  };

  const goReview = (text: string) => {
    const parsed = parseTranscript(text);
    if (!parsed.ok) {
      useTyping(text, "没有听清金额，补上用途和金额");
      return;
    }
    stopMic();
    setEntries(
      parsed.entries.map((entry) => ({
        key: crypto.randomUUID(),
        amount: amountText(entry.amount),
        category: entry.category,
        subcategory: entry.subcategory,
        title: entry.title,
        transcript: parsed.transcript,
      })),
    );
    setRecordedAt(new Date());
    setPicking(null);
    setPhase("review");
  };

  const finish = () => {
    const text = (capture === "type" ? typed : transcript).trim();
    listenRef.current?.stop();
    if (!text) {
      useTyping("", "没有听到内容，可以直接输入，比如「午饭三十八」");
      return;
    }
    goReview(text);
  };

  const updateEntry = (key: string, patch: Partial<DraftEntry>) => {
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
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
    stopMic();
    setPhase("capture");
    transcriptRef.current = "";
    setTranscript("");
    setTyped("");
    setEntries([]);
    setPicking(null);
    setHint("说出用途和金额，比如「打车二十五」");

    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (offline || !speechRecognitionSupported()) {
      setCapture("type");
      setHint(
        offline
          ? "当前离线，输入一句话，比如「午饭三十八」"
          : "这台设备不能语音识别，输入一句话，比如「午饭三十八」",
      );
      return;
    }
    setCapture("speech");

    let cancelled = false;
    void captureMode().then((mode) => {
      if (cancelled || session.current !== id) return;
      if (mode === "type") {
        setCapture("type");
        setHint("这台设备不能语音识别，输入一句话，比如「午饭三十八」");
        return;
      }
      const sessionHandle = startListening(mode, {
        onTranscript: (text) => {
          if (session.current !== id) return;
          transcriptRef.current = text;
          setTranscript(text);
        },
        onError: (code) => {
          if (session.current !== id || code === "aborted" || code === "no-speech") return;
          setTyped(transcriptRef.current);
          setCapture("type");
          setHint(
            code === "not-allowed"
              ? "没有麦克风权限，改为输入，比如「午饭三十八」"
              : "识别没连上，改为输入，比如「午饭三十八」",
          );
        },
      });
      if (session.current !== id) {
        sessionHandle?.abort();
        return;
      }
      listenRef.current = sessionHandle;
    });

    return () => {
      cancelled = true;
      session.current += 1;
      stopMic();
    };
  }, [open, run]);

  useEffect(() => {
    if (!open) return;
    const onOffline = () => useTyping(transcript, "当前离线，输入一句话，比如「午饭三十八」");
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, [open, transcript]);

  const motionProps = reduceMotion ? { duration: 0.01 } : { duration: 0.3, ease: EASE };
  const ready = toExpenses(entries);
  const many = entries.length > 1;

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
          aria-label={phase === "review" ? (many ? "确认这几笔" : "确认这笔账") : capture === "type" ? "手动输入" : "正在聆听"}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={motionProps}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="grab" />
          {phase === "review" && entries.length > 0 ? (
            entries.length === 1 ? (
              <ConfirmOne
                entry={entries[0]}
                when={formatDetailStamp(recordedAt, recordedAt)}
                picking={picking === entries[0].key}
                onPick={() => setPicking((value) => (value === entries[0].key ? null : entries[0].key))}
                onCategory={(category) => {
                  if (category === entries[0].category) return;
                  updateEntry(entries[0].key, { category, subcategory: defaultPick(category, recordedAt) });
                }}
                onSubcategory={(subcategory) => {
                  updateEntry(entries[0].key, { subcategory });
                  setPicking(null);
                }}
                onClose={requestClose}
                onAgain={() => setRun((value) => value + 1)}
                onCommit={() => {
                  if (ready) onCommit(ready, recordedAt);
                }}
              />
            ) : (
              <ConfirmMany
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
                onAgain={() => setRun((value) => value + 1)}
                canSave={ready !== null}
                onCommit={() => {
                  if (ready) onCommit(ready, recordedAt);
                }}
              />
            )
          ) : phase === "review" ? (
            <>
              <div className="shead">
                <h2>确认这几笔</h2>
                <button type="button" className="x" aria-label="关闭" onClick={requestClose}>
                  <CloseIcon />
                </button>
              </div>
              <p className="hint">没有要记的账。</p>
              <button type="button" className="again" onClick={() => setRun((value) => value + 1)}>
                重新说一遍
              </button>
            </>
          ) : (
            <>
              <div className="shead">
                <div className="listen">
                  {capture === "speech" ? <span className="dot" /> : null}
                  {capture === "speech" ? "正在聆听…" : "手动输入"}
                </div>
                <button type="button" className="x" aria-label="关闭" onClick={requestClose}>
                  <CloseIcon />
                </button>
              </div>
              {capture === "speech" ? (
                <LiveTranscript text={transcript} />
              ) : (
                <input
                  className="typebox"
                  value={typed}
                  placeholder="午饭三十八"
                  autoFocus
                  aria-label="输入用途和金额"
                  onChange={(event) => setTyped(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") finish();
                  }}
                />
              )}
              <div className="hint">{hint}</div>
              {capture === "speech" ? (
                <div className="wave" aria-hidden="true">
                  {WAVE.map((height, index) => (
                    <i key={index} style={{ height, opacity: index > 22 ? 0.35 : 0.85 }} />
                  ))}
                </div>
              ) : null}
              <div className="ctrl">
                <button type="button" className="tbtn l" onClick={requestClose}>
                  取消
                </button>
                <button type="button" className="stop" aria-label="停止" onClick={finish}>
                  <i />
                </button>
                <button type="button" className="tbtn r" onClick={finish}>
                  完成
                </button>
              </div>
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
  return (
    <div className="picker">
      {CATEGORY_ORDER.map((id) => (
        <button key={id} type="button" className={cn(id === category && "on")} onClick={() => onCategory(id)}>
          {categoryName(id)}
        </button>
      ))}
      {SUBCATEGORIES[category].map((name) => (
        <button key={name} type="button" className={cn(name === subcategory && "on")} onClick={() => onSubcategory(name)}>
          {name}
        </button>
      ))}
    </div>
  );
}

function ConfirmOne({
  entry,
  when,
  picking,
  onPick,
  onCategory,
  onSubcategory,
  onClose,
  onAgain,
  onCommit,
}: {
  entry: DraftEntry;
  when: string;
  picking: boolean;
  onPick: () => void;
  onCategory: (category: CategoryId) => void;
  onSubcategory: (subcategory: string) => void;
  onClose: () => void;
  onAgain: () => void;
  onCommit: () => void;
}) {
  const amount = readAmount(entry.amount);
  const chip = categoryChipStyle(entry.category);

  return (
    <>
      <div className="shead">
        <h2>确认这笔账</h2>
        <button type="button" className="x" aria-label="关闭" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="heard">听到：「{entry.transcript}」</div>
      <div className="hero rise">
        <div className="lab">支出金额</div>
        <div className="sum num">
          <small>¥</small>
          {amount == null ? "—" : formatYuan(amount)}
        </div>
      </div>
      <div className="card panel rise" style={{ animationDelay: ".05s" }}>
        <button type="button" className="f" onClick={onPick}>
          <span className="k">分类</span>
          <span className="v">
            <span className="chip" style={chip}>
              <Glyph name={categoryGlyph(entry.category)} size={16} strokeWidth={2} />
              {categoryName(entry.category)}
            </span>
            <Chevron />
          </span>
        </button>
        {picking && (
          <CategoryPicker
            category={entry.category}
            subcategory={entry.subcategory}
            onCategory={onCategory}
            onSubcategory={onSubcategory}
          />
        )}
        <div className="f">
          <span className="k">时间</span>
          <span className="v">
            {when}
            <Chevron />
          </span>
        </div>
        <div className="f">
          <span className="k">备注</span>
          <span className="v">
            {entry.title}
            <Chevron />
          </span>
        </div>
      </div>
      <button type="button" className="go" onClick={onCommit} disabled={amount == null}>
        确认记账
      </button>
      <button type="button" className="again" onClick={onAgain}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
        </svg>
        重新说一遍
      </button>
    </>
  );
}

function ConfirmMany({
  entries,
  picking,
  onPick,
  onChange,
  onRemove,
  recordedAt,
  onClose,
  onAgain,
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
  onAgain: () => void;
  canSave: boolean;
  onCommit: () => void;
}) {
  const total = entries.reduce((sum, entry) => sum + (readAmount(entry.amount) ?? 0), 0);

  return (
    <>
      <div className="shead">
        <h2>确认这几笔</h2>
        <button type="button" className="x" aria-label="关闭" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="heard">听到：「{entries[0]?.transcript}」</div>
      <div className="batch-total">
        <span className="lab">合计 {entries.length} 笔</span>
        <span className="sum num">
          <small>¥</small>
          {formatYuan(total)}
        </span>
      </div>
      <div className="erows">
        {entries.map((entry) => {
          const tone = categoryChipStyle(entry.category);
          return (
            <div className="erow" key={entry.key}>
              <div className="erow-main">
                <span className="ic" style={{ background: tone.background, color: tone.color }}>
                  <Glyph name={categoryGlyph(entry.category)} size={18} />
                </span>
                <span className="meta">
                  <input
                    className="etitle"
                    aria-label={`${entry.title || "备注"}的备注`}
                    value={entry.title}
                    onChange={(event) => onChange(entry.key, { title: event.target.value })}
                  />
                  <button type="button" className="esub" onClick={() => onPick(entry.key)}>
                    {categoryName(entry.category)} · {entry.subcategory}
                  </button>
                </span>
                <label className="eamt num">
                  <span>¥</span>
                  <input
                    inputMode="decimal"
                    aria-label={`${entry.title || "这笔"}的金额`}
                    value={entry.amount}
                    onChange={(event) => onChange(entry.key, { amount: event.target.value })}
                  />
                </label>
                <button type="button" className="edel" aria-label={`删除${entry.title || "这笔"}`} onClick={() => onRemove(entry.key)}>
                  ×
                </button>
              </div>
              {picking === entry.key && (
                <CategoryPicker
                  category={entry.category}
                  subcategory={entry.subcategory}
                  onCategory={(category) =>
                    onChange(entry.key, {
                      category,
                      subcategory: category === entry.category ? entry.subcategory : defaultPick(category, recordedAt),
                    })
                  }
                  onSubcategory={(subcategory) => {
                    onChange(entry.key, { subcategory });
                    onPick(entry.key);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="go" onClick={onCommit} disabled={!canSave}>
        确认记账
      </button>
      <button type="button" className="again" onClick={onAgain}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
        </svg>
        重新说一遍
      </button>
    </>
  );
}
