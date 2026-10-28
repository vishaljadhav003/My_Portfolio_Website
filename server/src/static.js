import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { gzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".wasm": "application/wasm",
};
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".xml", ".txt", ".svg"]);

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

/** Serves the built site. Unknown URLs get the real 404 page with a 404 status. */
export function createStaticServer({ dir, headers = {} }) {
  const root = normalize(dir);
  const compressed = new Map();

  async function resolveFile(pathname) {
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return null;
    }
    if (decoded.includes("\0")) return null;

    const target = normalize(join(root, decoded));
    if (target !== root && !target.startsWith(root + sep)) return null;

    if (extname(target)) return (await exists(target)) ? target : null;
    const page = join(target, "index.html");
    return (await exists(page)) ? page : null;
  }

  async function send(req, res, file, status) {
    const info = await stat(file);
    const type = extname(file);
    const hashedAsset = /[\\/]assets[\\/]/.test(file);
    const etag = `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
    const base = {
      ...headers,
      "Content-Type": TYPES[type] || "application/octet-stream",
      "Cache-Control": type === ".html" ? "no-cache" : hashedAsset ? "public, max-age=31536000, immutable" : "public, max-age=86400",
      ETag: etag,
      Vary: "Accept-Encoding",
    };

    if (status === 200 && req.headers["if-none-match"] === etag) {
      res.writeHead(304, base);
      res.end();
      return;
    }

    const wantsGzip = COMPRESSIBLE.has(type) && /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""));
    if (wantsGzip) {
      let entry = compressed.get(file);
      if (!entry || entry.etag !== etag) {
        entry = { etag, body: await gzipAsync(await readFile(file)) };
        compressed.set(file, entry);
      }
      res.writeHead(status, { ...base, "Content-Encoding": "gzip", "Content-Length": entry.body.length });
      res.end(req.method === "HEAD" ? undefined : entry.body);
      return;
    }

    res.writeHead(status, { ...base, "Content-Length": info.size });
    if (req.method === "HEAD") res.end();
    else createReadStream(file).pipe(res);
  }

  return async function serve(req, res, pathname) {
    const file = await resolveFile(pathname);
    if (file) return send(req, res, file, 200);

    const notFound = join(root, "404.html");
    if (await exists(notFound)) return send(req, res, notFound, 404);
    res.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  };
}
