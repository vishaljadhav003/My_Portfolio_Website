import { motion } from "framer-motion";
import { security } from "../data.js";
import { Icon, IconBadge } from "./Icons.jsx";
import { Link } from "../router.jsx";

// Red team / blue team section.

const TEAMS = [
  { key: "red", data: security.red, icon: "bug" },
  { key: "blue", data: security.blue, icon: "shield" },
];

export default function Security() {
  return (
    <section className="section security" aria-labelledby="security-title">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <p className="eyebrow">
            <Icon name="lock" size={16} animated={false} /> Cyber security
          </p>
          <h2 id="security-title" className="section-title">
            {security.title}
          </h2>
          <p className="lead">{security.text}</p>
        </motion.div>

        <div className="security-grid">
          {TEAMS.map(({ key, data, icon }, index) => (
            <motion.article
              key={key}
              className={`team team-${key}`}
              initial={{ opacity: 0, x: index === 0 ? -60 : 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <span className="team-scan" aria-hidden="true" />
              <IconBadge name={icon} />
              <h3>{data.title}</h3>
              <p className="team-tagline">{data.tagline}</p>
              <ul className="team-points">
                {data.points.map((point) => (
                  <li key={point}>
                    <Icon name="check" size={18} strokeWidth={2.2} animated={false} />
                    {point}
                  </li>
                ))}
              </ul>
              <ul className="tags" aria-label={`${data.title} tools`}>
                {data.tools.map((tool) => (
                  <li key={tool} className="tag tag-mono">
                    {tool}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>

        <p className="security-note">
          <Icon name="eye" size={18} animated={false} />
          Testing is always done within an authorised scope. Need a security review?{" "}
          <Link to="/contact" data-track="Security CTA">Send an inquiry</Link>.
        </p>
      </div>
    </section>
  );
}
