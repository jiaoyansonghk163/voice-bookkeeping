"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BottomNav } from "@/components/bottom-nav";
import { DetailScreen } from "@/components/detail-screen";
import { HomeScreen } from "@/components/home-screen";
import { InsightsScreen } from "@/components/insights-screen";
import { VoiceSheet } from "@/components/voice-sheet";
import { StoreProvider, useStore } from "@/lib/store";
import type { ParsedExpense } from "@/lib/types";

type Route = { name: "home" } | { name: "categories" } | { name: "detail"; id: string };

function parsePath(path: string): { route: Route; replace?: string } {
  if (path === "/" || path === "") return { route: { name: "home" } };
  if (path === "/categories") return { route: { name: "categories" } };
  const match = path.match(/^\/tx\/([^/]+)\/?$/);
  if (match) return { route: { name: "detail", id: decodeURIComponent(match[1]) } };
  return { route: { name: "home" }, replace: "/" };
}

function hrefFor(route: Route): string {
  if (route.name === "categories") return "/categories";
  if (route.name === "detail") return `/tx/${encodeURIComponent(route.id)}`;
  return "/";
}

function routeKey(route: Route): string {
  return route.name === "detail" ? `detail:${route.id}` : route.name;
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
  const reduceMotion = useReducedMotion() === true;
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [mounted, setMounted] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceSession, setVoiceSession] = useState(0);
  const [now] = useState(() => new Date());

  useEffect(() => {
    const parsed = parsePath(window.location.pathname);
    if (parsed.replace) window.history.replaceState(null, "", parsed.replace);
    setRoute(parsed.route);
    setMounted(true);
    const onPop = () => setRoute(parsePath(window.location.pathname).route);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((next: Route, scroll = true) => {
    const href = hrefFor(next);
    if (window.location.pathname !== href) window.history.pushState(null, "", href);
    setRoute(next);
    if (scroll) window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [reduceMotion]);

  const openVoice = () => {
    setVoiceSession((value) => value + 1);
    setVoiceOpen(true);
  };

  const commitVoice = (expense: ParsedExpense) => {
    store.add(expense);
    go({ name: "home" }, false);
  };

  const showNav = route.name === "home" || route.name === "categories";
  const ready = mounted && store.ready;

  let screen = null;
  if (route.name === "home") {
    screen = (
      <HomeScreen
        transactions={store.transactions}
        now={now}
        highlightId={store.highlightId}
        onOpen={(id) => go({ name: "detail", id })}
      />
    );
  } else if (route.name === "categories") {
    screen = <InsightsScreen transactions={store.transactions} now={now} onReset={store.reset} />;
  } else {
    const transaction = store.transactions.find((item) => item.id === route.id) ?? null;
    screen = <DetailScreen transaction={transaction} now={now} onBack={() => go({ name: "home" })} />;
  }

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[420px]">
      {!ready ? (
        <div className="grid min-h-dvh place-items-center">
          <p className="text-[15px] font-medium tracking-wide text-white/80">璃记</p>
        </div>
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.main
              key={routeKey(route)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={
                reduceMotion
                  ? { duration: 0.01 }
                  : { type: "spring", stiffness: 380, damping: 36 }
              }
              className={showNav ? "pb-28" : "pb-12"}
            >
              {screen}
            </motion.main>
          </AnimatePresence>
            {showNav && (
              <BottomNav
                current={route.name}
                onChange={(next) => go(next === "home" ? { name: "home" } : { name: "categories" })}
                onVoice={openVoice}
              />
            )}
            <VoiceSheet
              key={voiceSession}
              open={voiceOpen}
              onClose={() => setVoiceOpen(false)}
              onCommit={commitVoice}
            />
          </>
      )}
    </div>
  );
}
