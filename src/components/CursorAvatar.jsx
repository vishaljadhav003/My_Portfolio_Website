import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useMedia, useReducedMotion } from "../hooks.js";

// Vishal's photo follows the mouse pointer. Only on devices with a real pointer (not phones or tablets).

const SIZE = 56;
const OFFSET = 30;
const INTERACTIVE = "a, button, input, select, textarea, summary, [role='button'], [data-cursor]";

export default function CursorAvatar() {
  const finePointer = useMedia("(hover: hover) and (pointer: fine)");
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const springX = useSpring(x, { stiffness: 220, damping: 22, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 220, damping: 22, mass: 0.6 });

  useEffect(() => {
    if (!finePointer || reduced) return undefined;

    const onMove = (event) => {
      x.set(event.clientX + OFFSET - SIZE / 2);
      y.set(event.clientY + OFFSET - SIZE / 2);
      setVisible(true);
      setActive(event.target instanceof Element && Boolean(event.target.closest(INTERACTIVE)));
    };
    const onLeave = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [finePointer, reduced, x, y]);

  if (!finePointer || reduced) return null;

  return (
    <motion.div className="cursor-avatar" aria-hidden="true" style={{ x: springX, y: springY }}>
      <motion.span
        className="cursor-avatar-body"
        animate={{ opacity: visible ? 1 : 0, scale: visible ? (active ? 1.35 : 1) : 0.4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <img src="/vishal.jpg" alt="" width="56" height="56" decoding="async" draggable="false" />
      </motion.span>
    </motion.div>
  );
}
