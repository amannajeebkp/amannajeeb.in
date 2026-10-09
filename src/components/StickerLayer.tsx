import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import StickerEl from "./Sticker";
import LegoRain from "./LegoRain";
import Typewriter from "./Typewriter";
import { track } from "../lib/track";
import { stickers as localStickers } from "../data/loader";
import {
  subscribeAdminUpdate,
  getStickers as getAdminStickers,
  saveStickers,
  KEYS,
  DEFAULT_SETTINGS,
  type SiteSettings,
} from "../admin/store";
import { deleteStickerImage } from "../lib/optimizeImage";
import type { HotTake, Sticker as StickerData } from "../data/types";

const toWaLink = (num: string) => `https://wa.me/${(num || "").replace(/[^0-9]/g, "")}`;

export interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface BubbleState {
  stickerId: string;
  content: React.ReactNode;
}

const CANVAS_W = 672;
const BUBBLE_DISMISS_MS = 3000;

const StickerLayer: React.FC<{
  hotTakes: HotTake[];
  onThumbsUp: () => void;
  onReady?: () => void;
  onOpenCalendly: () => void;
  onOpenEmail: () => void;
  onEditingChange?: (editing: boolean) => void;
  zoom: number;
  deviceMode?: "desktop" | "mobile";
  settings?: SiteSettings;
}> = ({
  hotTakes,
  onThumbsUp,
  onReady,
  onOpenCalendly,
  onOpenEmail,
  onEditingChange: _onEditingChange,
  zoom,
  deviceMode,
  settings = DEFAULT_SETTINGS,
}) => {
  const [stickers, setStickers] = useState<StickerData[]>([]);
  const isEditMode = typeof window !== "undefined" && window.location.search.includes("edit");
  const isMobile =
    deviceMode === "mobile" ||
    (!deviceMode && typeof window !== "undefined" && window.innerWidth < 672);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [bubble, setBubble] = useState<BubbleState | null>(null);
  const [auraCount, setAuraCount] = useState<number | null>(null);
  const [auraBadgeVisible, setAuraBadgeVisible] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  // animation state flags
  const [driving, setDriving] = useState<string | null>(null); // bike
  const [walking, setWalking] = useState<string | null>(null); // shoe
  const [spinning, setSpinning] = useState<string | null>(null); // sun
  const [fastSpinning, setFastSpinning] = useState<string | null>(null); // head
  const [recordSpinning, setRecordSpinning] = useState<string | null>(null); // ray/vinyl toggle
  const [wiggling, setWiggling] = useState<string | null>(null); // bottle / idle
  const [falling, setFalling] = useState<string | null>(null); // thug
  const [flying, setFlying] = useState<string | null>(null); // airplane
  const [bouncing] = useState<string | null>(null);
  const [legoRaining, setLegoRaining] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);


  const audioRefs = {
    radio: useRef<HTMLAudioElement | null>(null),
    thug: useRef<HTMLAudioElement | null>(null),
    marlie: useRef<HTMLAudioElement | null>(null),
    london: useRef<HTMLAudioElement | null>(null),
  };
  const [radioPlaying, setRadioPlaying] = useState(false);

  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auraReconcile = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivity = useRef(Date.now());
  const lastWiggle = useRef(0);
  const readyFired = useRef(false);

  // used-hot-take pools (no repeat until exhausted)
  const hatPool = useRef<string[]>([]);
  const dogPool = useRef<string[]>([]);

  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("mousemove", bump);
    window.addEventListener("click", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("touchstart", bump);
    window.addEventListener("scroll", bump);
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("click", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("touchstart", bump);
      window.removeEventListener("scroll", bump);
    };
  }, []);

  // aura count — bundled snapshot + optimistic increments
  useEffect(() => {
    fetch("/api/aura")
      .then((r) => (r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : Promise.reject()))
      .then((d) => setAuraCount(typeof d.count === "number" ? d.count : 0))
      .catch(() => {
        /* offline: starts at null until first click */
        import("../data/aura.json").then((m) => setAuraCount(m.default.count));
      });
  }, []);

  // idle wiggle scheduler
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const idleFor = now - lastActivity.current;
      const sinceWiggle = now - lastWiggle.current;
      if (
        idleFor >= 10000 &&
        sinceWiggle >= 10000 &&
        !wiggling &&
        stickers.length > 0 &&
        loaded.size > 0
      ) {
        const visibleStickers = stickers.filter((s) => loaded.has(s.id));
        if (visibleStickers.length > 0) {
          const pick =
            visibleStickers[Math.floor(Math.random() * visibleStickers.length)];
          if (
            pick.id !== driving &&
            pick.id !== falling &&
            pick.id !== flying &&
            pick.id !== walking &&
            pick.id !== spinning &&
            pick.id !== recordSpinning &&
            pick.id !== fastSpinning
          ) {
            console.log("Idle wiggle triggered for:", pick.name || pick.id);
            setWiggling(pick.id);
            lastWiggle.current = now;
            setTimeout(() => setWiggling(null), 1000);
          }
        }
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [
    stickers,
    loaded,
    wiggling,
    driving,
    falling,
    flying,
    walking,
    spinning,
    recordSpinning,
    fastSpinning,
  ]);

  useEffect(() => {
    if (!readyFired.current && stickers.length > 0 && loaded.size > 0) {
      readyFired.current = true;
      onReady?.();
    }
  }, [loaded, stickers.length, onReady]);

  // load stickers with staggered reveal after image load
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const load = async () => {
      let list: StickerData[] = [];

      if (isEditMode) {
        // In edit mode, check localStorage first for unsynced admin draft edits
        const saved = localStorage.getItem(KEYS.stickers);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
          } catch { /* ignore */ }
        }
      }

      // Fetch official cloud stickers from server
      try {
        const res = await fetch("/api/stickers-data", { cache: "no-store" });
        if (res.ok && (res.headers.get("content-type") || "").includes("json")) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // For visitors, ALWAYS strictly use server data
            // For edit mode, adopt server data if no local draft exists
            if (!isEditMode || list.length === 0) {
              list = data;
              if (isEditMode) {
                try { localStorage.setItem(KEYS.stickers, JSON.stringify(data)); } catch { /* ignore */ }
              }
            }
          }
        }
      } catch {
        /* offline or no API */
      }

      // Fallback to bundled stickers if offline/empty
      if (list.length === 0) list = localStickers;
      list = list.map((p) => ({ ...p, layer: p.layer || "front", image_x: undefined, image_y: undefined, image_width: undefined, height: null }));
      if (cancelled) return;
      setStickers(list);
      list.forEach((s, i) => {
        const img = new Image();
        const reveal = () => {
          const t = setTimeout(() => {
            setLoaded((prev) => {
              const next = new Set(prev);
              next.add(s.id);
              return next;
            });
          }, i * 50);
          timers.push(t);
        };
        img.onload = reveal;
        img.onerror = reveal;
        img.src = s.url;
        if (img.complete) {
          img.onload = null;
          img.onerror = null;
          reveal();
        }
      });
    };
    load();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeAdminUpdate((e) => {
      if (e.detail?.key === KEYS.stickers) {
        const updated = getAdminStickers().map((p) => ({ ...p, layer: p.layer || "front" }));
        setStickers(updated);
        setLoaded((prev) => {
          const next = new Set(prev);
          updated.forEach((s) => next.add(s.id));
          return next;
        });
      }
    });
    return unsub;
  }, []);


  const dismissBubbleSoon = useCallback((stickerId: string) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => {
      setBubble((b) => (b?.stickerId === stickerId ? null : b));
      bubbleTimer.current = null;
    }, BUBBLE_DISMISS_MS);
  }, []);

  const cancelBubbleDismiss = useCallback(() => {
    if (bubbleTimer.current) {
      clearTimeout(bubbleTimer.current);
      bubbleTimer.current = null;
    }
  }, []);

  const handleHover = useCallback(
    (stickerId: string, hovering: boolean) => {
      if (bubble && bubble.stickerId === stickerId) {
        if (hovering) cancelBubbleDismiss();
        else dismissBubbleSoon(bubble.stickerId);
      }
    },
    [bubble, cancelBubbleDismiss, dismissBubbleSoon],
  );

  const pushFloater = (text: string, x: number, y: number) => {
    const f: Floater = { id: Date.now(), x, y, text };
    setFloaters((prev) => [...prev, f]);
    setTimeout(() => {
      setFloaters((prev) => prev.filter((p) => p.id !== f.id));
    }, 2000);
  };

  const handleStickerDragEnd = useCallback(
    (id: string, delta: { x: number; y: number }) => {
      setStickers((prev) => {
        const next = prev.map((s) => {
          if (s.id !== id) return s;
          if (isMobile) {
            const curX = s.mobile_x ?? s.x;
            const curY = s.mobile_y ?? s.y;
            return {
              ...s,
              mobile_x: Math.round(curX + delta.x),
              mobile_y: Math.round(curY + delta.y),
            };
          } else {
            return {
              ...s,
              x: Math.round(s.x + delta.x),
              y: Math.round(s.y + delta.y),
            };
          }
        });
        // STRICTLY ONLY save to persistent storage and cloud in ?edit mode!
        // For regular visitors, sticker movements are never saved.
        if (isEditMode) {
          saveStickers(next);
        }
        return next;
      });
    },
    [isEditMode, isMobile],
  );

  const pickHotTake = (
    pool: React.MutableRefObject<string[]>,
    filter: (h: HotTake) => boolean,
  ): HotTake | null => {
    if (hotTakes.length === 0) return null;
    const matching = hotTakes.filter(filter);
    if (matching.length === 0) return null;
    const ids = new Set(matching.map((h) => h.id));
    let available = pool.current.filter((id) => ids.has(id));
    if (available.length === 0) available = matching.map((h) => h.id);
    const chosenId = available[Math.floor(Math.random() * available.length)];
    pool.current = available.filter((id) => id !== chosenId);
    return matching.find((h) => h.id === chosenId) ?? null;
  };

  const playAudio = (
    ref: React.MutableRefObject<HTMLAudioElement | null>,
    src: string,
    volume: number,
  ) => {
    try {
      if (!ref.current || ref.current.src !== new URL(src, window.location.href).href) {
        if (ref.current) {
          ref.current.pause();
          ref.current.src = "";
        }
        ref.current = new Audio(src);
        ref.current.volume = volume;
      }
      ref.current.currentTime = 0;
      ref.current.play().catch((e) => console.error("Audio play failed", e));
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    _onEditingChange?.(isEditMode);
    if (!isEditMode) return;
    const onWindowClick = (e: MouseEvent) => {
      if (e.target instanceof Element && !e.target.closest(".sticker-element")) {
        setSelectedId(null);
      }
    };
    window.addEventListener("pointerdown", onWindowClick);
    return () => window.removeEventListener("pointerdown", onWindowClick);
  }, [isEditMode, _onEditingChange]);

  const handleStickerUpdate = useCallback(
    (id: string, patch: Partial<StickerData>) => {
      if (!isEditMode) return;
      setStickers((prev) => {
        const next = prev.map((s) => {
          if (s.id !== id) return s;
          if (isMobile) {
            const mobilePatch: Partial<StickerData> = {};
            if (patch.x !== undefined) mobilePatch.mobile_x = patch.x;
            if (patch.y !== undefined) mobilePatch.mobile_y = patch.y;
            if (patch.width !== undefined) mobilePatch.mobile_width = patch.width;
            if (patch.rotation !== undefined) mobilePatch.mobile_rotation = patch.rotation;
            if (patch.layer !== undefined) mobilePatch.mobile_layer = patch.layer;
            if (patch.mobile_hidden !== undefined) mobilePatch.mobile_hidden = patch.mobile_hidden;
            const globalPatch = { ...patch };
            delete globalPatch.x;
            delete globalPatch.y;
            delete globalPatch.width;
            delete globalPatch.rotation;
            delete globalPatch.layer;
            delete globalPatch.mobile_hidden;
            return {
              ...s,
              ...globalPatch,
              ...mobilePatch,
              image_x: undefined,
              image_y: undefined,
              image_width: undefined,
              height: null,
            };
          } else {
            return {
              ...s,
              ...patch,
              image_x: undefined,
              image_y: undefined,
              image_width: undefined,
              height: null,
            };
          }
        });
        saveStickers(next);
        return next;
      });
    },
    [isEditMode, isMobile],
  );

  const handleStickerRemove = useCallback(
    (id: string) => {
      if (!isEditMode) return;
      setStickers((prev) => {
        const target = prev.find((s) => s.id === id);
        if (target?.url) {
          deleteStickerImage(target.url);
        }
        const next = prev.filter((s) => s.id !== id);
        saveStickers(next);
        return next;
      });
      setSelectedId(null);
      toast.success("Sticker removed permanently.");
    },
    [isEditMode],
  );

  const handleMoveLayer = useCallback(
    (id: string, dir: "forward" | "backward") => {
      if (!isEditMode) return;
      setStickers((prev) => {
        const next: StickerData[] = prev.map((s) => {
          if (s.id !== id) return s;
          const newLayer: "front" | "back" = dir === "forward" ? "front" : "back";
          if (isMobile) {
            return { ...s, mobile_layer: newLayer };
          } else {
            return { ...s, layer: newLayer };
          }
        });
        saveStickers(next);
        return next;
      });
    },
    [isEditMode, isMobile],
  );

  const handleClick = (s: StickerData, e: React.MouseEvent<HTMLDivElement>) => {
    const name = (s.name || "").toLowerCase();
    if (isEditMode) {
      setSelectedId(s.id);
    }
    console.log("Clicked sticker:", s.name, s.id);
    track("sticker_click", { sticker: s.name || s.id });

    if (bubble && bubble.stickerId !== s.id) {
      setBubble(null);
      cancelBubbleDismiss();
    }

    // Custom message from the editor wins over any built-in story below.
    const hasCustomText = !!(s.click_text && s.click_text.trim());
    const story = (content: React.ReactNode) => {
      if (hasCustomText) return;
      cancelBubbleDismiss();
      setBubble({ stickerId: s.id, content });
      dismissBubbleSoon(s.id);
    };
    const nudge = () => {
      if (hasCustomText) return;
      setWiggling(s.id);
      setTimeout(() => setWiggling(null), 1000);
    };
    if (hasCustomText) {
      cancelBubbleDismiss();
      setBubble({
        stickerId: s.id,
        content: <Typewriter text={s.click_text!} speed={10} />,
      });
      dismissBubbleSoon(s.id);
    }

    if (s.audio || s.audio_url) {
      try {
        const src = s.audio_url || s.audio;
        const customAudio = new Audio(src);
        customAudio.volume = 0.6;
        customAudio.play().catch((e) => console.error("Custom audio play failed", e));
      } catch (e) {
        console.error("Audio error:", e);
      }
    }

    if (name.includes("polaroid") || name.includes("camera")) {
      onThumbsUp?.();
      return;
    }

    if (name.includes("thumb") || name.includes("like")) {
      console.log("Thumbs up sticker clicked...");
      const fx = e.clientX + (Math.random() - 0.5) * 50;
      const fy = e.clientY - 30 + (Math.random() - 0.5) * 50;
      pushFloater("+1 aura", fx, fy);
      setAuraCount((c) => (c ?? 0) + 1);
      setAuraBadgeVisible(true);
      if (auraReconcile.current) clearTimeout(auraReconcile.current);
      const badgeTimeout = setTimeout(() => setAuraBadgeVisible(false), 3000);
      fetch("/api/aura", { method: "POST" }).catch(() => console.error("Failed to increment aura"));
      track("aura_click");
      auraReconcile.current = setTimeout(async () => {
        void badgeTimeout;
        try {
          const res = await fetch("/api/aura");
          if (res.ok) {
            const d = await res.json();
            setAuraCount(d.count);
          }
        } catch {
          console.error("Failed to reconcile aura count");
        }
      }, 3000);
      return;
    }

    if (name.includes("thug")) {
      if (falling === s.id) return;
      console.log("Thug life triggered!");
      playAudio(audioRefs.thug, "/audio/thug-life_copy.mp3", 0.5);
      setFalling(s.id);
      setTimeout(() => setFalling(null), 5000);
      return;
    }

    if (name.includes("marlie")) {
      console.log("Marlie sticker clicked!");
      playAudio(audioRefs.marlie, "/audio/Marlielaugh.m4a", 0.6);
      return;
    }

    if (name.includes("airpod")) {
      const customSrc = s.audio_url || s.audio;
      const src = customSrc || "/audio/kun_faya_kun.mp3";
      const fadeDuration = 1500;
      const targetVolume = 0.5;

      if (!audioRefs.radio.current || audioRefs.radio.current.src !== new URL(src, window.location.href).href) {
        if (audioRefs.radio.current) {
          audioRefs.radio.current.pause();
          audioRefs.radio.current.src = "";
        }
        audioRefs.radio.current = new Audio(src);
        audioRefs.radio.current.volume = 0;
      }

      if (radioPlaying) {
        // Fade out
        const audio = audioRefs.radio.current;
        const startVol = audio.volume;
        const fadeSteps = 30;
        const stepTime = fadeDuration / fadeSteps;
        let step = 0;
        const fadeOut = setInterval(() => {
          step++;
          audio.volume = Math.max(0, startVol * (1 - step / fadeSteps));
          if (step >= fadeSteps) {
            clearInterval(fadeOut);
            audio.pause();
            setRadioPlaying(false);
            toast.info("Paused");
          }
        }, stepTime);
      } else {
        // Fade in
        const audio = audioRefs.radio.current;
        audio.currentTime = 0;
        const fadeSteps = 30;
        const stepTime = fadeDuration / fadeSteps;
        let step = 0;
        audio.volume = 0;
        const p = audio.play();
        if (p !== undefined) {
          toast.promise(p, {
            loading: "Tuning in...",
            success: () => {
              const fadeIn = setInterval(() => {
                step++;
                audio.volume = Math.min(targetVolume, targetVolume * (step / fadeSteps));
                if (step >= fadeSteps) {
                  clearInterval(fadeIn);
                  audio.volume = targetVolume;
                }
              }, stepTime);
              setRadioPlaying(true);
              return "Playing";
            },
            error: (err: Error) => {
              console.error("Audio play failed", err.name, err.message);
              return `Could not play: ${err.name}`;
            },
          });
        }
      }
      return;
    }

    if (name.includes("phone")) {
      console.log("Phone sticker clicked, opening WhatsApp bubble...");
      story(
          <span>
            <Typewriter text="Message me on " speed={10} />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  window.open(toWaLink(settings.whatsappNumber), "_blank", "noopener");
                }}
                className="underline decoration-2 underline-offset-2 hover:text-green-300 transition-colors cursor-pointer ml-1"
              >
                WhatsApp
              </button>
            </motion.span>
          </span>
      );
      return;
    }

    if (name.includes("london")) {
      console.log("London sticker clicked, ring ring!");
      playAudio(audioRefs.london, "/audio/london-ring.mp3", 0.6);
      return;
    }

    if (name.includes("name")) {
      console.log("Name sticker clicked, copying link...");
      navigator.clipboard?.writeText(window.location.origin).catch(() => {});
      const fx = e.clientX + (Math.random() - 0.5) * 100;
      const fy = e.clientY + (Math.random() - 0.5) * 100;
      pushFloater("Link copied to clipboard", fx, fy);
      return;
    }

    if (name.includes("nj")) {
      const take = pickHotTake(hatPool, (h) => h.category === "hat");
      story(<Typewriter text={take ? take.content : "Action always."} speed={10} />);
      return;
    }

    if (name.includes("linkedin")) {
      console.log("LinkedIn sticker clicked, showing LinkedIn bubble...");
      story(
          <span>
            <Typewriter text="Find me on " speed={10} />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  window.open(settings.linkedinUrl, "_blank", "noopener");
                }}
                className="underline decoration-2 underline-offset-2 hover:text-blue-300 transition-colors cursor-pointer ml-1"
              >
                LinkedIn
              </button>
            </motion.span>
          </span>
      );
      return;
    }

    if (name.includes("bolun") || name.includes("flinker") || name.includes("wifey") || name.includes("flag")) {
      // Personal stickers: no built-in story — set one via ?edit → "message bubble".
      nudge();
      return;
    }

    if (name.includes("meetup")) {
      const link = (settings.lumaUrl || settings.instagramUrl || "").trim();
      if (!link) {
        nudge();
        return;
      }
      story(
        <span>
          <Typewriter text="Catch me at the next meetup " speed={10} />
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.3 }}>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(ev) => ev.stopPropagation()}
              className="underline decoration-2 underline-offset-2 hover:text-blue-400 transition-colors cursor-pointer ml-1"
            >
              here
            </a>
          </motion.span>
          <Typewriter text="!" speed={10} delay={900} />
        </span>,
      );
      return;
    }


    if (name.includes("screw") || name.includes("driver")) {
      story(<Typewriter text="I like building things — software first, but anything that needs fixing." speed={10} />);
      return;
    }


    if (name.includes("airplane") || name.includes("plane")) {
      console.log("Airplane sticker clicked, flying away!");
      cancelBubbleDismiss();
      setBubble(null);
      setFlying(s.id);
      setTimeout(() => setFlying(null), 6000);
      return;
    }


    if (name.includes("aman") || name.includes("najeeb")) {
      story(<Typewriter text="That's me — Aman Najeeb. Welcome in." speed={10} />);
      return;
    }

    if (name.includes("riff") || name.includes("code") || name.includes("built")) {
      story(
        <span>
          <Typewriter text="Hand-built with React, Vite & Tailwind — a tribute to " speed={10} />
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.3 }}>
            <a
              href="https://hey.milo.gg"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(ev) => ev.stopPropagation()}
              className="underline decoration-2 underline-offset-2 hover:text-purple-400 transition-colors cursor-pointer ml-1"
            >
              milo.gg
            </a>
          </motion.span>
          <Typewriter text="." speed={10} delay={1500} />
        </span>,
      );
      return;
    }

    if (name.includes("dog")) {
      const take = pickHotTake(dogPool, (h) => !h.category || h.category === "dog");
      if (take) {
        cancelBubbleDismiss();
        setBubble({
          stickerId: s.id,
          content: <Typewriter text={take.content} speed={10} />,
        });
        dismissBubbleSoon(s.id);
      }
      return;
    }

    if (name.includes("hat") || name.includes("cap")) {
      const take = pickHotTake(hatPool, (h) => h.category === "hat");
      story(<Typewriter text={take ? take.content : "Ship it."} speed={10} />);
      return;
    }

    if (
      name.includes("macbook") ||
      name.includes("laptop") ||
      name.includes("computer") ||
      name.includes("email") ||
      name.includes("mail")
    ) {
      console.log("Macbook/Email sticker clicked, opening Email...");
      onOpenEmail();
      return;
    }

    if (name.includes("bike") || name.includes("bicycle") || name.includes("cycle")) {
      setDriving(s.id);
      setTimeout(() => setDriving(null), 4000);
      return;
    }

    if (name.includes("shoe") || name.includes("sneaker") || name.includes("walk")) {
      setWalking(s.id);
      setTimeout(() => setWalking(null), 3000);
      return;
    }

    if (name.includes("sun")) {
      setSpinning(s.id);
      setTimeout(() => setSpinning(null), 3100);
      return;
    }

    if (name.includes("head") || name.includes("face")) {
      setFastSpinning(s.id);
      setTimeout(() => setFastSpinning(null), 1000);
      return;
    }

    if (name.includes("ray") || name.includes("record") || name.includes("music") || name.includes("vinyl")) {
      setRecordSpinning((cur) => (cur === s.id ? null : s.id));
      return;
    }

    if (name.includes("bottle") || name.includes("water")) {
      setWiggling(s.id);
      setTimeout(() => setWiggling(null), 1000);
      return;
    }

    if (name.includes("lego") || name.includes("brick")) {
      setLegoRaining(true);
      setTimeout(() => setLegoRaining(false), 5000);
      return;
    }

    if (
      name.includes("calendly") ||
      name.includes("calendar") ||
      name.includes("schedule")
    ) {
      console.log("Calendly sticker clicked, opening scheduler...");
      onOpenCalendly();
      return;
    }
  };

  const getEffectiveSticker = useCallback(
    (s: StickerData): StickerData => {
      if (!isMobile) return s;
      return {
        ...s,
        x: s.mobile_x ?? s.x,
        y: s.mobile_y ?? s.y,
        width: s.mobile_width ?? s.width,
        rotation: s.mobile_rotation ?? s.rotation,
        layer: s.mobile_layer ?? s.layer ?? "front",
      };
    },
    [isMobile],
  );

  const visibleStickers = stickers.filter((s) => {
    if (isMobile && s.mobile_hidden && !isEditMode) return false;
    return true;
  });

  const backStickers = visibleStickers
    .map(getEffectiveSticker)
    .filter((s) => (s.layer || "front") === "back");
  const frontStickers = visibleStickers
    .map(getEffectiveSticker)
    .filter((s) => (s.layer || "front") === "front");

  const renderSticker = (s: StickerData, isFront: boolean) => {
    if (!loaded.has(s.id)) return null;
    const showAuraBadge =
      isFront &&
      auraBadgeVisible &&
      ((s.name?.toLowerCase().includes("thumb") ||
        s.name?.toLowerCase().includes("like")))
        ? auraCount
        : null;
    return (
      <StickerEl
        key={`sticker-${s.id}-${isMobile ? "mobile" : "pc"}`}
        sticker={s}
        isEditing={isEditMode}
        isSelected={selectedId === s.id}
        bubbleContent={bubble?.stickerId === s.id ? bubble.content : null}
        isDriving={driving === s.id}
        isWalking={walking === s.id}
        isSpinning={spinning === s.id}
        isFastSpinning={fastSpinning === s.id}
        isRecordSpinning={recordSpinning === s.id}
        isWiggling={wiggling === s.id}
        isFalling={falling === s.id}
        isFlying={flying === s.id}
        isBouncing={bouncing === s.id}
        auraCount={showAuraBadge}
        scale={zoom}
        onClick={(e) => handleClick(s, e)}
        onSelect={(id) => setSelectedId(id)}
        onUpdate={handleStickerUpdate}
        onRemove={handleStickerRemove}
        onMoveLayer={handleMoveLayer}
        canMoveForward={(s.layer || "front") === "back"}
        canMoveBack={(s.layer || "front") === "front"}
        onDragEnd={handleStickerDragEnd}
        onHover={(hovering) => handleHover(s.id, hovering)}
      />
    );
  };

  return (
    <div ref={canvasRef} className="absolute inset-0 pointer-events-none">
      {/* back layer */}
      <div
        className="absolute top-0 left-0 z-0 pointer-events-none overflow-visible origin-top-left"
        style={{
          width: CANVAS_W,
          height: CANVAS_W * 0.75,
        }}
      >
        {backStickers.map((s) => renderSticker(s, false))}
      </div>

      {/* front layer */}
      <div
        className="absolute top-0 left-0 z-[200] pointer-events-none overflow-visible origin-top-left"
        style={{
          width: CANVAS_W,
          height: CANVAS_W * 0.75,
        }}
      >
        {frontStickers.map((s) => renderSticker(s, true))}
      </div>

      {legoRaining && <LegoRain />}

      {/* floaters portal */}
      {createPortal(
        <div className="fixed inset-0 pointer-events-none z-[1000]">
          <AnimatePresence>
            {floaters.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                style={{ position: "absolute", left: f.x, top: f.y }}
                className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-xl border border-white/20 whitespace-nowrap"
              >
                {f.text || "Link copied to clipboard"}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default StickerLayer;
