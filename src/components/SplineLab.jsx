import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "../hooks.js";
import Spotlight from "./Spotlight.jsx";
import SplineScene from "./SplineScene.jsx";

// Interactive 3D card (Spline) with a pointer spotlight. The scene loads only when the card scrolls into view.

const SCENE = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

export default function SplineLab() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <section className="section spline-section" aria-labelledby="lab-title">
      <div className="container">
        <motion.div
          ref={ref}
          className="spline-card"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.25 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <Spotlight size={320} className="spotlight-a" />
          <div className="spline-copy">
            <p className="eyebrow">3D lab</p>
            <h2 id="lab-title" className="spline-title">
              Interactive 3D, built for the web.
            </h2>
            <p className="spline-text">
              Move your mouse or finger over the scene. I use real-time 3D to make interfaces memorable, and keep them
              light enough to run on a phone.
            </p>
          </div>
          <div className="spline-stage">{load && <SplineScene scene={SCENE} className="spline-canvas" />}</div>
        </motion.div>
      </div>
    </section>
  );
}
