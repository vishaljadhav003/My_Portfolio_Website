import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../../src/app.js";
import { createAssistant } from "../../src/assistant.js";
import { hashPassword } from "../../src/auth.js";
import { loadConfig } from "../../src/config.js";
import { createMailer } from "../../src/mailer.js";
import { RateLimiter } from "../../src/security.js";
import { toSqlDateTime } from "../../src/time.js";
import { createSqliteDb } from "./sqlite-db.js";

export const ADMIN = { username: "vishal", password: "correct horse battery staple" };
export const VISITOR = "v1sitor-aaaaaaaaaaaa";

export const validInquiry = {
  name: "Asha Patil",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  service: "ai",
  message: "I need an AI assistant for my shop website.",
};

function makeSite() {
  const dir = mkdtempSync(join(tmpdir(), "site-"));
  mkdirSync(join(dir, "assets"));
  mkdirSync(join(dir, "about"));
  writeFileSync(join(dir, "index.html"), `<!doctype html><title>Home</title><script>document.title="x"</script><div id="root">home page body ${"x".repeat(2000)}</div>`);
  writeFileSync(join(dir, "about", "index.html"), "<!doctype html><title>About</title>about page");
  writeFileSync(join(dir, "404.html"), "<!doctype html><title>Missing</title>not found page");
  writeFileSync(join(dir, "assets", "app-123.js"), "console.log('app');");
  writeFileSync(join(dir, "secret-outside.txt"), "should be reachable only inside dir");
  return dir;
}

/** Starts the real HTTP server on a random port with an in-memory database. */
export async function startApp({ env = {}, smtp = "ok", apiKey = "", baseUrl = "", fetchImpl, seedAdmin = true } = {}) {
  const staticDir = makeSite();
  const config = loadConfig({ NODE_ENV: "test", STATIC_DIR: staticDir, IP_SALT: "test-salt", ...env });
  const db = createSqliteDb();
  const clock = { time: new Date("2026-10-26T06:00:00Z") };
  const sent = [];

  const transport =
    smtp === "none"
      ? null
      : {
          async sendMail(options) {
            if (smtp === "fail") throw new Error("SMTP down");
            sent.push(options);
          },
        };

  const app = createApp({
    config,
    db,
    mailer: createMailer({ transport, mail: config.mail }),
    assistant: createAssistant({ apiKey, baseUrl, model: "test-model", fetchImpl }),
    fetchImpl,
    now: () => new Date(clock.time),
    limiter: new RateLimiter(() => clock.time.getTime()),
  });

  if (seedAdmin) {
    await db.run("INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)", [
      ADMIN.username,
      await hashPassword(ADMIN.password),
      toSqlDateTime(clock.time),
    ]);
  }

  const server = createServer((req, res) => app.handle(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = (path, { method = "GET", json, headers = {}, cookie, body } = {}) =>
    fetch(base + path, {
      method,
      headers: {
        ...(json !== undefined ? { "content-type": "application/json" } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : body,
      redirect: "manual",
    });

  async function login(password = ADMIN.password, username = ADMIN.username) {
    const response = await call("/api/admin/login", { method: "POST", json: { username, password } });
    const cookie = (response.headers.getSetCookie()[0] || "").split(";")[0];
    return { response, cookie };
  }

  const authed = (cookie) => ({ cookie, headers: { "x-requested-with": "fetch" } });

  return {
    base,
    call,
    login,
    authed,
    db,
    clock,
    sent,
    config,
    advance(ms) {
      clock.time = new Date(clock.time.getTime() + ms);
    },
    async stop() {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
      app.close();
    },
  };
}
