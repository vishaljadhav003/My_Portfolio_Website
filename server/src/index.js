import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createAssistant } from "./assistant.js";
import { loadConfig } from "./config.js";
import { createDb } from "./db.js";
import { syncSearchStats } from "./gsc.js";
import { createMailer, createSmtpTransport } from "./mailer.js";
import { purgeExpiredSessions } from "./auth.js";

const here = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(join(here, "../.env"));
} catch {
  /* no .env file: use the real environment */
}

const config = loadConfig();
if (config.production && config.ipSalt.startsWith("dev-only")) {
  console.warn("IP_SALT is not set. Set a long random value in server/.env.");
}

const db = await createDb(config.db);
const mailer = createMailer({ transport: await createSmtpTransport(config.mail), mail: config.mail });
const assistant = createAssistant(config.assistant);
const app = createApp({ config, db, mailer, assistant });

const server = createServer((req, res) => app.handle(req, res));
server.requestTimeout = 20_000;
server.headersTimeout = 10_000;
server.listen(config.port, config.host, () => {
  console.log(`Server on http://localhost:${config.port}`);
  console.log(`  inquiry email: ${mailer.configured ? `on, sends to ${config.mail.to}` : "off (set SMTP_PASS)"}`);
  console.log(`  AI assistant:  ${assistant.usesAi ? `api.groq.com (${config.assistant.model})` : "built-in answers (set ANTHROPIC_API_KEY for AI)"}`);
});

// Housekeeping: stale presence rows and expired sessions, plus a daily Search Console sync when configured.
const hourly = setInterval(() => {
  app.analytics.pruneOld().catch((error) => console.error("prune failed:", error.message));
  purgeExpiredSessions(db).catch((error) => console.error("session purge failed:", error.message));
}, 3_600_000);
hourly.unref();

if (config.gsc.keyFile && config.gsc.siteUrl) {
  const sync = () => syncSearchStats({ config, db }).catch((error) => console.error("search console sync failed:", error.message));
  sync();
  setInterval(sync, 86_400_000).unref();
}

const shutdown = async () => {
  server.close();
  app.close();
  await db.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
