import { useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { gsap } from "gsap";
import { projects } from "../data.js";
import { useReducedMotion } from "../hooks.js";
import BrowserMock from "./BrowserMock.jsx";
import ProjectCard from "./ProjectCard.jsx";
import { Link } from "../router.jsx";

// Featured work as a stack of cards. Scrolling plays a GSAP timeline: the front card
// rotates away and flies off, and the cards behind it step forward. Framer Motion supplies
// the scroll progress, GSAP does the tweening.

const FAN_ROTATION = [-2, 5, -6, 8];
const STEP_Y = 30;
const STEP_SCALE = 0.06;

const restState = (depth) => ({
  y: depth * STEP_Y,
  scale: 1 - depth * STEP_SCALE,
  rotate: FAN_ROTATION[depth % FAN_ROTATION.length],
});

function StackCard({ project }) {
  return (
    <>
      <BrowserMock project={project} large />
      <div className="stack-info">
        <div className="stack-info-head">
          <h3>{project.title}</h3>
          <span className="pill">{project.kind}</span>
        </div>
        <p>{project.summary}</p>
        <ul className="tags" aria-label="Technologies">
          {project.stack.slice(0, 4).map((tag) => (
            <li key={tag} className="tag">
              {tag}
            </li>
          ))}
        </ul>
        <a className="project-link" href={project.url} target="_blank" rel="noopener noreferrer">
          Visit site
        </a>
      </div>
    </>
  );
}

export default function CardStack() {
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);
  const timelineRef = useRef(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const count = projects.length;

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  useLayoutEffect(() => {
    if (reduced) return undefined;
    const cards = cardRefs.current.filter(Boolean);
    if (cards.length !== count) return undefined;

    const context = gsap.context(() => {
      cards.forEach((card, i) => {
        gsap.set(card, { ...restState(i), x: 0, zIndex: count - i, transformOrigin: "50% 90%" });
      });

      const timeline = gsap.timeline({ paused: true });
      for (let step = 0; step < count - 1; step++) {
        const direction = step % 2 === 0 ? 1 : -1;

        // The front card rotates away and leaves.
        timeline.fromTo(
          cards[step],
          { ...restState(0), x: 0 },
          { x: direction * 135 + "vw", y: -70, rotate: direction * 34, duration: 1, ease: "power2.in", immediateRender: false },
          step
        );

        // Every card behind it moves one place forward.
        for (let j = step + 1; j < count; j++) {
          const from = restState(j - step);
          const to = restState(j - step - 1);
          timeline.fromTo(
            cards[j],
            { ...from },
            { ...to, duration: 1, ease: "power2.inOut", immediateRender: false },
            step
          );
        }
      }
      timelineRef.current = timeline;
      timeline.progress(scrollYProgress.get());
    }, sectionRef);

    return () => {
      timelineRef.current = null;
      context.revert();
    };
  }, [reduced, count, scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (timelineRef.current) timelineRef.current.progress(progress);
    setActive(Math.min(count - 1, Math.max(0, Math.round(progress * (count - 1)))));
  });

  if (reduced) {
    return (
      <section className="section" aria-labelledby="work-title">
        <div className="container">
          <h2 id="work-title" className="section-title">Selected work</h2>
          <div className="projects-grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="stack" style={{ "--steps": count - 1 }} aria-labelledby="work-title">
      <div className="stack-sticky">
        <div className="stack-head container">
          <h2 id="work-title" className="section-title">Selected work</h2>
          <p className="stack-hint">Scroll to flip through the stack</p>
        </div>

        <div className="stack-stage">
          {projects.map((project, index) => (
            <article
              key={project.id}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="stack-card"
              aria-label={project.title}
            >
              <StackCard project={project} />
            </article>
          ))}
        </div>

        <div className="stack-foot container">
          <span className="stack-count" aria-live="polite">
            {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")} &middot; {projects[active].title}
          </span>
          <div className="stack-bar" aria-hidden="true">
            <motion.span style={{ scaleX: scrollYProgress }} />
          </div>
          <Link to="/projects" className="btn btn-ghost btn-sm">
            All projects
          </Link>
        </div>
      </div>
    </section>
  );
}
