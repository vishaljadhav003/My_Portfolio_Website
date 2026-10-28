import { useEffect, useRef } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";

// An SVG stroke that draws itself as the section scrolls past, with a dot riding its tip.

const PATH =
  "M 1100 80 C 1100 300, 820 260, 760 460 S 240 520, 330 760 S 980 800, 900 1040 S 300 1120, 360 1300 S 760 1400, 700 1470";

export default function ScrollStroke({ containerRef }) {
  const pathRef = useRef(null);
  const dotRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 75%", "end 40%"] });

  const moveDot = (progress) => {
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!path || !dot) return;
    const point = path.getPointAtLength(path.getTotalLength() * progress);
    dot.setAttribute("cx", point.x.toFixed(1));
    dot.setAttribute("cy", point.y.toFixed(1));
    dot.style.opacity = progress > 0.002 ? "1" : "0";
  };

  useMotionValueEvent(scrollYProgress, "change", moveDot);
  useEffect(() => moveDot(scrollYProgress.get()), [scrollYProgress]);

  return (
    <svg className="stroke-svg" viewBox="0 0 1200 1500" preserveAspectRatio="xMidYMin meet" fill="none" aria-hidden="true">
      <path d={PATH} className="stroke-track" strokeWidth="12" strokeLinecap="round" />
      <motion.path
        ref={pathRef}
        d={PATH}
        className="stroke-draw"
        strokeWidth="12"
        strokeLinecap="round"
        style={{ pathLength: scrollYProgress }}
      />
      <circle ref={dotRef} className="stroke-dot" r="17" cx="90" cy="60" />
    </svg>
  );
}
