export const cx = (...parts) => parts.filter(Boolean).join(" ");

/** "#19E6A2" -> [0.10, 0.90, 0.64]. Falls back when the value is not a 6-digit hex. */
export function hexToRgb01(hex, fallback = [0.1, 0.9, 0.64]) {
  const match = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!match) return fallback;
  const n = parseInt(match[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Reads a CSS custom property from :root as an rgb triple in 0..1. */
export function cssColor01(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return hexToRgb01(value, fallback);
}
