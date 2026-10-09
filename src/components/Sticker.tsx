import React, { useEffect, useMemo, useRef, useState } from "react";
import { fxEnabled } from "../lib/fx";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, RotateCcw, Maximize2, X, RefreshCw } from "lucide-react";
import type { PointerEvent as RPointerEvent, MouseEvent as RMouseEvent } from "react";
import { toast } from "sonner";
import SpeechBubble from "./SpeechBubble";
import type { Sticker as StickerData } from "../data/types";
import { uploadAndReplaceSticker } from "../lib/optimizeImage";

export interface AuraFloater {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface StickerProps {
  sticker: StickerData;
  isEditing: boolean;
  isSelected: boolean;
  bubbleContent: React.ReactNode;
  isDriving: boolean;
  isWalking: boolean;
  isSpinning: boolean;
  isFastSpinning: boolean;
  isRecordSpinning: boolean;
  isWiggling: boolean;
  isFalling: boolean;
  isFlying: boolean;
  isBouncing: boolean;
  auraCount: number | null;
  scale: number;
  onSelect?: (id: string, additive: boolean) => void;
  onUpdate?: (id: string, patch: Partial<StickerData>) => void;
  onRemove?: (id: string) => void;
  onMoveLayer?: (id: string, dir: "forward" | "backward") => void;
  canMoveForward?: boolean;
  canMoveBack?: boolean;
  onClick: (e: RMouseEvent<HTMLDivElement>) => void;
  onDrag?: (id: string, delta: { x: number; y: number }) => void;
  onDragEnd?: (id: string, delta: { x: number; y: number }) => void;
  onHover: (hovering: boolean) => void;
}

const StickerEl: React.FC<StickerProps> = ({
  sticker: s,
  isEditing,
  isSelected,
  bubbleContent,
  isDriving,
  isWalking,
  isSpinning,
  isFastSpinning,
  isRecordSpinning,
  isWiggling,
  isFalling,
  isFlying,
  isBouncing: _isBouncing,
  auraCount,
  scale = 1,
  onSelect,
  onUpdate: _onUpdate,
  onRemove: _onRemove,
  onMoveLayer: _onMoveLayer,
  canMoveForward: _canMoveForward,
  canMoveBack: _canMoveBack,
  onClick,
  onDrag,
  onDragEnd,
  onHover,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const sessionDelta = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const dx = e.movementX / scale;
      const dy = e.movementY / scale;
      dragOffset.current.x += dx;
      dragOffset.current.y += dy;
      sessionDelta.current.x += dx;
      sessionDelta.current.y += dy;
      setDragDelta({ ...dragOffset.current });
      if (Math.abs(sessionDelta.current.x) > 2 || Math.abs(sessionDelta.current.y) > 2)
        movedRef.current = true;
      onDrag?.(s.id, { x: dx * scale, y: dy * scale });
    };
    const up = () => {
      onDragEnd?.(s.id, {
        x: sessionDelta.current.x,
        y: sessionDelta.current.y,
      });
      dragOffset.current = { x: 0, y: 0 };
      sessionDelta.current = { x: 0, y: 0 };
      setDragDelta({ x: 0, y: 0 });
      setDragging(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, scale, s.id, onDrag, onDragEnd]);

  // --- drive-off (bike): sweep across the screen with an opacity dip ---
  const driveAnim = isDriving
    ? {
        x: [
          s.x,
          (-window.innerWidth * 1.5) / scale,
          (-window.innerWidth * 1.5) / scale,
          (window.innerWidth * 1.5) / scale,
          (window.innerWidth * 1.5) / scale,
          s.x,
        ],
        opacity: [1, 1, 0, 0, 1, 1],
        transition: {
          duration: 6,
          times: [0, 0.45, 0.48, 0.52, 0.55, 1],
          ease: ["easeInOut", "linear", "linear", "linear", "easeInOut"] as (
            | "easeInOut"
            | "linear"
          )[],
        },
      }
    : { x: s.x };

  // --- walk (shoe): hop with tilt ---
  const walkAnim = isWalking
    ? {
        y: [s.y, s.y - 60, s.y, s.y - 60, s.y, s.y - 60, s.y],
        rotate: [
          s.rotation || 0,
          (s.rotation || 0) - 15,
          s.rotation || 0,
          (s.rotation || 0) + 15,
          s.rotation || 0,
          (s.rotation || 0) - 15,
          s.rotation || 0,
        ],
        transition: { duration: 2.5, ease: "easeInOut" as const, times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1] },
      }
    : { y: s.y, rotate: s.rotation || 0 };

  // --- fall (thug life): drop from above with wobble ---
  const fallAnim = isFalling
    ? {
        opacity: [0, 1, 1, 1, 1, 1],
        y: [
          s.y - window.innerHeight,
          s.y - window.innerHeight * 0.9,
          s.y - window.innerHeight * 0.7,
          s.y - window.innerHeight * 0.4,
          s.y - window.innerHeight * 0.15,
          s.y,
        ],
        x: [s.x - 20, s.x + 20, s.x - 30, s.x + 30, s.x - 10, s.x],
        rotate: [-10, 10, -20, 15, -5, s.rotation || 0],
        transition: {
          duration: 5,
          ease: "linear" as const,
          times: [0, 0.1, 0.25, 0.5, 0.75, 1],
        },
      }
    : {};

  // --- flight (airplane): full circle, radius 400 around (x, y-400) ---
  const radius = 400;
  const baseRotation = s.rotation || 0;
  const cx = s.x;
  const cy = s.y - radius;
  const STEPS = 61;
  const easeInOutQuad = (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const progress = Array.from({ length: STEPS }, (_, i) => i / (STEPS - 1));
  const circlePoints = Array.from({ length: STEPS }, (_, i) => {
    const eased = easeInOutQuad(i / (STEPS - 1));
    const angle = Math.PI / 2 - eased * 2 * Math.PI;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  const flightTiming = { duration: 6, times: progress, ease: "linear" as const };

  const spinRotate = isRecordSpinning
    ? [s.rotation || 0, (s.rotation || 0) + 360]
    : isFastSpinning
      ? [s.rotation || 0, (s.rotation || 0) + 720]
      : [s.rotation || 0, (s.rotation || 0) + 360];

  const animate = isFlying
    ? {
        x: circlePoints.map((p) => p.x),
        y: circlePoints.map((p) => p.y),
        rotate: baseRotation,
        opacity: 1,
        scale: 1,
        transition: flightTiming,
      }
    : isDriving
      ? { ...driveAnim, y: s.y, rotate: s.rotation || 0, scale: 1 }
      : isWalking
        ? { ...walkAnim, x: s.x, scale: 1, opacity: 1 }
        : isFalling
          ? { ...fallAnim, scale: 1 }
          : isSpinning || isFastSpinning || isRecordSpinning
            ? { x: s.x, y: s.y, rotate: spinRotate, scale: 1, opacity: 1 }
            : {
                x: s.x + dragDelta.x,
                y: s.y + dragDelta.y,
                rotate: isWiggling
                  ? [0, -2, 2, -2, 2, 0].map((r) => r + (s.rotation || 0))
                  : s.rotation || 0,
                scale: 1,
                opacity: 1,
              };

  const transition = {
    type: "spring" as const,
    stiffness: 500,
    damping: 15,
    default: { type: "spring" as const, stiffness: 500, damping: 15 },
    x: isFlying
      ? flightTiming
      : isDriving || isFalling
        ? isFalling
          ? { duration: 5, times: [0, 0.1, 0.25, 0.5, 0.75, 1], ease: "linear" as const }
          : { duration: 6, times: [0, 0.45, 0.48, 0.52, 0.55, 1], ease: "easeInOut" as const }
        : dragging
          ? { type: "tween" as const, duration: 0 }
          : { type: isEditing ? ("tween" as const) : ("spring" as const), duration: isEditing ? 0 : 0.3 },
    y: isFlying
      ? flightTiming
      : isWalking || isFalling
        ? isFalling
          ? { duration: 5, times: [0, 0.1, 0.25, 0.5, 0.75, 1], ease: "linear" as const }
          : { duration: 2.5, times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], ease: "easeInOut" as const }
        : dragging
          ? { type: "tween" as const, duration: 0 }
          : { type: isEditing ? ("tween" as const) : ("spring" as const), duration: isEditing ? 0 : 0.3 },
    opacity:
      isFlying || isDriving || isFalling
        ? {
            duration: isFalling ? 5 : 6,
            times: isFalling ? [0, 0.1, 0.25, 0.5, 0.75, 1] : [0, 0.45, 0.48, 0.52, 0.55, 1],
            ease: (isFalling ? "linear" : "easeInOut") as "linear" | "easeInOut",
          }
        : { duration: 0.2 },
    rotate: isFlying
      ? flightTiming
      : isSpinning || isFastSpinning || isRecordSpinning || isFalling
        ? isRecordSpinning
          ? { duration: 20, ease: "linear" as const, repeat: Infinity }
          : isFalling
            ? { duration: 5, times: [0, 0.1, 0.25, 0.5, 0.75, 1], ease: "linear" as const }
            : { duration: isFastSpinning ? 1 : 3, ease: (isFastSpinning ? "easeInOut" : "linear") as "easeInOut" | "linear" }
        : isWalking
          ? { duration: 2.5, times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], ease: "easeInOut" as const }
          : isWiggling
            ? { duration: 0.8, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeInOut" as const }
            : { type: isEditing ? ("tween" as const) : ("spring" as const), duration: 0 },
    scale: isFlying
      ? flightTiming
      : { type: "spring" as const, stiffness: 600, damping: 30, mass: 1 },
  };

  // idle float: each sticker breathes on its own rhythm (seeded by id, stable across renders)
  const floatStyle = useMemo(() => {
    let h = 0;
    for (let i = 0; i < s.id.length; i++) h = (h * 31 + s.id.charCodeAt(i)) >>> 0;
    const dur = 5 + (h % 400) / 100;           // 5–9s
    const delay = -((h >> 4) % 700) / 100;     // negative: start mid-cycle
    return { animationDuration: `${dur}s`, animationDelay: `${delay}s` };
  }, [s.id]);
  const floating = fxEnabled && !isEditing && !dragging;
  const hoverFx = !isEditing
    ? "group-hover:scale-[1.06] group-hover:[filter:drop-shadow(0_0_18px_rgba(255,255,255,0.38))_drop-shadow(0_10px_24px_rgba(0,0,0,0.6))]"
    : "";

  return (
    <>
      <motion.div
        ref={wrapperRef}
        initial={{ x: s.x, y: s.y, scale: 2.5, opacity: 0 }}
        animate={animate}
        transition={transition}
        onPointerDown={(e: RPointerEvent<HTMLDivElement>) => {
          if (isEditing) {
            e.stopPropagation();
            onSelect?.(s.id, e.shiftKey);
            movedRef.current = false;
            setDragging(true);
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }
        }}
        onClick={(e: RMouseEvent<HTMLDivElement>) => {
          e.stopPropagation();
          if (!movedRef.current) onClick(e);
        }}
        whileTap={!isEditing && !dragging ? { scale: 0.95 } : undefined}
        onMouseEnter={() => !isEditing && onHover(true)}
        onMouseLeave={() => !isEditing && onHover(false)}
        className={`sticker-element group absolute top-0 left-0 touch-none pointer-events-auto ${
          isSelected ? "z-[150]" : ""
        } ${isEditing ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer"}`}
        style={{
          width: s.width,
          zIndex: bubbleContent ? 150 : isEditing ? (isSelected ? 110 : 100) : 10,
          overflow: "visible",
        }}
      >
        <div
          ref={containerRef}
          className={`relative w-full transition-none ${isEditing ? "cursor-pointer" : ""}`}
          style={{ height: "auto" }}
          onClick={(e) => {
            if (isEditing) {
              e.stopPropagation();
              onSelect?.(s.id, false);
            }
          }}
        >
          <div className={floating ? "nj-float" : ""} style={floating ? floatStyle : undefined}>
          <img
            src={s.url}
            alt={s.name || "sticker"}
            className={`select-none pointer-events-none transition-[transform,filter] duration-300 ease-out ${hoverFx}`}
            draggable={false}
            style={{
              width: "100%",
              height: "auto",
              maxWidth: "none",
              maxHeight: "none",
              objectFit: "contain",
              display: "block",
              filter: isEditing
                ? isSelected
                  ? "drop-shadow(2px 0 0 #3b82f6) drop-shadow(-2px 0 0 #3b82f6) drop-shadow(0 2px 0 #3b82f6) drop-shadow(0 -2px 0 #3b82f6) drop-shadow(0 0 12px rgba(59,130,246,0.9))"
                  : "drop-shadow(1px 0 0 rgba(255,255,255,0.7)) drop-shadow(-1px 0 0 rgba(255,255,255,0.7)) drop-shadow(0 1px 0 rgba(255,255,255,0.7)) drop-shadow(0 -1px 0 rgba(255,255,255,0.7))"
                : undefined,
            }}
          />
          </div>

          {isEditing && isSelected && (
            <>
              {/* Floating Dimensions Label */}
              <div
                className={`absolute -top-10 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-white border border-blue-500/50 px-2.5 py-0.5 rounded-md text-xs font-mono whitespace-nowrap z-[70] shadow-2xl pointer-events-auto flex items-center gap-1.5 ${
                  isSelected ? "opacity-100 scale-100" : "opacity-0 hover:opacity-100 transition-opacity"
                }`}
              >
                <span className="text-emerald-400 font-bold">{Math.round(s.width)}px</span>
                <span className="opacity-30">|</span>
                <span className="text-blue-400">{Math.round(s.rotation || 0)}°</span>
              </div>

              {/* Quick Size Slider Bar */}
              {isSelected && (
                <div
                  className="absolute -bottom-14 left-1/2 -translate-x-1/2 translate-y-1/2 bg-black/95 border-2 border-blue-500/80 px-3.5 py-1.5 rounded-xl shadow-2xl z-[80] flex items-center gap-2 text-white text-xs font-mono pointer-events-auto min-w-[200px] max-w-[85vw]"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <span className="text-white/70 font-bold">Size:</span>
                  <input
                    type="range"
                    min={30}
                    max={3500}
                    value={s.width}
                    onChange={(e) => _onUpdate?.(s.id, { width: Number(e.target.value), image_width: undefined, height: null })}
                    className="w-full accent-blue-500 cursor-pointer h-2 bg-gray-700 rounded-lg"
                  />
                  <span className="font-bold text-emerald-400 min-w-[44px] text-right">{Math.round(s.width)}px</span>
                </div>
              )}

              {/* Top-Right Replace Sticker Button */}
              <label
                onClick={(e) => e.stopPropagation()}
                className="absolute top-0 right-10 -translate-y-1/2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-[75] hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/60 pointer-events-auto touch-none"
                title="Replace sticker image & save permanently"
              >
                <RefreshCw size={14} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      toast.loading("Replacing sticker & saving to server...", { id: `rep-${s.id}` });
                      const { url: permanentUrl } = await uploadAndReplaceSticker(s.id, file, s.url);
                      _onUpdate?.(s.id, { url: permanentUrl });
                      toast.success("Sticker replaced & saved permanently to server! Previous sticker removed.", { id: `rep-${s.id}` });
                    } catch (err: any) {
                      toast.error("Replace failed: " + err.message, { id: `rep-${s.id}` });
                    }
                    e.target.value = "";
                  }}
                />
              </label>

              {/* Top-Right Remove Button */}
              <button
                onClick={() => _onRemove?.(s.id)}
                className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-[75] hover:bg-red-600 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/60 pointer-events-auto touch-none"
                title="Remove sticker"
              >
                <X size={16} />
              </button>

              {/* Top-Left Layer Controls */}
              <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 z-[75] pointer-events-auto touch-none">
                <button
                  onClick={() => _onMoveLayer?.(s.id, "forward")}
                  disabled={!_canMoveForward}
                  className={`bg-white text-black rounded-full w-7 h-7 flex items-center justify-center shadow-md border hover:bg-gray-100 ${
                    _canMoveForward ? "" : "opacity-40 cursor-not-allowed"
                  }`}
                  title="Bring forward"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => _onMoveLayer?.(s.id, "backward")}
                  disabled={!_canMoveBack}
                  className={`bg-white text-black rounded-full w-7 h-7 flex items-center justify-center shadow-md border hover:bg-gray-100 ${
                    _canMoveBack ? "" : "opacity-40 cursor-not-allowed"
                  }`}
                  title="Send backward"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Top Center Rotate Handle */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startRot = s.rotation || 0;
                  const startX = e.clientX;
                  const move = (ev: MouseEvent) => {
                    const delta = Math.round((ev.clientX - startX) * 0.5);
                    _onUpdate?.(s.id, { rotation: startRot + delta });
                  };
                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  const startRot = s.rotation || 0;
                  const startX = e.touches[0].clientX;
                  const move = (ev: TouchEvent) => {
                    const delta = Math.round((ev.touches[0].clientX - startX) * 0.5);
                    _onUpdate?.(s.id, { rotation: startRot + delta });
                  };
                  const end = () => {
                    window.removeEventListener("touchmove", move);
                    window.removeEventListener("touchend", end);
                  };
                  window.addEventListener("touchmove", move);
                  window.addEventListener("touchend", end);
                }}
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 bg-blue-600 text-white border-2 border-white rounded-full cursor-ew-resize flex items-center justify-center shadow-lg hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all z-[75] pointer-events-auto touch-none"
                title="Drag left/right to rotate sticker"
              >
                <RotateCcw size={15} />
              </div>

              {/* Bottom Right Corner Resize Handle */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startW = s.width;
                  const startX = e.clientX;
                  const move = (ev: MouseEvent) => {
                    const dx = (ev.clientX - startX) / scale;
                    const newW = Math.max(30, Math.min(3500, Math.round(startW + dx)));
                    _onUpdate?.(s.id, { width: newW, image_width: undefined, height: null });
                  };
                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  const startW = s.width;
                  const startX = e.touches[0].clientX;
                  const move = (ev: TouchEvent) => {
                    const dx = (ev.touches[0].clientX - startX) / scale;
                    const newW = Math.max(30, Math.min(3500, Math.round(startW + dx)));
                    _onUpdate?.(s.id, { width: newW, image_width: undefined, height: null });
                  };
                  const end = () => {
                    window.removeEventListener("touchmove", move);
                    window.removeEventListener("touchend", end);
                  };
                  window.addEventListener("touchmove", move);
                  window.addEventListener("touchend", end);
                }}
                className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-11 h-11 sm:w-9 sm:h-9 bg-white border-2 border-blue-600 rounded-full cursor-se-resize flex items-center justify-center shadow-xl hover:bg-gray-100 hover:scale-110 active:scale-95 transition-all z-[75] pointer-events-auto touch-none"
                title="Drag to resize sticker"
              >
                <Maximize2 size={16} className="text-blue-600" />
              </div>
            </>
          )}
        </div>

        <AnimatePresence>
          {auraCount != null && (
            <motion.div
              key="aura-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1 / scale, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              style={{
                position: "absolute",
                top: "55%",
                left: `${-40 / scale}px`,
                transformOrigin: "right center",
              }}
              className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-xl z-[60] border border-white/20 select-none pointer-events-none flex items-center justify-center whitespace-nowrap"
            >
              {auraCount.toLocaleString()}
            </motion.div>
          )}
        </AnimatePresence>

        <SpeechBubble
          anchorRef={wrapperRef}
          content={bubbleContent}
          onMouseEnter={() => !isEditing && onHover(true)}
          onMouseLeave={() => !isEditing && onHover(false)}
        />
      </motion.div>
    </>
  );
};

export default StickerEl;
