import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSeo } from "../hooks.js";
import { projects, seo } from "../data.js";
import { cx } from "../utils.js";
import ProjectCard from "../components/ProjectCard.jsx";

const FILTERS = ["All", "Full Stack", "Frontend"];

export default function Projects() {
  useSeo({ ...seo["/projects"], path: "/projects" });
  const [filter, setFilter] = useState("All");
  const visible = filter === "All" ? projects : projects.filter((project) => project.kind === filter);

  return (
    <>
      <section className="page-hero" aria-labelledby="projects-title">
        <div className="container">
          <motion.h1
            id="projects-title"
            className="page-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
          >
            Projects
          </motion.h1>
          <p className="lead">
            Production websites I have built and maintained, from a full stack company site with an AI assistant to
            responsive frontends for design and engineering firms.
          </p>
        </div>
      </section>

      <section className="section projects-section" aria-label="Project showcase">
        <div className="container">
          <div className="filters" role="group" aria-label="Filter projects">
            {FILTERS.map((name) => (
              <button
                key={name}
                type="button"
                className={cx("filter-btn", filter === name && "is-active")}
                aria-pressed={filter === name}
                onClick={() => setFilter(name)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="projects-grid">
            <AnimatePresence mode="popLayout">
              {visible.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}
