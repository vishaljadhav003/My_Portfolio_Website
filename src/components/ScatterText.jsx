import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useMedia } from "../hooks.js";

// Scroll-linked headline: every character starts scattered and rotated, then slides to its place.
// The section is tall and the headline is sticky, so the effect plays while you scroll through it.

function Character({ char, index, center, progress, spread }) {
  const distance = index - center;
  const x = useTransform(progress, [0, 0.5], [distance * spread, 0]);
  const rotateX = useTransform(progress, [0, 0.5], [distance * 40, 0]);
  const opacity = useTransform(progress, [0, 0.3], [0, 1]);

  return (
    <motion.span className="scatter-char" style={{ x, rotateX, opacity }}>
      {char}
    </motion.span>
  );
}

export default function ScatterText({ text }) {
  const ref = useRef(null);
  const compact = useMedia("(max-width: 700px)");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const characters = text.split("");
  const center = Math.floor(characters.length / 2);
  const spread = compact ? 12 : 44;

  // Group characters by word so lines wrap between words, never inside one.
  const words = [];
  let current = [];
  characters.forEach((char, index) => {
    if (char === " ") {
      words.push({ chars: current, space: index });
      current = [];
    } else {
      current.push({ char, index });
    }
  });
  words.push({ chars: current, space: -1 });

  return (
    <section ref={ref} className="scatter" aria-label={text}>
      <div className="scatter-sticky">
        <p className="scatter-text" aria-hidden="true">
          {words.map((word, wordIndex) => (
            <span className="scatter-word" key={wordIndex}>
              {word.chars.map(({ char, index }) => (
                <Character key={index} char={char} index={index} center={center} progress={scrollYProgress} spread={spread} />
              ))}
            </span>
          ))}
        </p>
        <span className="scroll-cue" aria-hidden="true">
          Keep scrolling
        </span>
      </div>
    </section>
  );
}
