import { ping } from "./api.js";

// Visitor tracking for the admin dashboard: page views, a heartbeat for "live visitors",
// clicks on links and buttons, and JavaScript errors. No cookies, no personal data.

const HEARTBEAT_MS = 20_000;
const MAX_ERRORS_PER_VISIT = 10;

export const isTracked = (path) => !path.startsWith("/admin");

let lastView = { path: "", time: 0 };

export function trackView(path) {
  if (!isTracked(path)) return;
  // React can run an effect twice in development; never count the same page twice in a row within a second.
  const now = Date.now();
  if (lastView.path === path && now - lastView.time < 1000) return;
  lastView = { path, time: now };
  ping("/api/track/view", { path, referrer: document.referrer });
}

function clickLabel(element) {
  const explicit = element.closest("[data-track]");
  if (explicit) return explicit.getAttribute("data-track");
  const target = element.closest("a, button");
  if (!target) return "";
  const text = (target.getAttribute("aria-label") || target.textContent || "").replace(/\s+/g, " ").trim();
  return text ? `${target.tagName === "A" ? "link" : "button"}: ${text}`.slice(0, 80) : "";
}

/** Starts heartbeat, click and error tracking. Returns a function that stops them. */
export function startTracking(getPath) {
  const beat = () => {
    if (document.visibilityState === "visible" && isTracked(getPath())) ping("/api/track/heartbeat", { path: getPath() });
  };
  const timer = window.setInterval(beat, HEARTBEAT_MS);
  document.addEventListener("visibilitychange", beat);

  const onClick = (event) => {
    if (!(event.target instanceof Element) || !isTracked(getPath())) return;
    const label = clickLabel(event.target);
    if (label) ping("/api/track/click", { label, path: getPath() });
  };
  document.addEventListener("click", onClick, { capture: true });

  let sent = 0;
  const report = (details) => {
    if (sent >= MAX_ERRORS_PER_VISIT) return;
    sent += 1;
    ping("/api/track/error", { path: getPath(), ...details });
  };
  const onError = (event) =>
    report({ message: event.message || "Script error", source: event.filename, line: event.lineno, col: event.colno, stack: event.error && event.error.stack });
  const onRejection = (event) => {
    const reason = event.reason;
    report({ message: `Unhandled rejection: ${(reason && reason.message) || String(reason)}`, stack: reason && reason.stack });
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", beat);
    document.removeEventListener("click", onClick, { capture: true });
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
