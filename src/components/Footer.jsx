import { motion } from "framer-motion";
import { Link } from "../router.jsx";
import { SITE } from "../data.js";
import { Icon } from "./Icons.jsx";
import SiteStats from "./SiteStats.jsx";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-cta">
        <h2 className="footer-title">Have a product in mind? Let&rsquo;s build it.</h2>
        <div className="footer-actions">
          <Link className="btn btn-primary" to="/contact">
            Send an inquiry
          </Link>
          <a className="btn btn-ghost" href={`mailto:${SITE.email}`} data-track="Email (footer)">
            {SITE.email}
          </a>
        </div>
      </div>

      <div className="container footer-grid">
        <ul className="footer-contact">
          <li>
            <Icon name="mail" size={20} />
            <a href={`mailto:${SITE.email}`} style={{textDecoration:"none"}}>{SITE.email}</a>
          </li>
          <li>
            <Icon name="phone" size={20} />
            <a href={SITE.phoneHref}style={{textDecoration:"none"}}>{SITE.phone}</a>
          </li>
          <li>
            <Icon name="pin" size={20} />
            <span>{SITE.location}</span>
          </li>
        </ul>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/" style={{textDecoration:"none"}}>Home</Link>
          <Link to="/about" style={{textDecoration:"none"}}>About</Link>
          <Link to="/projects" style={{textDecoration:"none"}}>Projects</Link>
          <Link to="/faq" style={{textDecoration:"none"}}>FAQ</Link>
          <Link to="/contact" style={{textDecoration:"none"}}>Contact</Link>
        </nav>
      </div>

      <motion.div
        className="footer-giant"
        aria-hidden="true"
        initial={{ y: "35%", opacity: 0 }}
        whileInView={{ y: "0%", opacity: 1 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
      >
        Vishal Jadhav
      </motion.div>

      <div className="container footer-bottom">
        <span>&copy; {new Date().getFullYear()} Vishal Jadhav</span>
        <SiteStats />
      </div>
    </footer>
  );
}
