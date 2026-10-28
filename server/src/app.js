import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { HttpError, Router, readJson, sendEmpty, streamNdjson, sendJson } from "./http.js";
import { RateLimiter, buildCsp, clientIp, hashIp, securityHeaders } from "./security.js";
import { createAnalytics } from "./analytics.js";
import { createStaticServer } from "./static.js";
import { registerPublicRoutes } from "./routes/public.js";
import { registerAdminRoutes } from "./routes/admin.js";

/** SHA-256 of every inline <script> in the built pages, so the CSP can allow them without 'unsafe-inline'. */
export function inlineScriptHashes(dir) {
  const hashes = new Set();
  const visit = (folder) => {
    let entries = [];
    try {
      entries = readdirSync(folder);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(folder, name);
      if (statSync(full).isDirectory()) {
        if (name !== "assets") visit(full);
      } else if (name.endsWith(".html")) {
        const html = readFileSync(full, "utf8");
        for (const match of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)) {
          hashes.add(createHash("sha256").update(match[1]).digest("base64"));
        }
      }
    }
  };
  visit(dir);
  return [...hashes];
}

/**
 * Builds the request handler. Everything outside is passed in, so tests can use an
 * in-memory database, a fake mailer and a fake clock.
 */
export function createApp({ config, db, mailer, assistant, fetchImpl = fetch, now = () => new Date(), limiter = new RateLimiter() }) {
  const analytics = createAnalytics({ db, tzOffsetMinutes: config.tzOffsetMinutes, now });
  const router = new Router();
  const deps = { config, db, mailer, assistant, analytics, fetchImpl, now };
  registerPublicRoutes(router, deps);
  registerAdminRoutes(router, deps);

  const headers = securityHeaders({
    production: config.production,
    csp: buildCsp({ scriptHashes: inlineScriptHashes(config.staticDir), extraConnect: config.cspExtraConnect }),
  });
  const serveStatic = createStaticServer({ dir: config.staticDir, headers });

  const allowedHosts = (req) => {
    const hosts = new Set([String(req.headers.host || "")]);
    if (config.siteUrl) hosts.add(new URL(config.siteUrl).host);
    if (config.trustProxy && req.headers["x-forwarded-host"]) hosts.add(String(req.headers["x-forwarded-host"]));
    return hosts;
  };

  /** Browsers send Origin on cross-site writes. If it is not this site, refuse. */
  function assertSameOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return;
    let host;
    try {
      host = new URL(origin).host;
    } catch {
      throw new HttpError(403, "Bad origin.");
    }
    // While developing, the site runs on a Vite port (5173, 5174, ...) and the API on 4000, so any local port is fine.
    if (!config.production && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)) return;
    if (!allowedHosts(req).has(host)) throw new HttpError(403, "Cross-site requests are not allowed.");
  }

  async function handleApi(req, res, url) {
    const found = router.match(req.method, url.pathname);
    if (!found) throw new HttpError(404, "Not found.");
    if (found.methodNotAllowed) throw new HttpError(405, "Method not allowed.");
    if (req.method !== "GET") assertSameOrigin(req);

    const ip = clientIp(req, config.trustProxy);
    const ctx = {
      req,
      res,
      url,
      params: found.params,
      limiter,
      ip,
      ipHash: hashIp(ip, config.ipSalt),
      host: String(req.headers.host || "").split(":")[0],
      userAgent: String(req.headers["user-agent"] || ""),
      readBody: (limit) => readJson(req, limit),
      json: (status, data, extra) => sendJson(res, status, data, extra),
      empty: (status, extra) => sendEmpty(res, status, extra),
      stream: (produce) => streamNdjson(req, res, produce),
    };
    await found.handler(ctx);
  }

  async function handle(req, res) {
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        await handleApi(req, res, url);
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "Method not allowed.");
      await serveStatic(req, res, url.pathname);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (error instanceof HttpError) {
        const extra = error.extra.retryAfter ? { "Retry-After": String(error.extra.retryAfter) } : {};
        sendJson(res, error.status, { ok: false, error: error.message }, extra);
        return;
      }
      console.error("request failed:", error);
      sendJson(res, 500, { ok: false, error: "Something went wrong on the server." });
    }
  }

  return { handle, analytics, limiter, close: () => limiter.close() };
}
