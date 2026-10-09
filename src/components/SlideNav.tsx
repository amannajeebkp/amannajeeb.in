import React from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface SlideNavProps {
  current: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onHome: () => void;
  className?: string;
}

const SlideNav: React.FC<SlideNavProps> = ({
  current,
  total,
  onNext,
  onPrev,
  onHome,
  className,
}) => {
  const canPrev = current > 1;
  const canNext = current < total;
  const isLast = current === total && total > 1;

  return (
    <div className={`flex items-center justify-center pointer-events-none ${className || ""}`}>
      <div className="absolute inset-0 bg-black/[0.98] blur-xl scale-150 rounded-full -z-10" />
      <div className="flex items-center gap-2 pointer-events-auto relative z-10">
        <div className="w-8 h-8 flex items-center justify-center">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Previous slide"
            className={`w-full h-full rounded-full border flex items-center justify-center transition-all ${
              canPrev
                ? "border-white text-white hover:scale-110 active:scale-125 cursor-pointer"
                : "border-white/50 text-white/50 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-center justify-center font-bold tracking-widest text-white font-mono gap-2 w-24 text-xl">
          <span>{total > 0 ? current : 0}</span>
          <span className="opacity-50">/</span>
          <span>{total > 0 ? total : 0}</span>
        </div>
        <div className="w-8 h-8 flex items-center justify-center">
          {canNext ? (
            <button
              onClick={onNext}
              aria-label="Next slide"
              className="w-full h-full rounded-full border border-white flex items-center justify-center transition-all text-white hover:scale-110 active:scale-125 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          ) : isLast ? (
            <button
              onClick={onHome}
              aria-label="Go to first slide"
              className="w-full h-full rounded-full border border-white flex items-center justify-center transition-all text-white hover:scale-110 active:scale-125 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SlideNav;
