import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

// Port of the ibelick/spotlight component. A soft light that follows the pointer inside its parent.
// It lights up with the accent colour from the theme instead of Tailwind's zinc gradient.

export default function Spotlight({ size = 260, className = "" }) {
  const ref = useRef(null);
  const [parent, setParent] = useState(null);
  const [hovered, setHovered] = useState(false);

  const mouseX = useSpring(0, { bounce: 0 });
  const mouseY = useSpring(0, { bounce: 0 });
  const left = useTransform(mouseX, (value) => `${value - size / 2}px`);
  const top = useTransform(mouseY, (value) => `${value - size / 2}px`);

  useEffect(() => {
    if (ref.current && ref.current.parentElement) setParent(ref.current.parentElement);
  }, []);

  useEffect(() => {
    if (!parent) return undefined;
    const onMove = (event) => {
      const rect = parent.getBoundingClientRect();
      mouseX.set(event.clientX - rect.left);
      mouseY.set(event.clientY - rect.top);
    };
    const onEnter = () => setHovered(true);
    const onLeave = () => setHovered(false);
    parent.addEventListener("pointermove", onMove);
    parent.addEventListener("pointerenter", onEnter);
    parent.addEventListener("pointerleave", onLeave);
    return () => {
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerenter", onEnter);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, [parent, mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      className={`spotlight ${className}`}
      aria-hidden="true"
      style={{ width: size, height: size, left, top, opacity: hovered ? 1 : 0 }}
    />
  );
}
