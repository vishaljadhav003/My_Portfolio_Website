import { motion } from "framer-motion";

/**
 * Slides each character up from behind a mask. Words never break in the middle.
 * The parent heading should carry an aria-label, because this markup is aria-hidden.
 */
export default function SplitText({ text, ready = true, delay = 0, stagger = 0.04 }) {
  let index = 0;
  return (
    <span className="split" aria-hidden="true">
      {text.split(" ").map((word, wordIndex, words) => (
        <span className="split-word" key={`${word}-${wordIndex}`}>
          {[...word].map((char) => {
            const i = index++;
            return (
              <span className="split-mask" key={i}>
                <motion.span
                  className="split-char"
                  initial={{ y: "115%" }}
                  animate={{ y: ready ? "0%" : "115%" }}
                  transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1], delay: delay + i * stagger }}
                >
                  {char}
                </motion.span>
              </span>
            );
          })}
          {wordIndex < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
