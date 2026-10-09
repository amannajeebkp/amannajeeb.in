import { useEffect, useState, useRef, useCallback } from "react";

interface IntroSequenceProps {
  onComplete: () => void;
}

const IntroSequence: React.FC<IntroSequenceProps> = ({ onComplete }) => {
  const [done, setDone] = useState(false);
  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);

  const finish = useCallback(() => {
    setDone(true);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (done) return;

    const el1 = text1Ref.current;
    const el2 = text2Ref.current;
    if (!el1 || !el2) return;

    el1.textContent = "സ്വാഗതം";
    el1.style.opacity = "100%";
    el1.style.filter = "none";
    el2.innerHTML = "നജീബ്'s <span style='color:#f1ff29'>ai</span>";
    el2.style.opacity = "0%";
    el2.style.filter = "none";

    const morphTimer = setTimeout(() => {
      const morphTime = 1500;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const fraction = Math.min(elapsed / morphTime, 1);

        const blur1 = Math.min(8 / (1 - fraction + 0.001) - 8, 100);
        el1.style.filter = `blur(${blur1}px)`;
        el1.style.opacity = `${Math.pow(1 - fraction, 0.4) * 100}%`;

        const blur2 = Math.min(8 / (fraction + 0.001) - 8, 100);
        el2.style.filter = `blur(${blur2}px)`;
        el2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

        if (fraction < 1) {
          requestAnimationFrame(animate);
        } else {
          el1.style.opacity = "0%";
          el2.style.filter = "none";
          el2.style.opacity = "100%";

          setTimeout(() => {
            el2.style.transition = "opacity 0.8s ease-out";
            el2.style.opacity = "0%";
            setTimeout(finish, 900);
          }, 1500);
        }
      };

      requestAnimationFrame(animate);
    }, 1200);

    return () => clearTimeout(morphTimer);
  }, [done, finish]);

  useEffect(() => {
    const skip = () => finish();
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("click", skip, { once: true });
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("click", skip);
    };
  }, [finish]);

  if (done) return null;

  return (
    <div className="fixed inset-0 h-[100dvh] w-full flex items-center justify-center bg-black overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          backgroundPosition: "center",
          maskImage: "radial-gradient(circle at center, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 20%, transparent 70%)",
        }}
      />

      <svg className="fixed h-0 w-0" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="relative z-10 h-24 w-full max-w-3xl text-center px-4"
        style={{ filter: "url(#threshold) blur(0.6px)" }}
      >
        <span
          ref={text1Ref}
          className="absolute inset-x-0 top-0 m-auto inline-block w-full text-white font-bold whitespace-nowrap text-4xl sm:text-5xl md:text-7xl lg:text-8xl"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        />
        <span
          ref={text2Ref}
          className="absolute inset-x-0 top-0 m-auto inline-block w-full text-white font-bold whitespace-nowrap text-4xl sm:text-5xl md:text-7xl lg:text-8xl"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        />
      </div>

      <div className="absolute bottom-8 text-white/20 text-xs font-mono animate-pulse z-10">
        click or press any key to skip
      </div>
    </div>
  );
};

export default IntroSequence;
