import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const WORDS = ["VISHAL", "JADHAV"];
const STREAKS = ["#19E6A2", "#FFFFFF", "#38BDF8", "#19E6A2", "#FFFFFF", "#38BDF8", "#19E6A2", "#FFFFFF", "#38BDF8"];
const HOLD_MS = 2100;
const TOTAL_MS = 2900;

/** Netflix-style intro: light streaks, the name blooms in, then zooms toward the viewer. */
export default function Preloader({ onDone }) {
  const [phase, setPhase] = useState("in");

  useEffect(() => {
    const toOut = window.setTimeout(() => setPhase("out"), HOLD_MS);
    const finish = window.setTimeout(onDone, TOTAL_MS);
    return () => {
      window.clearTimeout(toOut);
      window.clearTimeout(finish);
    };
  }, [onDone]);

  const leaving = phase === "out";
  let charIndex = 0;

  return (
    <motion.div
      className="preloader"
      role="status"
      aria-label="Loading portfolio"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.7, delay: leaving ? 0.2 : 0 }}
      onClick={onDone}
    >
      <div className="pre-streaks" aria-hidden="true">
        {STREAKS.map((color, i) => (
          <motion.span
            key={i}
            style={{ background: `linear-gradient(to bottom, transparent, ${color}, transparent)` }}
            initial={{ scaleY: 0, opacity: 0, x: 0 }}
            animate={{ scaleY: [0, 1, 1], opacity: [0, 0.85, 0], x: (i - 4) * 46 }}
            transition={{ duration: 1.6, delay: 0.15 + i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
          />
        ))}
      </div>

      <motion.div
        className="pre-name"
        aria-hidden="true"
        initial={{ scale: 1 }}
        animate={{ scale: leaving ? 9 : 1 }}
        transition={{ duration: leaving ? 0.9 : 0, ease: [0.7, 0, 0.84, 0] }}
      >
        {WORDS.map((word) => (
          <span className="pre-word" key={word}>
            {[...word].map((char) => {
              const i = charIndex++;
              return (
                <motion.span
                  key={i}
                  className="pre-char"
                  initial={{ opacity: 0, scale: 1.8, filter: "blur(16px)", y: 20 }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
                  transition={{ duration: 0.8, delay: 0.35 + i * 0.07, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
        ))}
      </motion.div>

      <motion.p
        className="pre-sub"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: leaving ? 0 : 1, y: 0 }}
        transition={{ delay: leaving ? 0 : 1.3, duration: 0.6 }}
      >
        AI &amp; Full Stack Engineer
      </motion.p>
    </motion.div>
  );
}
