import { motion } from "framer-motion";
import { cx } from "../utils.js";

// 24x24 stroke icons. Each is a list of path strings that draw in one after another.
const ICONS = {
  code: ["M8 7l-5 5 5 5", "M16 7l5 5-5 5", "M14 4l-4 16"],
  layout: ["M3 5h18v14H3z", "M3 9h18", "M9 9v10"],
  server: ["M4 4h16v6H4z", "M4 14h16v6H4z", "M8 7h.01", "M8 17h.01"],
  database: [
    "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z",
    "M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6",
    "M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  ],
  cube: ["M12 2l9 5v10l-9 5-9-5V7z", "M12 12l9-5", "M12 12v10", "M12 12L3 7"],
  cycle: ["M21 12a9 9 0 0 1-15.5 6.2", "M3 12a9 9 0 0 1 15.5-6.2", "M18 2v4h-4", "M6 22v-4h4"],
  chip: [
    "M7 7h10v10H7z",
    "M10 10h4v4h-4z",
    "M9 3v4", "M15 3v4", "M9 17v4", "M15 17v4",
    "M3 9h4", "M3 15h4", "M17 9h4", "M17 15h4",
  ],
  search: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M21 21l-5-5"],
  mail: ["M3 5h18v14H3z", "M3 6l9 7 9-7"],
  phone: ["M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"],
  pin: ["M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  external: ["M7 17L17 7", "M8 7h9v9"],
  plus: ["M12 5v14", "M5 12h14"],
  briefcase: ["M3 7h18v13H3z", "M9 7V4h6v3", "M3 13h18"],
  graduation: ["M2 9l10-5 10 5-10 5z", "M6 11v5c0 1 3 3 6 3s6-2 6-3v-5"],
  globe: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M3 12h18", "M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"],
  sparkle: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"],
  menu: ["M4 8h16", "M4 16h16"],
  shield: ["M12 3l8 3v6c0 4.6-3.2 8-8 9-4.8-1-8-4.4-8-9V6z", "M9 12l2.2 2.2L15.5 10"],
  lock: ["M5 11h14v9H5z", "M8 11V8a4 4 0 0 1 8 0v3", "M12 15v2"],
  bug: ["M9 8a3 3 0 0 1 6 0v1H9z", "M8 9h8v6a4 4 0 0 1-8 0z", "M4 12h4", "M16 12h4", "M5 6l3 2", "M19 6l-3 2", "M5 19l3-2", "M19 19l-3-2"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  terminal: ["M3 5h18v14H3z", "M7 10l3 2.5L7 15", "M13 15h4"],
  arrowup: ["M12 19V5", "M5 12l7-7 7 7"],
  chat: ["M4 5h16v11H9l-5 4z", "M8 9.5h8", "M8 12.5h5"],
  send: ["M21 3L10 14", "M21 3l-7 18-4-7-7-4z"],
  heart: ["M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"],
  users: ["M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", "M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6", "M17 4.5a3.2 3.2 0 0 1 0 6", "M19 14.4c1.7.8 3 2.5 3 5.6"],
  pointer: ["M5 3l14 7-6 2-2 6z"],
  check: ["M5 12.5l4.5 4.5L19 7"],
  logout: ["M10 4H4v16h6", "M16 8l4 4-4 4", "M20 12H9"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13"],
  refresh: ["M20 11a8 8 0 0 0-14-4", "M4 4v4h4", "M4 13a8 8 0 0 0 14 4", "M20 20v-4h-4"],
  alert: ["M12 3l10 18H2z", "M12 10v5", "M12 18h.01"],
  close: ["M6 6l12 12", "M18 6L6 18"],
};

const pathVariants = (index) => ({
  hidden: { pathLength: 0, opacity: 0 },
  show: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.8, delay: index * 0.12, ease: "easeInOut" },
  },
});

export function Icon({ name, size = 24, strokeWidth = 1.7, animated = true, className }) {
  const paths = ICONS[name];
  if (!paths) return null;

  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("icon", className)}
      aria-hidden="true"
      focusable="false"
      initial={animated ? "hidden" : false}
      whileInView="show"
      viewport={{ once: false, amount: 0.6 }}
      whileHover={animated ? { rotate: [0, -10, 8, 0], scale: 1.12 } : undefined}
      transition={{ duration: 0.5 }}
    >
      {paths.map((d, index) => (
        <motion.path key={d} d={d} variants={pathVariants(index)} />
      ))}
    </motion.svg>
  );
}

/** Icon inside a badge with a slowly rotating conic ring. */
export function IconBadge({ name, size = 26, className }) {
  return (
    <span className={cx("icon-badge", className)}>
      <Icon name={name} size={size} />
    </span>
  );
}
