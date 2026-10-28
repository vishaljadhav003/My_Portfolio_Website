import { useEffect, useState } from "react";

export function useMedia(query, fallback = false) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : fallback
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");

/** The DOM attribute is the single source of truth for the theme. */
export function useThemeAttr() {
  const read = () => document.documentElement.getAttribute("data-theme") || "dark";
  const [theme, setThemeState] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeState(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

export function setTheme(next) {
  const root = document.documentElement;
  root.classList.add("theme-anim");
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch (error) {
    /* storage can be blocked; the theme still applies for this visit */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "dark" ? "#04080B" : "#EEF5F3");
  window.setTimeout(() => root.classList.remove("theme-anim"), 650);
}

function setAttr(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el && value) el.setAttribute(attr, value);
}

/** Updates title and meta tags for the current route. */
export function useSeo({ title, description, path }) {
  useEffect(() => {
    document.title = title;
    setAttr('meta[name="description"]', "content", description);
    setAttr('meta[property="og:title"]', "content", title);
    setAttr('meta[property="og:description"]', "content", description);
    setAttr('meta[name="twitter:title"]', "content", title);
    setAttr('meta[name="twitter:description"]', "content", description);
    const base = (import.meta.env && import.meta.env.VITE_SITE_URL) || "";
    if (base) {
      const url = base.replace(/\/$/, "") + (path === "/" ? "/" : path);
      setAttr('link[rel="canonical"]', "href", url);
      setAttr('meta[property="og:url"]', "content", url);
    }
  }, [title, description, path]);
}

export function scrollToTop() {
  if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
}
