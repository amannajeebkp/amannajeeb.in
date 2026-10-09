import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface ThumbImage {
  id: string;
  url: string;
}

const DEFAULT_THUMB_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23000' width='400' height='400'/%3E%3Ctext x='200' y='180' text-anchor='middle' fill='white' font-size='120'%3E%E2%9C%8D%3C/text%3E%3Ctext x='200' y='260' text-anchor='middle' fill='%23666' font-size='24' font-family='monospace'%3ENJ%3C/text%3E%3C/svg%3E";

const PolaroidCard: React.FC<{ item: ThumbImage; onRemove?: (id: string) => void }> = ({ item, onRemove }) => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.src = item.url;
    const done = () => {
      if (alive) setLoaded(true);
    };
    if (img.complete) done();
    else img.onload = done;
    return () => {
      alive = false;
    };
  }, [item.url]);

  const rotation = useMemo(() => Math.random() * 6 - 3, []);

  if (!loaded) return null;
  return (
    <motion.div
      layout
      initial={{ scale: 1.25, opacity: 0, rotate: rotation }}
      animate={{ scale: 1, opacity: 1, rotate: rotation }}
      exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 450, damping: 25, mass: 1 }}
      className="absolute bg-white p-4 shadow-2xl rounded-sm transform origin-center"
      style={{
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
        zIndex: 500,
      }}
    >
      <div className="bg-black w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] mb-8 sm:mb-12 overflow-hidden flex items-center justify-center relative group">
        <img src={item.url} className="w-full h-full object-cover" alt="Polaroid" />
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
          >
            &times;
          </button>
        )}
      </div>
    </motion.div>
  );
};

const ThumbsUpPopup: React.FC<{
  images: ThumbImage[];
  activeStack: ThumbImage[];
}> = ({ images, activeStack }) => {
  useEffect(() => {
    if (!images || images.length === 0) return;
    images.forEach((img) => {
      const pre = new Image();
      pre.src = img.url;
    });
  }, [images]);

  return (
    <div className="fixed inset-0 z-[500] pointer-events-none">
      {/* Active popup stack */}
      <div className="fixed inset-0 flex items-center justify-center">
        <AnimatePresence>
          {activeStack.map((item) => (
            <PolaroidCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export { DEFAULT_THUMB_URL };
export default ThumbsUpPopup;
