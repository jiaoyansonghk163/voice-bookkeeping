"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Glyph, categoryChipStyle, categoryGlyph, categoryName } from "@/components/glyphs";
import { createSpeechRecognizer, type SpeechRecognizer } from "@/lib/asr";
import { CATEGORY_ORDER } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { formatYuan } from "@/lib/format";
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

function LiveTranscript({ text, done }: { text: string; done: boolean }) {
  if (!text) {
    return (
      <div className="transcript">
        <span className="cur" />
      </div>
    );
  }
  if (!done) {
    return (
      <div className="transcript">
        {text}
        <span className="cur" />
      </div>
    );
  }
  return (
    <div className="transcript">
      {text.slice(0, -1)}
      <span className="q">{text.slice(-1)}</span>
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
  onCommit: (expense: ParsedExpense) => void;
}) {
  const reduceMotion = useReducedMotion() === true;
  const recognizer = useRef<SpeechRecognizer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const session = useRef(0);
  const pendingFinish = useRef(false);
  const onCloseRef = useRef(onClose);
  const [phase, setPhase] = useState<"listening" | "review" | "error">("listening");
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [draft, setDraft] = useState<ParsedExpense | null>(null);
  const [category, setCategory] = useState<CategoryId>("food");
  const [picking, setPicking] = useState(false);
  const [run, setRun] = useState(0);

  if (recognizer.current == null) recognizer.current = createSpeechRecognizer();
  onCloseRef.current = onClose;

  const requestClose = () => {
    session.current += 1;
    abortRef.current?.abort();
    onCloseRef.current();
  };

  const goReview = (text: string) => {
    const parsed = parseTranscript(text);
    if (!parsed.ok) {
      setPhase("error");
      return;
    }
    setDraft(parsed);
    setCategory(parsed.category);
    setPicking(false);
    setPhase("review");
  };

  const finish = () => {
    if (transcript) {
      goReview(transcript);
      return;
    }
    pendingFinish.current = true;
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
    pendingFinish.current = false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("listening");
    setTranscript("");
    setTyped("");
    setDraft(null);
    setPicking(false);

    recognizer.current?.recognize({ signal: controller.signal, delayMs: reduceMotion ? 200 : 700 }).then(
      (result) => {
        if (session.current !== id) return;
        setTranscript(result.transcript);
        if (pendingFinish.current) {
          pendingFinish.current = false;
          const parsed = parseTranscript(result.transcript);
          if (!parsed.ok) {
            setPhase("error");
            return;
          }
          setDraft(parsed);
          setCategory(parsed.category);
          setPhase("review");
        }
      },
      (error: unknown) => {
        if (session.current !== id) return;
        if (error instanceof Error && error.name === "AbortError") return;
        setPhase("error");
      },
    );

    return () => {
      session.current += 1;
      controller.abort();
    };
  }, [open, run, reduceMotion]);

  useEffect(() => {
    if (phase !== "listening" || !transcript) return;
    if (reduceMotion) {
      setTyped(transcript);
      return;
    }
    setTyped("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(transcript.slice(0, index));
      if (index >= transcript.length) window.clearInterval(timer);
    }, 55);
    return () => window.clearInterval(timer);
  }, [phase, transcript, reduceMotion]);

  const done = Boolean(transcript) && typed === transcript;
  const motionProps = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.3, ease: EASE };

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
          aria-label={phase === "review" ? "确认这笔账" : "正在聆听"}
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
              category={category}
              picking={picking}
              onPick={() => setPicking((value) => !value)}
              onCategory={(next) => {
                setCategory(next);
                setPicking(false);
              }}
              onClose={requestClose}
              onAgain={() => setRun((value) => value + 1)}
              onCommit={() => onCommit({ ...draft, category })}
            />
          ) : phase === "error" ? (
            <>
              <div className="shead">
                <h2>没有听清</h2>
                <button type="button" className="x" aria-label="关闭" onClick={requestClose}>
                  <CloseIcon />
                </button>
              </div>
              <div className="hint">再说一次，带上用途和金额</div>
              <div className="ctrl">
                <button type="button" className="tbtn l" onClick={requestClose}>
                  取消
                </button>
                <button type="button" className="stop" aria-label="重新说" onClick={() => setRun((value) => value + 1)}>
                  <i />
                </button>
                <button type="button" className="tbtn r" onClick={() => setRun((value) => value + 1)}>
                  重说
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="shead">
                <div className="listen">
                  <span className="dot" />
                  正在聆听…
                </div>
                <button type="button" className="x" aria-label="关闭" onClick={requestClose}>
                  <CloseIcon />
                </button>
              </div>
              <LiveTranscript text={typed} done={done} />
              <div className="hint">说出用途和金额，比如「打车二十五」</div>
              <div className="wave" aria-hidden="true">
                {WAVE.map((height, index) => (
                  <i key={index} style={{ height, opacity: index > 22 ? 0.35 : 0.85 }} />
                ))}
              </div>
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
  category,
  picking,
  onPick,
  onCategory,
  onClose,
  onAgain,
  onCommit,
}: {
  draft: ParsedExpense;
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
            今天 12:30
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
