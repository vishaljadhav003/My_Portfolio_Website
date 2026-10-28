import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cx } from "../utils.js";

// Words fade from dim to full as the paragraph scrolls through the viewport.

function Word({ word, range, progress }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span className="fill-word" style={{ opacity }}>
      {word}{" "}
    </motion.span>
  );
}

export default function ScrollFillText({ text, className }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");

  return (
    <p ref={ref} className={cx("fill-text", className)} aria-label={text}>
      <span aria-hidden="true">
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          return <Word key={`${word}-${i}`} word={word} range={[start, end]} progress={scrollYProgress} />;
        })}
      </span>
    </p>
  );
}
