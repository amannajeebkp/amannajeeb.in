import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

const COLORS = ["#C91A09", "#0055BF", "#F2CD37", "#237841", "#FFFFFF", "#1B2A34"];
const SHAPES = [
  { w: 15, h: 15 },
  { w: 30, h: 15 },
  { w: 30, h: 30 },
  { w: 60, h: 15 },
];

interface Brick {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  shape: (typeof SHAPES)[number];
  rotation: number;
}

const LegoRain: React.FC = () => {
  const bricks = useMemo<Brick[]>(
    () =>
      Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 1.5 + Math.random() * 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        rotation: Math.random() * 360,
      })),
    [],
  );

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {bricks.map((b) => (
        <motion.div
          key={b.id}
          initial={{
            y: -150,
            x: `${b.left}vw`,
            opacity: 1,
            rotate: b.rotation,
          }}
          animate={{ y: window.innerHeight + 150 }}
          transition={{
            duration: b.duration,
            delay: b.delay,
            ease: "easeIn",
            repeat: 0,
          }}
          style={{
            position: "absolute",
            width: `${b.shape.w}px`,
            height: `${b.shape.h}px`,
            backgroundColor: b.color,
            top: 0,
            borderRadius: "2px",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
          }}
        >
          <div className="w-full h-full flex flex-wrap justify-center items-center gap-1 opacity-30" />
        </motion.div>
      ))}
    </div>,
    document.body,
  );
};

export default LegoRain;
