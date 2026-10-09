import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode, RefObject, MouseEvent as RMouseEvent } from "react";

interface SpeechBubbleProps {
  anchorRef: RefObject<HTMLElement | null>;
  content: ReactNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface BubblePos {
  top?: number;
  bottom?: number;
  left: number;
  arrowLeft: number;
  isFlipped: boolean;
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  anchorRef,
  content,
  onMouseEnter,
  onMouseLeave,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<BubblePos | null>(null);

  useLayoutEffect(() => {
    if (!content || !anchorRef.current) return;
    const measure = () => {
      if (!anchorRef.current) return;
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const bubbleRect = ref.current?.getBoundingClientRect();
      const bw = bubbleRect?.width || 250;
      const bh = bubbleRect?.height || 100;
      const margin = 16;
      const centerX = anchorRect.left + anchorRect.width / 2;
      const idealLeft = centerX - bw / 2;
      const maxLeft = window.innerWidth - bw - margin;
      const left = Math.max(margin, Math.min(maxLeft, idealLeft));
      const arrowLeft = centerX - left;
      const flip = anchorRect.top < bh + 40;
      const next: BubblePos = {
        left,
        arrowLeft,
        isFlipped: flip,
      };
      if (flip) next.top = anchorRect.bottom + 15;
      else next.bottom = window.innerHeight - anchorRect.top + 15;
      setPos(next);
    };
    measure();
    let raf: number;
    const loop = () => {
      measure();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [anchorRef, content]);

  return createPortal(
    <AnimatePresence mode="wait">
      {content && pos && (
        <motion.div
          key={typeof content === "string" ? content : "react-node-bubble"}
          ref={ref}
          initial={{ opacity: 0, scale: 0.85, y: pos.isFlipped ? -8 : 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: pos.isFlipped ? -8 : 8 }}
          transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.8 }}
          className="fixed z-[9999]"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
          onClick={(e: RMouseEvent<HTMLDivElement>) => e.stopPropagation()}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div className="flex items-end gap-2">
            {/* Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
              <img
                src="/stickers/sticker_360292ea-034a-4d89-8d53-97b4d321c2df.png"
                alt="NJ"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            {/* Bubble body */}
            <div className="relative bg-[#1a1a1a] text-white border border-white/15 px-4 py-3 rounded-2xl rounded-br-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] min-w-[180px] max-w-[300px]">
              <div className="font-mono text-sm font-medium leading-relaxed">{content}</div>
            </div>
          </div>
          {/* Arrow */}
          <div
            className={`absolute w-3 h-3 bg-[#1a1a1a] border-white/15 ${
              pos.isFlipped
                ? "top-[-5px] border-l border-t rotate-45"
                : "bottom-[-5px] border-r border-b rotate-45"
            }`}
            style={{
              left: pos.arrowLeft - 6,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default SpeechBubble;
