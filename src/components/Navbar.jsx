import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useRouter } from "../router.jsx";
import { SITE } from "../data.js";
import { cx } from "../utils.js";
import ThemeToggle from "./ThemeToggle.jsx";
import { Icon } from "./Icons.jsx";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];


function Monogram() {
  const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 } };
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <motion.path d="M5 9l5.5 14L16 9" stroke="var(--accent)" {...draw} transition={{ duration: 0.9, delay: 0.2 }} />
      <motion.path d="M25 9v9a4.5 4.5 0 0 1-4.5 4.5H19" stroke="currentColor" {...draw} transition={{ duration: 0.9, delay: 0.5 }} />
    </svg>
  );
}

export default function Navbar() {
  const { path } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  // Hide on scroll down, show on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 240);
        last = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [path]);

  // Freeze scrolling behind the mobile menu.
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (window.__lenis) (open ? window.__lenis.stop() : window.__lenis.start());
    return () => document.documentElement.classList.remove("menu-open");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={cx("nav", scrolled && "is-scrolled", hidden && !open && "is-hidden")}>
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="Vishal Jadhav, home">
          <Monogram />
          <span className="brand-name">Vishal Jadhav</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((link) => {
            const active = path === link.to;
            return (
              <Link key={link.to} to={link.to} className={cx("nav-link", active && "is-active")} aria-current={active ? "page" : undefined}>
                {active && (
                  <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                )}
                <span className="nav-label">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="nav-actions">
          <ThemeToggle />
          <Link className="btn btn-primary btn-sm nav-cta" to="/contact">
            Hire me
          </Link>
          <button
            type="button"
            className="burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? "close" : "menu"} size={24} animated={false} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <nav aria-label="Mobile">
              {LINKS.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.07, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <Link to={link.to} className={cx("menu-link", path === link.to && "is-active")}>
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <a className="btn btn-primary" href={`mailto:${SITE.email}`} data-track="Email (menu)">
              {SITE.email}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
