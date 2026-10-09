import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGesture } from "@use-gesture/react";
import { motion, useSpring, useTransform } from "framer-motion";
import { toast, Toaster } from "sonner";
import Nebula from "./components/Nebula";
import Cursor from "./components/Cursor";
import Sparks from "./components/Sparks";
import { Grain, HintPill, StatusStrip, useEasterEggs } from "./components/Ambient";
import { fxEnabled, installPointerTracking, isTouchDevice, pointerX, pointerY } from "./lib/fx";
import IntroSequence from "./components/IntroSequence";
import SlideDeck from "./components/SlideDeck";
import SlideContent from "./components/SlideContent";
import SlideNav from "./components/SlideNav";
import StickerLayer from "./components/StickerLayer";
import ThumbsUpPopup, { DEFAULT_THUMB_URL } from "./components/ThumbsUpPopup";
import EmailModal from "./components/EmailModal";
import CalendlyModal from "./components/CalendlyModal";
import { installClickListener, playSynth, preloadClickSounds, presets } from "./lib/sound";
import { track } from "./lib/track";
import {
  loadHotTakes,
  loadSettings,
  loadSlides,
  loadThumbsUpImages,
  slides as bundledSlides,
  type ThumbImage,
} from "./data/loader";
import {
  DEFAULT_SETTINGS,
  KEYS,
  getHotTakes,
  getSettings,
  getSlides,
  getStickers,
  hasCalendly,
  onSyncResult,
  saveStickers,
  subscribeAdminUpdate,
  syncToCloud,
  type SiteSettings,
} from "./admin/store";
import { ensureAdminToken } from "./lib/adminAuth";
import type { HotTake, Slide } from "./data/types";

const getResponsiveZoom = () => {
  if (typeof window === "undefined") return 0.60;
  const w = window.innerWidth;
  if (w < 672) {
    // Reverse-engineered milo.gg mobile zoom:
    // Fits the 672px board proportionally with surrounding sticker breathing room
    const availableW = Math.max(260, w - 48);
    return Math.round(((availableW / 672) * 0.75) * 100) / 100;
  }
  // Reverse-engineered milo.gg desktop zoom: 544/672 * 0.75 = ~0.60
  return 0.60;
};

const PAN_STEP = 40;
const WHEEL_NAV_THRESHOLD = 30;
const WHEEL_NAV_COOLDOWN = 800;

const App: React.FC = () => {
  const isSkipIntro = typeof window !== "undefined" && (
    window.location.search.includes("skip") ||
    window.location.search.includes("via=legacy") ||
    window.location.search.includes("edit")
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [booted, setBooted] = useState(isSkipIntro);
  const [slidesData, setSlidesData] = useState<Slide[]>(bundledSlides);
  const [slidesFetched, setSlidesFetched] = useState(false);
  const [hotTakes, setHotTakes] = useState<HotTake[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [thumbsUpImages, setThumbsUpImages] = useState<ThumbImage[]>([]);
  const [activeThumbsUpStack, setActiveThumbsUpStack] = useState<ThumbImage[]>([]);

  // canvas pan / zoom
  const isEditMode = typeof window !== "undefined" && window.location.search.includes("edit");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 672) return "mobile";
    return "desktop";
  });
  const [zoom, setZoom] = useState(getResponsiveZoom);
  const userInteractedZoomRef = useRef(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingCanvas, setDraggingCanvas] = useState(false);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const [calendlyOpen, setCalendlyOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [editorActive, setEditorActive] = useState(false);

  const worldRef = useRef<HTMLDivElement>(null);
  const wheelCooldown = useRef(0);

  const playedSlugsRef = useRef(0);
  const [playedSlugs, setPlayedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    track("pageview");
  }, []);
  useEffect(() => {
    if (calendlyOpen) track("modal_open", { modal: "call_me" });
  }, [calendlyOpen]);
  useEffect(() => {
    if (emailOpen) track("modal_open", { modal: "email_me" });
  }, [emailOpen]);

  useEffect(() => preloadClickSounds(), []);
  useEffect(() => installClickListener(), []);
  useEffect(() => installPointerTracking(), []);
  useEasterEggs();

  // the deck leans toward the pointer (desktop only; the board is 3D, not a flat card)
  const tiltEnabled = fxEnabled && !isTouchDevice;
  const tiltX = useSpring(useTransform(pointerY, (v) => (tiltEnabled ? v * 4.5 : 0)), { stiffness: 60, damping: 18 });
  const tiltY = useSpring(useTransform(pointerX, (v) => (tiltEnabled ? v * 5.5 : 0)), { stiffness: 60, damping: 18 });

  const whoosh = useCallback(() => {
    if (fxEnabled) playSynth({ ...presets.space, frequency: 320, decay: 0.22, volume: 0.07, pitchDrop: 140, noiseMix: 0.35 });
  }, []);

  // data loading (mirrors original cache-first flow)
  useEffect(() => {
    loadSlides().then(({ list, fetched }) => {
      setSlidesData(list);
      setSlidesFetched(fetched);
    });
    loadHotTakes().then(setHotTakes);
    loadSettings().then(setSettings);
    loadThumbsUpImages().then(setThumbsUpImages);

    const unsubscribe = subscribeAdminUpdate((e) => {
      const key = e.detail?.key;
      if (key === KEYS.slides) setSlidesData(getSlides());
      else if (key === KEYS.hotTakes) setHotTakes(getHotTakes());
      else if (key === KEYS.settings) setSettings(getSettings());
    });
    return unsubscribe;
  }, []);

  // ?edit mode: make sure we hold the admin secret, and surface cloud-sync errors
  useEffect(() => {
    if (!isEditMode) return;
    ensureAdminToken().then((ok) => {
      if (!ok) toast.error("Not signed in — edits will stay in this browser only.");
    });
    return onSyncResult(({ ok, error }) => {
      if (!ok) toast.error("Cloud save failed: " + (error || "unknown error"), { id: "sync-err" });
    });
  }, [isEditMode]);

  const calendlyEnabled = hasCalendly(settings);
  const openCalendly = useCallback(() => {
    // No real Calendly configured → fall back to the email form instead of a broken iframe.
    if (calendlyEnabled) setCalendlyOpen(true);
    else setEmailOpen(true);
  }, [calendlyEnabled]);

  // hide loader once boot done and first data ready
  const [showLoader, setShowLoader] = useState(!isSkipIntro);
  useEffect(() => {
    if (slidesFetched && booted) setShowLoader(false);
  }, [slidesFetched, booted]);

  // Keep responsive default zoom and visitor device mode in sync on window resize unless user manually zoomed
  useEffect(() => {
    const handleResize = () => {
      if (!isEditMode) {
        setDeviceMode(window.innerWidth < 672 ? "mobile" : "desktop");
      }
      if (!userInteractedZoomRef.current) {
        setZoom(getResponsiveZoom());
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isEditMode]);

  // mark viewed slides
  useEffect(() => {
    if (slidesData.length === 0) return;
    const k = slidesData.length;
    const wrapped = ((playedSlugsRef.current % k) + k) % k;
    if (playedSlugsRef.current !== slideIndex) {
      const prevSlide = slidesData[wrapped];
      if (prevSlide)
        setPlayedSlugs((prev) => {
          const next = new Set(prev);
          next.add(prevSlide.slug);
          return next;
        });
      playedSlugsRef.current = slideIndex;
      const current = slidesData[((slideIndex % k) + k) % k];
      if (current) track("slide_view", { slide: current.slug });
    }
  }, [slideIndex, slidesData]);

  const thumbsCycle = useRef(-1);
  const handleThumbsUp = useCallback(() => {
    let imagesToUse = thumbsUpImages;
    if (imagesToUse.length === 0) {
      imagesToUse = [{ id: "default", url: DEFAULT_THUMB_URL }];
    }
    thumbsCycle.current = (thumbsCycle.current + 1) % imagesToUse.length;
    const img = imagesToUse[thumbsCycle.current];
    const item: ThumbImage = { ...img, id: crypto.randomUUID() };
    setActiveThumbsUpStack((prev) => [...prev, item]);
    window.setTimeout(
      () => setActiveThumbsUpStack((prev) => prev.filter((p) => p.id !== item.id)),
      3000,
    );
  }, [thumbsUpImages]);

  // keyboard panning (inverted axes like the original)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.querySelector('[role="dialog"]') ||
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        editorActive
      )
        return;
      if (e.key === "ArrowUp") setPan((p) => ({ ...p, y: p.y + PAN_STEP }));
      else if (e.key === "ArrowDown") setPan((p) => ({ ...p, y: p.y - PAN_STEP }));
      else if (e.key === "ArrowLeft") setPan((p) => ({ ...p, x: p.x + PAN_STEP }));
      else if (e.key === "ArrowRight") setPan((p) => ({ ...p, x: p.x - PAN_STEP }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorActive]);

  /** Zoom anchored at a client point (exact math from milo.gg). */
  const zoomAtPoint = useCallback(
    (nextZoomRaw: number, clientX?: number, clientY?: number) => {
      const el = worldRef.current;
      if (!el) {
        setZoom(nextZoomRaw);
        return;
      }
      const rect = el.getBoundingClientRect();
      const cx = clientX ?? rect.left + rect.width / 2;
      const cy = clientY ?? rect.top + rect.height / 2;
      const localX = (cx - rect.left - rect.width / 2 - panRef.current.x) / zoomRef.current;
      const localY = (cy - rect.top - rect.height / 2 - panRef.current.y) / zoomRef.current;
      const nextPanX = cx - rect.width / 2 - localX * nextZoomRaw;
      const nextPanY = cy - rect.height / 2 - localY * nextZoomRaw;
      setZoom(nextZoomRaw);
      setPan({ x: nextPanX, y: nextPanY });
    },
    [],
  );

  void useGesture(
    {
      onDrag: ({ offset: [dx, dy], down, event }) => {
        if (event.target instanceof Element && event.target.closest(".sticker-element"))
          return;
        setPan({ x: dx, y: dy });
        setDraggingCanvas(down);
      },
      onPinch: ({ offset: [scale], origin, event }) => {
        userInteractedZoomRef.current = true;
        if (origin && origin.length === 2) {
          zoomAtPoint(scale, origin[0], origin[1]);
          return;
        }
        const cx = (event as unknown as MouseEvent)?.clientX;
        const cy = (event as unknown as MouseEvent)?.clientY;
        if (typeof cx === "number" && typeof cy === "number") {
          zoomAtPoint(scale, cx, cy);
          return;
        }
        setZoom(scale);
      },
      onWheel: ({ delta: [, dy], ctrlKey, metaKey, event }) => {
        if (ctrlKey || metaKey) {
          userInteractedZoomRef.current = true;
          event.preventDefault();
          const current = zoomRef.current;
          const factor = Math.exp(-dy * 0.001);
          const next = Math.min(3, Math.max(0.25, current * factor));
          zoomAtPoint(next, event.clientX, event.clientY);
          return;
        }
        const now = Date.now();
        if (now - wheelCooldown.current < WHEEL_NAV_COOLDOWN) return;
        if (dy > WHEEL_NAV_THRESHOLD) {
          if (slidesData.length > 0 && slideIndex < slidesData.length - 1) {
            setDirection(1);
            setSlideIndex((i) => i + 1);
            setActiveThumbsUpStack([]);
            wheelCooldown.current = now;
            whoosh();
          }
        } else if (dy < -WHEEL_NAV_THRESHOLD) {
          if (slidesData.length > 0 && slideIndex > 0) {
            setDirection(-1);
            setSlideIndex((i) => i - 1);
            setActiveThumbsUpStack([]);
            wheelCooldown.current = now;
            whoosh();
          }
        }
      },
    },
    {
      target: worldRef,
      eventOptions: { passive: false },
      drag: { from: () => [pan.x, pan.y], filterTaps: true },
      pinch: {
        scaleBounds: { min: 0.25, max: 3 },
        from: () => [zoom, 0],
      },
      wheel: { from: () => [pan.x, pan.y] },
    },
  );

  const total = slidesData.length;
  const activeIdx = total > 0 ? ((slideIndex % total) + total) % total : 0;
  const currentDisplay = total > 0 ? activeIdx + 1 : 0;

  const deckItems = slidesData.map((slide, i) => ({
    id: slide.slug,
    content: (
      <SlideContent
        slide={slide}
        isActive={i === activeIdx}
        alreadyPlayed={playedSlugs.has(slide.slug)}
        onOpenCalendly={openCalendly}
        onThumbsUp={handleThumbsUp}
      />
    ),
  }));

  const goNext = () => {
    setDirection(1);
    setSlideIndex((i) => i + 1);
    setActiveThumbsUpStack([]);
    whoosh();
  };
  const goPrev = () => {
    setDirection(-1);
    setSlideIndex((i) => i - 1);
    setActiveThumbsUpStack([]);
    whoosh();
  };
  const goHome = () => {
    setDirection(-1);
    setSlideIndex(0);
    setActiveThumbsUpStack([]);
    whoosh();
  };

  const navNode = (className: string) => (
    <SlideNav
      current={currentDisplay}
      total={total}
      onNext={goNext}
      onPrev={goPrev}
      onHome={goHome}
      className={className}
    />
  );

  // ambient layers live outside the intro/board switch so they never restart
  const ambient = (
    <>
      <Nebula ignited={!showLoader} intensity={showLoader ? 0.75 : 1} />
      <Grain />
      <Sparks enabled={!isEditMode} />
      <Cursor enabled={!isEditMode} />
    </>
  );

  if (showLoader) {
    return (
      <>
        {ambient}
        <IntroSequence onComplete={() => setTimeout(() => setBooted(true), 500)} />
        <Toaster theme="dark" position="bottom-right" />
      </>
    );
  }

  return (
    <div
      ref={worldRef}
      className={`fixed inset-0 h-[100dvh] w-full flex items-center justify-center overflow-hidden overscroll-none text-white font-mono touch-none ${
        draggingCanvas ? "cursor-grabbing" : "cursor-grab"
      } [&_button]:cursor-pointer [&_a]:cursor-pointer`}
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
        `,
        backgroundSize: `${Math.max(20, 40 * zoom)}px ${Math.max(20, 40 * zoom)}px`,
        backgroundPosition: `calc(50% + ${pan.x}px) calc(50% + ${pan.y}px)`,
      }}
    >
      {ambient}
      {!isEditMode && <StatusStrip name="Aman Najeeb" role="AI engineer" />}
      <HintPill show={!isEditMode} />
      {navNode("fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] sm:hidden")}



      {isEditMode && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[400] bg-black/95 border border-blue-500/80 px-3.5 py-2 rounded-full text-xs font-mono shadow-2xl flex items-center gap-2.5 backdrop-blur-md max-w-[96vw] overflow-x-auto">
          {/* PC vs Mobile View & Edit Switcher */}
          <div className="flex items-center bg-white/10 p-0.5 rounded-full border border-white/15">
            <button
              onClick={() => {
                setDeviceMode("desktop");
                setZoom(0.60);
                toast.info("Switched to PC / Desktop View & Edit");
              }}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                deviceMode === "desktop"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-white/60 hover:text-white"
              }`}
            >
              💻 PC View
            </button>
            <button
              onClick={() => {
                setDeviceMode("mobile");
                setZoom(typeof window !== "undefined" && window.innerWidth < 672 ? getResponsiveZoom() : 0.38);
                toast.info("Switched to Mobile View & Edit");
              }}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                deviceMode === "mobile"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-white/60 hover:text-white"
              }`}
            >
              📱 Mobile View
            </button>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {deviceMode === "mobile" && (
            <button
              onClick={() => {
                const currentStickers = getStickers();
                const updated = currentStickers.map((s) => ({
                  ...s,
                  mobile_x: s.x,
                  mobile_y: s.y,
                  mobile_width: s.width,
                  mobile_rotation: s.rotation,
                  mobile_layer: s.layer,
                }));
                saveStickers(updated);
                toast.success("Copied PC coordinates to Mobile! You can now adjust stickers for mobile.");
              }}
              className="bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-500/50 px-2.5 py-1 rounded-full transition-all active:scale-95 text-[11px] font-medium hidden md:flex items-center gap-1 cursor-pointer"
              title="Copy current PC coordinates into mobile baseline"
            >
              📋 Copy PC to Mobile
            </button>
          )}

          <span className="text-white/30 hidden sm:inline">|</span>

          <button
            onClick={async () => {
              if (!(await ensureAdminToken())) {
                toast.error("Admin password required to publish.", { id: "cloud-save" });
                return;
              }
              toast.loading("Publishing PC & Mobile sticker layout...", { id: "cloud-save" });
              const result = await syncToCloud(KEYS.stickers, getStickers());
              if (result.ok) {
                toast.success("Published! Visitors now see this layout.", { id: "cloud-save" });
              } else {
                toast.error("Cloud save error: " + (result.error || "failed"), { id: "cloud-save" });
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1 rounded-full transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md pointer-events-auto whitespace-nowrap"
          >
            ☁️ Save All Edits
          </button>
        </div>
      )}

      <div className={`absolute inset-0 ${fxEnabled ? "nj-bloom" : ""}`}>
      <div
        className={`absolute left-1/2 top-1/2 w-[672px] h-[504px] min-w-[672px] min-h-[504px] flex-shrink-0 origin-center ${
          draggingCanvas ? "" : "transition-transform duration-300 ease-out"
        }`}
        style={{
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "50% 50%",
        }}
      >

        <ThumbsUpPopup images={thumbsUpImages} activeStack={activeThumbsUpStack} />
        <CalendlyModal open={calendlyOpen} onOpenChange={setCalendlyOpen} url={settings.calendlyUrl} />
        <EmailModal open={emailOpen} onOpenChange={setEmailOpen} contactEmail={settings.email} />

        <main className="relative z-10 w-[672px] h-[504px] min-w-[672px] min-h-[504px] flex-shrink-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative w-[672px] h-[504px] min-w-[672px] min-h-[504px] flex-shrink-0">
            <StickerLayer
              hotTakes={hotTakes}
              onThumbsUp={handleThumbsUp}
              onOpenCalendly={openCalendly}
              onOpenEmail={() => setEmailOpen(true)}
              onEditingChange={setEditorActive}
              settings={settings}
              zoom={zoom}
              deviceMode={deviceMode}
            />
            {navNode("hidden sm:flex absolute top-8 right-8 z-[300]")}
            {total > 0 ? (
              <motion.div
                className="pointer-events-auto w-[672px] h-[504px] min-w-[672px] min-h-[504px] flex-shrink-0"
                style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1400, transformStyle: "preserve-3d" }}
              >
                <SlideDeck items={deckItems} currentIndex={slideIndex} direction={direction} />
              </motion.div>
            ) : (
              <div className="text-white text-center p-8 border border-white/20 rounded-xl bg-black/50 backdrop-blur-sm pointer-events-auto">
                <p>No slides found.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      </div>

      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "group toast bg-black text-white border border-white/20 rounded-xl font-mono shadow-lg",
            description: "text-gray-400",
          },
        }}
      />
    </div>
  );
};

export default App;
