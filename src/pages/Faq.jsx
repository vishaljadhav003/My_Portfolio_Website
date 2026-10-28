import { motion } from "framer-motion";
import { useSeo } from "../hooks.js";
import { SITE, faq, seo } from "../data.js";
import Accordion from "../components/Accordion.jsx";

export default function Faq() {
  useSeo({ ...seo["/faq"], path: "/faq" });
  return (
    <>
      <section className="page-hero" aria-labelledby="faq-title">
        <div className="container">
          <motion.h1
            id="faq-title"
            className="page-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
          >
            Questions, answered.
          </motion.h1>
          <p className="lead">
            The short version of who I am and how I work. Anything else, write to{" "}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>
        </div>
      </section>
      <section className="section faq-section" aria-label="Frequently asked questions">
        <div className="container faq-wrap">
          <Accordion items={faq} />
        </div>
      </section>
    </>
  );
}
