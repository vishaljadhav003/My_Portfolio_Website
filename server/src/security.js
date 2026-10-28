import { createHash, timingSafeEqual } from "node:crypto";
import { services } from "../../src/data.js";

// ---------- Request identity ----------

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket?.remoteAddress || "unknown";
}

/** Raw IPs are never stored. A salted hash is enough for rate limits and abuse checks. */
export function hashIp(ip, salt) {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

// ---------- Rate limiting ----------

/** Fixed-window limiter held in memory. Fine for one server process; use Redis for several. */
export class RateLimiter {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.hits = new Map();
    this.timer = setInterval(() => this.sweep(), 60_000);
    this.timer.unref?.();
  }

  /** Returns { ok, retryAfter } and counts this attempt. */
  hit(key, limit, windowMs) {
    const time = this.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= time) {
      this.hits.set(key, { count: 1, resetAt: time + windowMs });
      return { ok: true, retryAfter: 0 };
    }
    entry.count += 1;
    if (entry.count > limit) {
      return { ok: false, retryAfter: Math.ceil((entry.resetAt - time) / 1000) };
    }
    return { ok: true, retryAfter: 0 };
  }

  reset(key) {
    this.hits.delete(key);
  }

  sweep() {
    const time = this.now();
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= time) this.hits.delete(key);
    }
  }

  close() {
    clearInterval(this.timer);
  }
}

// ---------- Response headers ----------

export function buildCsp({ scriptHashes = [], extraConnect = [] } = {}) {
  const scripts = ["'self'", "'wasm-unsafe-eval'", ...scriptHashes.map((hash) => `'sha256-${hash}'`)];
  const connect = ["'self'", "https://prod.spline.design", "https://*.spline.design", ...extraConnect];
  return [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self' blob:",
    "media-src 'self' blob: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders({ production, csp }) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": csp,
  };
  if (production) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  return headers;
}

// ---------- Input cleaning ----------

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/** Trims, removes control characters and caps the length. Always returns a string. */
export function clean(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL, "").trim().slice(0, max);
}

/** Single-line version for names, subjects and labels. */
export function cleanLine(value, max) {
  return clean(value, max * 2).replace(/\s+/g, " ").slice(0, max);
}

const VISITOR_ID = /^[A-Za-z0-9-]{16,64}$/;
export const isVisitorId = (value) => typeof value === "string" && VISITOR_ID.test(value);

/** Only a path, never a query string or a full URL. */
export function cleanPath(value) {
  const path = cleanLine(value, 200).split("?")[0].split("#")[0];
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

/** Referrer reduced to its host, and dropped when it is the site itself. */
export function referrerHost(value, ownHost) {
  try {
    const host = new URL(String(value)).hostname.replace(/^www\./, "").slice(0, 100);
    return host && host !== ownHost?.replace(/^www\./, "") ? host : null;
  } catch {
    return null;
  }
}

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python-requests|node-fetch/i;
export const isBot = (userAgent = "") => BOT.test(userAgent);

export function deviceFrom(userAgent = "") {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

// ---------- Inquiry validation ----------

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
const serviceValues = new Set(services.map((service) => service.value));

/** Returns { value, errors }. `errors` is an object keyed by field. */
export function validateInquiry(body) {
  const errors = {};
  const name = cleanLine(body.name, 100);
  const email = cleanLine(body.email, 150).toLowerCase();
  const phone = cleanLine(body.phone, 30);
  const service = cleanLine(body.service, 40);
  const message = clean(body.message, 2000);

  if (name.length < 2) errors.name = "Please enter your name.";
  if (!EMAIL.test(email)) errors.email = "Please enter a valid email address.";
  const digits = phone.replace(/[\s().-]/g, "");
  if (!/^\+?\d{7,15}$/.test(digits)) errors.phone = "Please enter a valid contact number.";
  if (!serviceValues.has(service)) errors.service = "Please choose what you are inquiring about.";
  if (message.length < 10) errors.message = "Please write at least a few words (10 characters).";

  return { value: { name, email, phone: digits, service, message }, errors };
}
