"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Glyph, categoryChipStyle, categoryGlyph, categoryName } from "@/components/glyphs";
import { captureMode, speechRecognitionSupported, startListening, type ListenSession } from "@/lib/asr";
import { CATEGORY_ORDER } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatDetailStamp, formatYuan } from "@/lib/format";
import { parseTranscript } from "@/lib/parse-transcript";
import type { CategoryId, ParsedExpense } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const WAVE = [6, 8, 12, 18, 26, 34, 28, 40, 48, 36, 30, 44, 52, 42, 34, 26, 38, 46, 32, 24, 30, 20, 14, 18, 12, 8, 10, 6, 5, 4];

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
  onCommit: (expense: ParsedExpense, at: Date) => void;
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
  const [draft, setDraft] = useState<ParsedExpense | null>(null);
  const [recordedAt, setRecordedAt] = useState<Date>(() => new Date());
  const [category, setCategory] = useState<CategoryId>("food");
  const [picking, setPicking] = useState(false);
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
    setDraft(parsed);
    setCategory(parsed.category);
    setRecordedAt(new Date());
    setPicking(false);
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
    setDraft(null);
    setPicking(false);
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
          aria-label={phase === "review" ? "确认这笔账" : capture === "type" ? "手动输入" : "正在聆听"}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={motionProps}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="grab" />
          {phase === "review" && draft ? (
            <Confirm
              draft={draft}
              when={formatDetailStamp(recordedAt, recordedAt)}
              category={category}
              picking={picking}
              onPick={() => setPicking((value) => !value)}
              onCategory={(next) => {
                setCategory(next);
                setPicking(false);
              }}
              onClose={requestClose}
              onAgain={() => setRun((value) => value + 1)}
              onCommit={() => onCommit({ ...draft, category }, recordedAt)}
            />
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

function Confirm({
  draft,
  when,
  category,
  picking,
  onPick,
  onCategory,
  onClose,
  onAgain,
  onCommit,
}: {
  draft: ParsedExpense;
  when: string;
  category: CategoryId;
  picking: boolean;
  onPick: () => void;
  onCategory: (category: CategoryId) => void;
  onClose: () => void;
  onAgain: () => void;
  onCommit: () => void;
}) {
  const amount = formatYuan(draft.amount);
  const chip = categoryChipStyle(category);

  return (
    <>
      <div className="shead">
        <h2>确认这笔账</h2>
        <button type="button" className="x" aria-label="关闭" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="heard">听到：「{draft.transcript}」</div>
      <div className="hero rise">
        <div className="lab">支出金额</div>
        <div className="sum num">
          <small>¥</small>
          {amount}
        </div>
      </div>
      <div className="card panel rise" style={{ animationDelay: ".05s" }}>
        <button type="button" className="f" onClick={onPick}>
          <span className="k">分类</span>
          <span className="v">
            <span className="chip" style={chip}>
              <Glyph name={categoryGlyph(category)} size={16} strokeWidth={2} />
              {categoryName(category)}
            </span>
            <Chevron />
          </span>
        </button>
        {picking && (
          <div className="picker">
            {CATEGORY_ORDER.map((id) => (
              <button key={id} type="button" className={cn(id === category && "on")} onClick={() => onCategory(id)}>
                {categoryName(id)}
              </button>
            ))}
          </div>
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
            {draft.title}
            <Chevron />
          </span>
        </div>
      </div>
      <button type="button" className="go" onClick={onCommit}>
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
