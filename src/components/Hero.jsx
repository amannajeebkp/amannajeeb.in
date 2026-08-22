import { motion } from "framer-motion";
import { lazy, Suspense } from "react";
import { profile } from "../data";

const HeroCanvas = lazy(() => import("./HeroCanvas"));

export default function Hero() {
  return (
    <header className="hero" id="top">
      <Suspense fallback={null}>
        <HeroCanvas />
      </Suspense>
      <div className="hero__inner">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hero__eyebrow"
        >
          {profile.location} — Portfolio ©2025
        </motion.p>
        <h1 className="hero__title display">
          <span className="hero__line">
            <motion.span
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              Aman
            </motion.span>
          </span>
          <span className="hero__line hero__line--accent">
            <motion.span
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              Najeeb
            </motion.span>
          </span>
        </h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="hero__bottom"
        >
          <p className="hero__role display">
            AI <span className="serif-accent">Engineer</span>
          </p>
          <p className="hero__tagline">
            Building intelligent systems that ship — LLMs, RAG &amp; production ML.
          </p>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="hero__scroll"
      >
        Scroll
        <span className="hero__scroll-line" />
      </motion.div>
    </header>
  );
}
