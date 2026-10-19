"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Amount } from "@/components/amount";
import { Waveform } from "@/components/waveform";
import { DEMO_PHRASES, createSpeechRecognizer, type SpeechRecognizer } from "@/lib/asr";
import { CATEGORIES, CATEGORY_ORDER, categoryLabel } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { parseTranscript } from "@/lib/parse-transcript";
import type { CategoryId, ParsedExpense } from "@/lib/types";

type Phase = "idle" | "listening" | "transcribing" | "review" | "success" | "error";

const sheetSpring = { type: "spring" as const, stiffness: 380, damping: 36, mass: 0.85 };
const easeOut = [0.22, 1, 0.36, 1] as const;

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
  const confirming = useRef(false);
  const onCloseRef = useRef(onClose);
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [draft, setDraft] = useState<ParsedExpense | null>(null);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [errorText, setErrorText] = useState("没有听清金额，再说一次吧");

  if (recognizer.current == null) recognizer.current = createSpeechRecognizer();
  onCloseRef.current = onClose;

  const requestClose = () => {
    session.current += 1;
    abortRef.current?.abort();
    onCloseRef.current();
  };

  useEffect(() => {
    return () => {
      session.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (phase !== "transcribing" || !transcript) return;
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
    }, 48);
    return () => window.clearInterval(timer);
  }, [phase, transcript, reduceMotion]);

  useEffect(() => {
    if (phase !== "transcribing" || !transcript || typed !== transcript) return;
    const timer = window.setTimeout(() => {
      const parsed = parseTranscript(transcript);
      if (!parsed.ok) {
        setErrorText("没有听清金额，再说一次吧");
        setPhase("error");
        return;
      }
      setDraft({
        amount: parsed.amount,
        title: parsed.title,
        category: parsed.category,
        transcript: parsed.transcript,
      });
      setPhase("review");
    }, reduceMotion ? 0 : 280);
    return () => window.clearTimeout(timer);
  }, [phase, transcript, typed, reduceMotion]);

  const start = (hint?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    confirming.current = false;
    setDraft(null);
    setErrorText("没有听清金额，再说一次吧");
    setTranscript("");
    setTyped("");
    setCategoryTouched(false);
    setPhase("listening");

    recognizer.current
      ?.recognize({
        hint,
        signal: controller.signal,
        delayMs: reduceMotion ? 200 : 1500,
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setTranscript(result.transcript);
        setPhase("transcribing");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorText("这次没有识别成功");
        setPhase("error");
      });
  };

  const confirm = () => {
    if (!draft || phase !== "review" || confirming.current) return;
    confirming.current = true;
    setPhase("success");
    const token = session.current;
    window.setTimeout(() => {
      if (session.current !== token) return;
      onCommit(draft);
      onClose();
    }, reduceMotion ? 220 : 1200);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40" data-screen="voice" data-phase={phase}>
          <motion.button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={requestClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="语音记账"
            className="sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(740px,92dvh)] w-full max-w-[420px] flex-col overflow-y-auto px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            initial={{ y: "108%" }}
            animate={{ y: 0 }}
            exit={{ y: "108%" }}
            transition={reduceMotion ? { duration: 0.01 } : sheetSpring}
          >
            <div className="mx-auto mt-2 mb-3 h-1.5 w-9 rounded-full bg-black/15" />
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] text-quiet">语音记账</p>
              <button type="button" onClick={requestClose} aria-label="关闭" className="grid size-8 place-items-center text-quiet">
                <X size={18} />
              </button>
            </div>

            <div className="pb-2">
              <AnimatePresence mode="wait">
                {phase === "idle" && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: easeOut }}
                  >
                    <h2 className="mt-3 text-center text-[34px] font-medium tracking-tight">说一笔</h2>
                    <p className="mx-auto mt-2 max-w-[16em] text-center text-[15px] leading-6 text-quiet">
                      点麦克风开始。演示识别不会采集声音。
                    </p>
                    <div className="mt-6 flex justify-center">
                      <ListenButton active={false} onClick={() => start()} label="开始聆听" />
                    </div>
                    <p className="mt-8 px-1 text-[13px] text-quiet">或选一句示例</p>
                    <div className="mt-1">
                      {DEMO_PHRASES.map((phrase) => {
                        const parsed = parseTranscript(phrase);
                        return (
                          <button
                            key={phrase}
                            type="button"
                            onClick={() => start(phrase)}
                            className="hairline flex w-full items-center justify-between py-3.5 text-left active:bg-black/4"
                          >
                            <span className="text-[16px]">{phrase}</span>
                            {parsed.ok && (
                              <span className="font-num text-[15px] text-quiet">{parsed.amount.toFixed(2)}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {phase === "listening" && (
                  <motion.div
                    key="listening"
                    className="flex flex-col items-center"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <h2 className="mt-8 text-[34px] font-medium">正在听</h2>
                    <p className="mt-2 text-[14px] text-quiet">演示识别 · 不会上传语音</p>
                    <div className="mt-8">
                      <Waveform />
                    </div>
                    <div className="mt-6">
                      <ListenButton active onClick={() => undefined} label="正在聆听" />
                    </div>
                  </motion.div>
                )}

                {phase === "transcribing" && (
                  <motion.div
                    key="transcribing"
                    className="flex flex-col items-center"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <h2 className="mt-8 text-[34px] font-medium">正在识别</h2>
                    <p className="mt-8 min-h-16 text-center text-[28px] leading-snug" aria-live="polite">
                      「{typed}
                      <span className="caret" />」
                    </p>
                  </motion.div>
                )}

                {phase === "review" && draft && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 340, damping: 30 }}
                  >
                    <p className="mt-1 text-center text-[13px] text-quiet">确认这笔</p>
                    <Amount value={draft.amount} size="xl" className="mt-3 text-center" />
                    <h2 className="mt-4 text-center text-[32px] font-medium tracking-tight">{draft.title}</h2>
                    <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-white/55 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: CATEGORIES[draft.category].tint }}
                      />
                      <span className="text-[15px] font-medium">{categoryLabel(draft.category)}</span>
                      <span className="text-[13px] text-quiet">{categoryTouched ? "已改分类" : "自动分类"}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {CATEGORY_ORDER.map((category) => {
                        const active = draft.category === category;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setDraft((current) => (current ? { ...current, category } : current));
                              setCategoryTouched(true);
                            }}
                            className={cn(
                              "rounded-full px-3 py-1.5 text-[13px]",
                              active ? "bg-[#007aff]/12 font-medium text-blue" : "bg-black/5 text-ink",
                            )}
                          >
                            {CATEGORIES[category].label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-5 text-center text-[18px] leading-relaxed">「{draft.transcript}」</p>
                    <p className="text-center text-[12px] text-quiet">原话</p>
                    <div className="mt-6 grid grid-cols-[0.8fr_1.2fr] gap-3">
                      <button type="button" onClick={() => start()} className="btn-plain h-[50px] rounded-[14px] text-[17px]">
                        再说一次
                      </button>
                      <button type="button" onClick={confirm} className="btn-fill h-[50px] rounded-[14px] text-[17px] font-medium">
                        确认记入
                      </button>
                    </div>
                  </motion.div>
                )}

                {phase === "success" && draft && (
                  <motion.div
                    key="success"
                    className="flex flex-col items-center pt-16 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 420, damping: 18 }}
                      className="grid size-[72px] place-items-center rounded-full bg-blue text-white"
                    >
                      <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden>
                        <motion.path
                          d="M5 12.5l4.2 4.2L19 7.5"
                          stroke="white"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: reduceMotion ? 1 : 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, ease: easeOut, delay: 0.05 }}
                        />
                      </svg>
                    </motion.div>
                    <p className="mt-6 text-[13px] text-quiet">记好了</p>
                    <h2 className="mt-1 text-[30px] font-medium">已记入{categoryLabel(draft.category)}</h2>
                    <Amount value={draft.amount} size="md" className="mt-4" />
                  </motion.div>
                )}

                {phase === "error" && (
                  <motion.div key="error" className="pt-10 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h2 className="text-[32px] font-medium">没有听清</h2>
                    <p className="mx-auto mt-3 max-w-[16em] text-[15px] leading-6 text-quiet">{errorText}</p>
                    {transcript && <p className="mt-4 text-[18px]">「{transcript}」</p>}
                    <button type="button" onClick={() => setPhase("idle")} className="btn-fill mt-8 h-[50px] w-full rounded-[14px] text-[17px]">
                      再说一次
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ListenButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <div className="relative grid place-items-center">
      {active &&
        [0, 1].map((ring) => (
          <motion.span
            key={ring}
            className="absolute size-[72px] rounded-full border border-[#007aff]/30"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.55, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: ring * 0.45, ease: "easeOut" }}
          />
        ))}
      <motion.button
        type="button"
        aria-label={label}
        onClick={onClick}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="btn-fill relative grid size-[72px] place-items-center rounded-full"
      >
        <Mic size={34} strokeWidth={1.75} className="relative" />
      </motion.button>
    </div>
  );
}
