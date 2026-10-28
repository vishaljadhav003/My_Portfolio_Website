// Small helpers around Node's http module: errors, JSON bodies, cookies and responses.

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const MAX_BODY_BYTES = 16 * 1024;

export function readJson(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const type = String(req.headers["content-type"] || "");
    if (!type.toLowerCase().startsWith("application/json")) {
      reject(new HttpError(415, "Send JSON with Content-Type: application/json."));
      return;
    }
    const declared = Number(req.headers["content-length"] || 0);
    if (declared > limit) {
      reject(new HttpError(413, "Request body is too large."));
      return;
    }

    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new HttpError(413, "Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("not an object");
        }
        resolve(parsed);
      } catch {
        reject(new HttpError(400, "Body must be a JSON object."));
      }
    });
    req.on("error", () => reject(new HttpError(400, "Could not read the request.")));
  });
}

export function parseCookies(header = "") {
  const cookies = {};
  for (const part of String(header).split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (name) cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

export function serializeCookie(name, value, { maxAge, secure, path = "/api/admin" }) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, "HttpOnly", "SameSite=Strict", `Max-Age=${maxAge}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

export function sendEmpty(res, status = 204, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end();
}

/**
 * Newline-delimited JSON stream. `produce(send, signal)` writes events with send(); the signal
 * aborts when the visitor closes the page or presses stop, so upstream AI calls can be cancelled.
 */
export async function streamNdjson(req, res, produce) {
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const send = (event) => {
    if (!res.writableEnded && !res.destroyed) res.write(`${JSON.stringify(event)}\n`);
  };
  try {
    await produce(send, controller.signal);
  } catch (error) {
    if (!controller.signal.aborted) {
      console.error("chat stream failed:", error.message);
      send({ type: "error", message: "The assistant could not finish that answer." });
    }
  } finally {
    res.end();
  }
}

/** Minimal router: "/api/admin/inquiries/:id" style patterns. */
export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const names = [];
    const source = pattern.replace(/:([A-Za-z]+)/g, (_, name) => {
      names.push(name);
      return "([^/]+)";
    });
    this.routes.push({ method, regex: new RegExp(`^${source}$`), names, handler });
    return this;
  }

  get = (pattern, handler) => this.add("GET", pattern, handler);
  post = (pattern, handler) => this.add("POST", pattern, handler);
  patch = (pattern, handler) => this.add("PATCH", pattern, handler);
  delete = (pattern, handler) => this.add("DELETE", pattern, handler);

  match(method, pathname) {
    let pathMatched = false;
    for (const route of this.routes) {
      const found = route.regex.exec(pathname);
      if (!found) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      const params = {};
      route.names.forEach((name, index) => {
        params[name] = decodeURIComponent(found[index + 1]);
      });
      return { handler: route.handler, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  }
}
