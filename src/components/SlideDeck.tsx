import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import BorderGlow from "./BorderGlow";

interface DeckItem {
  id: string;
  content: ReactNode;
}

interface SlideDeckProps {
  items: DeckItem[];
  currentIndex: number;
  direction?: number;
}

const STACK_SIZE = 12;

const OFFSETS = [
  { zIndex: 100, scale: 1, y: 0, opacity: 1, blur: "blur(0px)" },
  { zIndex: 90, scale: 0.98, y: 10, opacity: 1, blur: "blur(0px)" },
  { zIndex: 80, scale: 0.96, y: 25, opacity: 0.9, blur: "blur(0px)" },
  { zIndex: 70, scale: 0.94, y: 45, opacity: 0.8, blur: "blur(1px)" },
  { zIndex: 60, scale: 0.92, y: 70, opacity: 0.7, blur: "blur(1px)" },
  { zIndex: 50, scale: 0.9, y: 100, opacity: 0.6, blur: "blur(2px)" },
  { zIndex: 40, scale: 0.88, y: 135, opacity: 0.5, blur: "blur(2px)" },
  { zIndex: 30, scale: 0.86, y: 175, opacity: 0.4, blur: "blur(3px)" },
  { zIndex: 20, scale: 0.84, y: 220, opacity: 0.3, blur: "blur(3px)" },
  { zIndex: 10, scale: 0.82, y: 270, opacity: 0.2, blur: "blur(4px)" },
  { zIndex: 9, scale: 0.8, y: 320, opacity: 0.15, blur: "blur(4px)" },
  { zIndex: 8, scale: 0.78, y: 370, opacity: 0.1, blur: "blur(5px)" },
];

const SlideDeck: React.FC<SlideDeckProps> = ({ items, currentIndex, direction = 0 }) => {
  const visible = useMemo(() => {
    if (items.length === 0) return [];
    const count = Math.min(items.length, STACK_SIZE);
    const out: (DeckItem & { uniqueKey: string })[] = [];
    for (let i = 0; i < count; i++) {
      const itemIndex = currentIndex + i;
      const wrapped = ((itemIndex % items.length) + items.length) % items.length;
      out.push({
        ...items[wrapped],
        uniqueKey: `${items[wrapped].id}-${itemIndex}`,
      });
    }
    return out;
  }, [items, currentIndex]);

  const reversed = [...visible].reverse();

  const variants = {
    enter: (custom: { direction: number }) =>
      custom.direction > 0
        ? { scale: 0.95, y: 50, x: 0, opacity: 0, rotate: 0 }
        : { y: -10, x: 0, rotate: 0, opacity: 1, scale: 1 },
    animate: (custom: { offset: number }) => {
      const { offset } = custom;
      return {
        ...(OFFSETS[offset] || {
          zIndex: 0,
          scale: 0.78 - (offset - 11) * 0.02,
          y: 370 + (offset - 11) * 50,
          x: 0,
          rotate: 0,
          opacity: 0,
          filter: "blur(5px)",
        }),
        filter: (OFFSETS[offset] || OFFSETS[11]).blur,
        transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
      };
    },
    exit: () => ({
      zIndex: 100,
      opacity: 0,
      transition: { duration: 0 },
    }),
  };

  return (
    <div className="relative w-[672px] h-[504px] min-w-[672px] min-h-[504px] flex-shrink-0 flex items-center justify-center perspective-1000">
      <AnimatePresence custom={{ direction }} initial={false}>
        {reversed.map((item) => {
          const offset = visible.findIndex((v) => v.uniqueKey === item.uniqueKey);
          return (
            <motion.div
              key={item.uniqueKey}
              custom={{ offset, direction }}
              variants={variants}
              initial="enter"
              animate="animate"
              exit="exit"
              className="absolute w-full h-full overflow-hidden flex flex-col origin-bottom [container-type:size]"
              style={{ pointerEvents: offset === 0 ? "auto" : "none" }}
            >
              <BorderGlow
                backgroundColor="#0a0a0a"
                borderRadius={20}
                glowRadius={30}
                glowIntensity={0.8}
                edgeSensitivity={25}
                coneSpread={30}
                colors={['#c084fc', '#f472b6', '#38bdf8']}
                className="w-full h-full"
              >
                <div className="w-full h-full flex flex-col p-[8cqw] relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-[inherit]" />
                  {offset < 2 && item.content}
                </div>
              </BorderGlow>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default SlideDeck;
