import { useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "../router.jsx";
import { useReady } from "../context.js";
import { useSeo } from "../hooks.js";
import { SITE, approach, seo } from "../data.js";
import SplitText from "../components/SplitText.jsx";
import PhotoGL from "../components/PhotoGL.jsx";
import NeuralField from "../components/NeuralField.jsx";
import Marquee from "../components/Marquee.jsx";
import ScatterText from "../components/ScatterText.jsx";
import ScrollStroke from "../components/ScrollStroke.jsx";
import CardStack from "../components/CardStack.jsx";
import Terminal from "../components/Terminal.jsx";
import SiteStats from "../components/SiteStats.jsx";
import Security from "../components/Security.jsx";
import SplineLab from "../components/SplineLab.jsx";
import { Icon, IconBadge } from "../components/Icons.jsx";

function Hero() {
  const ready = useReady();
  const rise = (delay) => ({
    initial: { opacity: 0, y: 22 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { duration: 0.8, delay, ease: [0.2, 0.7, 0.2, 1] },
  });

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div className="hero-copy">
          <motion.p className="hero-status" {...rise(0.1)}>
            <span className="pulse-dot" aria-hidden="true" />
            Currently at {SITE.company}
          </motion.p>

          <h1 id="hero-title" className="hero-title" aria-label={SITE.name}>
            <SplitText text="Vishal" ready={ready} delay={0.15} />
            <br />
            <SplitText text="Jadhav" ready={ready} delay={0.4} />
          </h1>

          <motion.p className="hero-role" {...rise(0.7)}>
            {SITE.role}
          </motion.p>
          <motion.p className="hero-lede" {...rise(0.8)}>
            I build web products with React, Node.js and MySQL, add AI assistants where they help, and test them like
            an attacker so they stay safe.
          </motion.p>
          <motion.div {...rise(0.85)}>
            <Terminal />
          </motion.div>

          <motion.div className="hero-cta" {...rise(0.9)}>
            <Link className="btn btn-primary" to="/projects">
              View projects
            </Link>
            <Link className="btn btn-ghost" to="/contact">
              Contact me
            </Link>
          </motion.div>

          <motion.ul className="hero-facts" {...rise(1.0)}>
            <li>
              <Icon name="briefcase" size={20} animated={false} />
              10 months in production
            </li>
            <li>
              <Icon name="cube" size={20} animated={false} />
              4 apps built and maintained
            </li>
            <li>
              <Icon name="graduation" size={20} animated={false} />
              B.Sc. Computer Science, CGPA 8.25
            </li>
          </motion.ul>
          <motion.div {...rise(1.1)}>
            <SiteStats className="hero-stats" />
          </motion.div>
        </div>

        <div className="hero-visual">
          <NeuralField className="neural" />
          <motion.div
            className="photo-wrap"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <PhotoGL src="/vishal.jpg" alt="Portrait of Vishal Jadhav" width={511} height={639} ready={ready} />
          </motion.div>

          <motion.div
            className="chip chip-a"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon name="chip" size={18} animated={false} />
            AI Assistant, live in production
          </motion.div>
          <motion.div
            className="chip chip-b"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon name="code" size={18} animated={false} />
            React &middot; Node &middot; MySQL
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Approach() {
  const ref = useRef(null);
  return (
    <section ref={ref} className="section approach" aria-labelledby="approach-title">
      <ScrollStroke containerRef={ref} />
      <div className="container">
        <motion.h2
          id="approach-title"
          className="section-title"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          Intelligence, structure and motion in every build.
        </motion.h2>

        <ul className="approach-list">
          {approach.map((item, i) => (
            <motion.li
              key={item.title}
              className="approach-item"
              initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.4 }}
              transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <IconBadge name={item.icon} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Home() {
  useSeo({ ...seo["/"], path: "/" });
  return (
    <>
      <Hero />
      <Marquee />
      <ScatterText text="I turn ideas into fast, intelligent web products." />
      <Approach />
      <Security />
      <CardStack />
      <SplineLab />
    </>
  );
}
