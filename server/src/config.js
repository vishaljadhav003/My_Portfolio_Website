import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Reads settings from environment variables. Pass a plain object in tests. */
export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  const siteUrl = (env.SITE_URL || "").replace(/\/+$/, "");

  return {
    production,
    port: toInt(env.PORT, 4000),
    host: env.HOST || "0.0.0.0",
    siteUrl,
    trustProxy: env.TRUST_PROXY === "1",
    ipSalt: env.IP_SALT || "dev-only-salt-change-me",
    staticDir: resolve(env.STATIC_DIR || resolve(here, "../../dist")),
    tzOffsetMinutes: toInt(env.DASHBOARD_TZ_OFFSET_MIN, 330),
    db: {
      host: env.DB_HOST || "127.0.0.1",
      port: toInt(env.DB_PORT, 3306),
      user: env.DB_USER || "root",
      password: env.DB_PASSWORD || "",
      database: env.DB_NAME || "portfolio",
      ...(env.DB_SSL === "1" ? { ssl: { rejectUnauthorized: true } } : {}),
    },
    mail: {
      host: env.SMTP_HOST || "smtp.gmail.com",
      port: toInt(env.SMTP_PORT, 465),
      user: env.SMTP_USER || "vj042459@gmail.com",
      pass: env.SMTP_PASS || "",
      to: env.INQUIRY_TO || "vj042459@gmail.com",
    },
    session: {
      cookieName: "vj_admin",
      hours: toInt(env.SESSION_HOURS, 12),
      secureCookie: env.COOKIE_SECURE ? env.COOKIE_SECURE === "1" : production,
    },
    assistant: {
      // AI_* settings work with any OpenAI-compatible service (Groq, Gemini, OpenRouter). Without AI_BASE_URL, Claude is used.
      apiKey: env.AI_API_KEY || env.ANTHROPIC_API_KEY || "",
      baseUrl: env.AI_BASE_URL || "",
      model: env.AI_MODEL || env.ASSISTANT_MODEL || "claude-haiku-5-5",
    },
    gsc: {
      keyFile: env.GSC_SERVICE_ACCOUNT_FILE || "",
      siteUrl: env.GSC_SITE_URL || "",
    },
    cspExtraConnect: (env.CSP_EXTRA_CONNECT || "").split(/\s+/).filter(Boolean),
  };
}
