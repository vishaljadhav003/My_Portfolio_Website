import { AnimatePresence, motion } from "framer-motion";
import { setTheme, useThemeAttr } from "../hooks.js";

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

function Sun() {
  return (
    <motion.svg
      key="sun"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <circle cx="12" cy="12" r="4" />
      {RAYS.map((angle) => (
        <line
          key={angle}
          x1="12"
          y1="2.6"
          x2="12"
          y2="4.6"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
    </motion.svg>
  );
}

function Moon() {
  return (
    <motion.svg
      key="moon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      exit={{ rotate: -90, scale: 0.4, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
    </motion.svg>
  );
}

export default function ThemeToggle() {
  const theme = useThemeAttr();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? <Moon key="moon" /> : <Sun key="sun" />}
      </AnimatePresence>
    </button>
  );
}
