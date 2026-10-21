"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LedgerState } from "@/lib/backup";
import { createSaveGate } from "@/lib/save-once";
import { AllScreen, HomeScreen } from "@/components/home-screen";
import { BottomNav, MicButton, type TabId } from "@/components/bottom-nav";
import { BudgetScreen } from "@/components/budget-screen";
import { DetailScreen } from "@/components/detail-screen";
import { MeScreen } from "@/components/me-screen";
import { StatsScreen } from "@/components/stats-screen";
import { VoiceSheet } from "@/components/voice-sheet";
import { StoreProvider, useStore } from "@/lib/store";
import type { CategoryId, ParsedExpense, Transaction } from "@/lib/types";

type Route =
  | { name: "home" }
  | { name: "stats" }
  | { name: "budget" }
  | { name: "me" }
  | { name: "all" }
  | { name: "detail"; id: string };

function parsePath(path: string): { route: Route; replace?: string } {
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (normalized === "/" || normalized === "") return { route: { name: "home" } };
  path = normalized;
  if (path === "/stats" || path === "/categories") return { route: { name: "stats" } };
  if (path === "/budget") return { route: { name: "budget" } };
  if (path === "/me") return { route: { name: "me" } };
  if (path === "/all") return { route: { name: "all" } };
  const match = path.match(/^\/tx\/([^/]+)\/?$/);
  if (match) return { route: { name: "detail", id: decodeURIComponent(match[1]) } };
  return { route: { name: "home" }, replace: "/" };
}

function hrefFor(route: Route): string {
  if (route.name === "stats") return "/stats";
  if (route.name === "budget") return "/budget";
  if (route.name === "me") return "/me";
  if (route.name === "all") return "/all";
  if (route.name === "detail") return `/tx/${encodeURIComponent(route.id)}`;
  return "/";
}

function tabFor(route: Route): TabId {
  if (route.name === "stats") return "stats";
  if (route.name === "me" || route.name === "budget") return "me";
  return "home";
}

export function LedgerApp() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const store = useStore();
  const scrollRef = useRef<HTMLElement>(null);
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [mounted, setMounted] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceSession, setVoiceSession] = useState(0);
  const [presetCategory, setPresetCategory] = useState<CategoryId | null>(null);
  const [toast, setToast] = useState<
    { kind: "delete"; transaction: Transaction } | { kind: "added"; transactions: Transaction[] } | null
  >(null);
  const toastTimer = useRef<number | null>(null);
  const saveGate = useRef(createSaveGate());
  const [now] = useState(() => new Date());
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const hadController = navigator.serviceWorker.controller != null;
    let reloaded = false;
    const onChange = () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    if (hadController) navigator.serviceWorker.addEventListener("controllerchange", onChange);
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* the static shell still works online if the worker cannot install */
    });
    return () => {
      if (hadController) navigator.serviceWorker.removeEventListener("controllerchange", onChange);
    };
  }, []);

  useEffect(() => {
    const parsed = parsePath(window.location.pathname);
    if (parsed.replace) window.history.replaceState(null, "", parsed.replace);
    setRoute(parsed.route);
    setMounted(true);
    const onPop = () => setRoute(parsePath(window.location.pathname).route);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((next: Route) => {
    const href = hrefFor(next);
    if (window.location.pathname !== href) window.history.pushState(null, "", href);
    setRoute(next);
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const openVoice = (category?: CategoryId) => {
    setPresetCategory(typeof category === "string" ? category : null);
    setVoiceSession((value) => value + 1);
    setVoiceOpen(true);
  };

  const showToast = (
    next: { kind: "delete"; transaction: Transaction } | { kind: "added"; transactions: Transaction[] },
  ) => {
    setToast(next);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };

  const deleteTransaction = (transaction: Transaction) => {
    store.remove(transaction.id);
    showToast({ kind: "delete", transaction });
  };

  const undoToast = () => {
    if (!toast) return;
    if (toast.kind === "delete") store.restore(toast.transaction);
    else {
      for (const transaction of toast.transactions) store.remove(transaction.id);
    }
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(null);
  };

  const commitVoice = (expenses: ParsedExpense[], at: Date) => {
    if (expenses.length === 0) return;
    if (!saveGate.current.claim(`voice-${voiceSession}`)) return;
    const saved = store.addMany(expenses, at);
    setVoiceOpen(false);
    go({ name: "home" });
    showToast({ kind: "added", transactions: saved });
  };

  const ready = mounted && store.ready;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => setHeaderScrolled(node.scrollTop > 1);
    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [ready, route.name]);
  const showChrome = route.name !== "detail";
  const monthTitle = `${now.getMonth() + 1} 月账本`;
  const title =
    route.name === "stats"
      ? "统计"
      : route.name === "budget"
        ? "预算"
        : route.name === "me"
          ? "我的"
          : route.name === "all"
            ? "全部账单"
            : route.name === "detail"
              ? "明细"
              : monthTitle;
  const showChevron = route.name === "home";
  const showBack = route.name === "detail" || route.name === "all";

  let screen = null;
  if (route.name === "home") {
    screen = (
      <HomeScreen
        transactions={store.transactions}
        now={now}
        monthlyBudget={store.monthlyBudget}
        highlightIds={store.highlightIds}
        onOpen={(id) => go({ name: "detail", id })}
        onOpenAll={() => go({ name: "all" })}
        onQuick={(category) => openVoice(category)}
        onDelete={deleteTransaction}
      />
    );
  } else if (route.name === "all") {
    screen = (
      <AllScreen
        transactions={store.transactions}
        now={now}
        highlightIds={store.highlightIds}
        onOpen={(id) => go({ name: "detail", id })}
        onDelete={deleteTransaction}
      />
    );
  } else if (route.name === "stats") {
    screen = <StatsScreen transactions={store.transactions} now={now} />;
  } else if (route.name === "budget") {
    screen = (
      <BudgetScreen
        transactions={store.transactions}
        now={now}
        monthlyBudget={store.monthlyBudget}
        onSave={store.setMonthlyBudget}
      />
    );
  } else if (route.name === "me") {
    const ledger: LedgerState = { transactions: store.transactions, monthlyBudget: store.monthlyBudget };
    screen = (
      <MeScreen
        ledger={ledger}
        demoOn={store.transactions.some((item) => item.source === "sample")}
        onLoadDemo={store.loadDemo}
        onClearDemo={store.clearDemo}
        onImport={store.replaceLedger}
        onOpenBudget={() => go({ name: "budget" })}
      />
    );
  } else {
    const transaction = store.transactions.find((item) => item.id === route.id) ?? null;
    screen = <DetailScreen transaction={transaction} now={now} />;
  }

  return (
    <div className="app">
      <div className="ambient" />
      {!ready ? (
        <div className="boot">语音记账</div>
      ) : (
        <>
          <header className={headerScrolled ? "top scrolled" : "top"}>
            <div className="hrow">
              <div>
                <h1>
                  {showBack && (
                    <button type="button" className="back" aria-label="返回" onClick={() => go({ name: "home" })}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 6l-6 6 6 6" />
                      </svg>
                    </button>
                  )}
                  {title}
                  {showChevron && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </h1>
              </div>
              <button type="button" className="avatar" aria-label="我的" onClick={() => go({ name: "me" })}>
                CA
              </button>
            </div>
          </header>

          <main ref={scrollRef} className={showChrome ? "scroll" : "scroll plain"} data-screen={route.name}>
            {screen}
          </main>

          {showChrome && <div className="fade" />}
          {showChrome && <MicButton onClick={() => openVoice()} />}
          {showChrome && <BottomNav current={tabFor(route)} onChange={(tab) => go({ name: tab })} />}

          <VoiceSheet
            key={voiceSession}
            open={voiceOpen}
            presetCategory={presetCategory}
            onClose={() => setVoiceOpen(false)}
            onCommit={commitVoice}
          />
          {toast ? (
            <div className="toast" role="status">
              <span>{toast.kind === "delete" ? `已删除 ${toast.transaction.title}` : `已记入 ${toast.transactions.length} 笔`}</span>
              <button type="button" onClick={undoToast}>
                撤销
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
