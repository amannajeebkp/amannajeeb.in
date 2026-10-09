import React, { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import Typewriter from "./Typewriter";
import SpecularButton from "./SpecularButton";
import type { Slide } from "../data/types";

interface SlideContentProps {
  slide: Slide;
  isActive?: boolean;
  alreadyPlayed?: boolean;
  onOpenCalendly: () => void;
  onThumbsUp?: () => void;
}

function assembleText(slide: Slide): string {
  const c = slide.content;
  if (typeof c.text === "string") return c.text;
  if (c.headline) return c.headline;
  if (Array.isArray(c.items)) return c.items.map((f) => `${f.label}: ${f.value}`).join("\n");
  if (c.sections)
    return c.sections
      .map((f) => `${f.title}\n${f.items?.join("\n") ?? ""}`)
      .join("\n\n");
  return JSON.stringify(c, null, 2);
}

function textClass(len: number): string {
  if (len > 400) return "text-[2.5cqw] leading-snug";
  if (len > 200) return "text-[3.2cqw] leading-normal";
  if (len > 100) return "text-[4.2cqw] leading-relaxed";
  return "text-[5.5cqw] leading-relaxed";
}

const SlideContent: React.FC<SlideContentProps> = ({
  slide,
  isActive = true,
  alreadyPlayed = false,
  onOpenCalendly,
}) => {
  const { button_text, button_link } = slide;
  const text = useMemo(() => assembleText(slide), [slide]);
  const sizeClass = textClass(text.length);

  return (
    <div className="h-full w-full flex flex-col justify-center relative p-[1cqw]">
      <div className={`font-mono ${sizeClass} whitespace-pre-wrap text-white min-h-[1em] break-words`}>
        {alreadyPlayed ? (
          <span>{text}</span>
        ) : (
          <Typewriter text={text} speed={10} variance={5} start={isActive} />
        )}
      </div>
      {button_text && button_link && (
        <div className="absolute bottom-0 left-0">
          <div className="cta-scale inline-block origin-bottom-left">
            <SpecularButton
              size="md"
              radius={999}
              tint="#ffffff"
              tintOpacity={0}
              blur={0}
              textColor="#f5f5f5"
              lineColor="#ffffff"
              baseColor="#262626"
              intensity={1.2}
              shineSize={12}
              shineFade={35}
              thickness={1.5}
              speed={0.35}
              followMouse
              proximity={250}
              onClick={() => {
                const isCalendly =
                  button_text.toLowerCase().includes("book a time") ||
                  button_link.includes("calendly");
                if (onOpenCalendly && isCalendly) {
                  onOpenCalendly();
                  return;
                }
                window.open(button_link, "_blank");
              }}
            >
              {button_text} <ArrowRight className="h-3 w-3" />
            </SpecularButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideContent;
