import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useSeo } from "../hooks.js";
import { SITE, education, experience, seo, skills } from "../data.js";
import ScrollFillText from "../components/ScrollFillText.jsx";
import TiltCard from "../components/TiltCard.jsx";
import Marquee from "../components/Marquee.jsx";
import { Icon, IconBadge } from "../components/Icons.jsx";

const reveal = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: false, amount: 0.25 },
  transition: { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] },
};

function Profile() {
  const facts = [
    { icon: "pin", label: "Based in", value: SITE.location },
    { icon: "briefcase", label: "Company", value: SITE.company },
    { icon: "sparkle", label: "Role", value: SITE.role },
    { icon: "graduation", label: "Degree", value: "B.Sc. Computer Science" },
    { icon: "globe", label: "Languages", value: "English, Hindi, Marathi" },
  ];
  return (
    <div className="container profile">
      <motion.div className="profile-photo" {...reveal}>
        <img src="/vishal-jadhav-pune.jpg" alt="Vishal Jadhav, software engineer in Pune, India" width="511" height="639" loading="lazy" decoding="async" />
      </motion.div>
      <motion.dl className="facts" {...reveal}>
        {facts.map((fact) => (
          <div className="fact" key={fact.label}>
            <Icon name={fact.icon} size={22} />
            <div>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          </div>
        ))}
      </motion.dl>
    </div>
  );
}

function Experience() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const dotTop = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="section" aria-labelledby="exp-title">
      <div className="container">
        <motion.h2 id="exp-title" className="section-title" {...reveal}>
          Where I work.
        </motion.h2>

        <div ref={ref} className="timeline">
          <div className="timeline-track" aria-hidden="true">
            <motion.span className="timeline-line" style={{ scaleY: scrollYProgress }} />
            <motion.span className="timeline-dot" style={{ top: dotTop }} />
          </div>

          <motion.article className="job" {...reveal}>
            <div className="job-head">
              <h3>{experience.role}</h3>
              <p className="job-company">{experience.company}</p>
              <p className="job-period">
                {experience.period} &middot; {experience.place}
              </p>
            </div>
            <ul className="job-points">
              {experience.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section className="section" aria-labelledby="skills-title">
      <div className="container">
        <motion.h2 id="skills-title" className="section-title" {...reveal}>
          The toolkit.
        </motion.h2>
        <div className="skill-grid">
          {skills.map((skill, i) => (
            <motion.div
              key={skill.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.6, delay: (i % 4) * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <TiltCard className="skill-card">
                <IconBadge name={skill.icon} />
                <h3>{skill.title}</h3>
                <ul className="tags">
                  {skill.tags.map((tag) => (
                    <li className="tag" key={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Education() {
  return (
    <section className="section" aria-labelledby="edu-title">
      <div className="container">
        <motion.h2 id="edu-title" className="section-title" {...reveal}>
          Education.
        </motion.h2>
        <div className="edu-grid">
          {education.map((item, i) => (
            <motion.article
              key={item.title}
              className="edu-card"
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <p className="edu-period">{item.period}</p>
              <h3>{item.title}</h3>
              <p>{item.place}</p>
              <p className="edu-score">{item.score}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function About() {
  useSeo({ ...seo["/about"], path: "/about" });
  return (
    <>
      <section className="page-hero" aria-labelledby="about-title">
        <div className="container">
          <motion.h1
            id="about-title"
            className="page-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
          >
            About me
          </motion.h1>
          <ScrollFillText text={SITE.summary} className="about-summary" />
        </div>
      </section>
      <Profile />
      <Marquee />
      <Experience />
      <Skills />
      <Education />
    </>
  );
}
