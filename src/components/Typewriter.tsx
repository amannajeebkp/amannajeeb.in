import React, { useEffect, useMemo, useRef, useState } from "react";

interface TypewriterProps {
  text: string;
  speed?: number;
  variance?: number;
  delay?: number;
  start?: boolean;
  showCursor?: boolean;
  onComplete?: () => void;
  className?: string;
}

const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 10,
  variance = 5,
  delay = 0,
  start = true,
  showCursor = true,
  onComplete,
  className,
}) => {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chars = useMemo(() => Array.from(text || ""), [text]);

  useEffect(() => {
    if (!start) {
      setCount(0);
      setDone(false);
      indexRef.current = 0;
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    setCount(0);
    setDone(false);
    indexRef.current = 0;
    if (timerRef.current) clearTimeout(timerRef.current);

    const step = () => {
      const i = indexRef.current;
      if (i < chars.length) {
        const ch = chars[i];
        setCount(i + 1);
        indexRef.current++;
        let wait = speed + (Math.random() * variance * 2 - variance);
        if (ch === " ") wait += speed * 1.5;
        else if (ch === ",") wait += speed * 5;
        else if ([".", "?", "!"].includes(ch) || ch === "\n") wait += speed * 12;
        wait = Math.max(10, wait);
        timerRef.current = setTimeout(step, wait);
      } else {
        setDone(true);
        onComplete && onComplete();
      }
    };
    timerRef.current = setTimeout(step, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [chars, speed, variance, delay, start, onComplete]);

  return (
    <span className={`${className} relative`}>
      {chars.map((ch, j) => (
        <span key={j} className="relative">
          <span style={{ opacity: j < count ? 1 : 0 }}>{ch}</span>
          {showCursor && !done && j === count && (
            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-current animate-pulse -ml-[1px]" />
          )}
        </span>
      ))}
      {showCursor && !done && count === chars.length && (
        <span className="inline-block w-[2px] h-[1em] bg-current animate-pulse align-middle ml-[1px]" />
      )}
    </span>
  );
};

export default Typewriter;
