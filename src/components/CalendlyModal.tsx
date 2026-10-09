import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface CalendlyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Your Calendly scheduling link, e.g. https://calendly.com/you/30min */
  url: string;
}

const EMBED_PARAMS =
  "hide_landing_page_details=1&hide_gdpr_banner=1&background_color=000000&text_color=ffffff&primary_color=ffffff";

function embedUrl(url: string): string {
  const base = (url || "").trim();
  if (!base) return "";
  return base + (base.includes("?") ? "&" : "?") + EMBED_PARAMS;
}

const CalendlyModal: React.FC<CalendlyModalProps> = ({ open, onOpenChange, url }) => {
  const src = embedUrl(url);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-3xl h-[85vh] bg-black border-2 border-white rounded-[2rem] shadow-2xl overflow-hidden font-mono"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/70 border border-white/30 text-white hover:bg-black hover:border-white transition-colors cursor-pointer"
              aria-label="Close scheduler"
            >
              <X size={18} />
            </button>
            {src ? (
              <iframe src={src} title="Book a time with NJ" className="w-full h-full border-0" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                Scheduling isn't set up yet.
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CalendlyModal;
