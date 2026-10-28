import { motion } from "framer-motion";
import BrowserMock from "./BrowserMock.jsx";
import { Icon } from "./Icons.jsx";

export default function ProjectCard({ project }) {
  const host = project.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <motion.article
      className="project-card"
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      viewport={{ once: false, amount: 0.2 }}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
    >
      <div className="project-media">
        <BrowserMock project={project} />
      </div>
      <div className="project-body">
        <div className="project-meta">
          <span className="pill">{project.kind}</span>
          <span className="status">{project.status}</span>
        </div>
        <h3 className="project-title">{project.title}</h3>
        <p className="project-summary">{project.summary}</p>
        <ul className="project-points">
          {project.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <ul className="tags" aria-label="Technologies">
          {project.stack.map((tag) => (
            <li key={tag} className="tag">
              {tag}
            </li>
          ))}
        </ul>
        <a className="project-link" href={project.url} target="_blank" rel="noopener noreferrer" title={host} aria-label={`Visit ${project.title} (${host}), opens in a new tab`}>
          Visit live site
          <Icon name="external" size={18} animated={false} />
        </a>
      </div>
    </motion.article>
  );
}
