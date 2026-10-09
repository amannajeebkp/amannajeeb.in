import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fxEnabled, isTouchDevice } from "../lib/fx";

/** Film grain over everything — makes the shader read as light, not a gradient. */
export function Grain() {
  if (!fxEnabled) return null;
  return <div aria-hidden="true" className="nj-grain fixed inset-0 pointer-events-none z-[8000]" />;
}

/**
 * One-time hint so a first-time visitor knows the board is a playground.
 * Disappears on the first interaction or after a few seconds.
 */
export function HintPill({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    let seen = false;
    try { seen = localStorage.getItem("nj_hint_seen") === "1"; } catch { /* ignore */ }
    if (seen) return;
    const t = setTimeout(() => setVisible(true), 1800);
    const hide = () => {
      setVisible(false);
      try { localStorage.setItem("nj_hint_seen", "1"); } catch { /* ignore */ }
    };
    const t2 = setTimeout(hide, 9000);
    const onAct = () => hide();
    window.addEventListener("pointerdown", onAct, { once: true });
    window.addEventListener("wheel", onAct, { once: true, passive: true });
    window.addEventListener("keydown", onAct, { once: true });
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener("pointerdown", onAct);
      window.removeEventListener("wheel", onAct);
      window.removeEventListener("keydown", onAct);
    };
  }, [show]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-8 z-[7000] pointer-events-none"
        >
          <div className="font-mono text-[11px] sm:text-xs text-white/70 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 whitespace-nowrap">
            {isTouchDevice ? "drag the board, tap the stickers, swipe the cards" : "drag the board, click the stickers, scroll the cards"}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useDubaiClock() {
  const fmt = () =>
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" }).format(new Date());
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 15000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/** Top-left identity strip: who this is, where, and that it's live right now. */
export function StatusStrip({ name, role }: { name: string; role: string }) {
  const time = useDubaiClock();
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 left-4 sm:top-6 sm:left-6 z-[7000] pointer-events-none select-none font-mono"
    >
      <div className="flex items-center gap-2.5 text-[11px] sm:text-xs leading-none">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#f1ff29] opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f1ff29]" />
        </span>
        <span className="text-white font-semibold tracking-tight">{name}</span>
        <span className="text-white/40 hidden sm:inline">{role}</span>
      </div>
      <div className="mt-1.5 text-[10px] sm:text-[11px] text-white/35 tabular-nums pl-[18px]">
        Dubai {time}
      </div>
    </motion.div>
  );
}

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Hidden delights: Konami code → Lego rain + confetti; tab title nudges you back. */
export function useEasterEggs() {
  useEffect(() => {
    let pos = 0;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = k === KONAMI[pos] ? pos + 1 : k === KONAMI[0] ? 1 : 0;
      if (pos === KONAMI.length) {
        pos = 0;
        window.dispatchEvent(new Event("nj:burst"));
        window.dispatchEvent(new Event("nj:lego"));
      }
    };
    window.addEventListener("keydown", onKey);

    const original = document.title;
    const onVis = () => {
      document.title = document.hidden ? "come back 👀 — NJ's Home" : original;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      document.title = original;
    };
  }, []);
}
