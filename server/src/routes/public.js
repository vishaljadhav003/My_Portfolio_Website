import { HttpError } from "../http.js";
import { services } from "../../../src/data.js";
import { cleanConversation } from "../assistant.js";
import { CHAT_BODY_LIMIT, cleanChatRequest } from "../chatRequest.js";
import { clean, cleanLine, cleanPath, deviceFrom, isBot, isVisitorId, referrerHost, validateInquiry } from "../security.js";
import { dayKey, toSqlDateTime } from "../time.js";

const serviceLabel = Object.fromEntries(services.map((service) => [service.value, service.label]));

function limit(ctx, key, max, windowMs) {
  const result = ctx.limiter.hit(key, max, windowMs);
  if (!result.ok) {
    throw new HttpError(429, "Too many requests. Please try again later.", { retryAfter: result.retryAfter });
  }
}

function requireVisitor(body) {
  if (!isVisitorId(body.visitorId)) throw new HttpError(400, "Missing or invalid visitor id.");
  return body.visitorId;
}

export function registerPublicRoutes(router, deps) {
  const { db, mailer, analytics, assistant, config, now } = deps;

  router.get("/api/health", async (ctx) => {
    await db.get("SELECT 1 AS ok");
    ctx.json(200, { ok: true });
  });

  // ----- Contact form -----

  router.post("/api/inquiries", async (ctx) => {
    limit(ctx, `inquiry:ip:${ctx.ip}`, 5, 3_600_000);
    limit(ctx, "inquiry:all", 80, 86_400_000);

    const body = await ctx.readBody();

    // Hidden "company" field: people never see it, bots fill it in. Pretend it worked.
    if (clean(body.company, 100)) {
      ctx.json(200, { ok: true });
      return;
    }

    const { value, errors } = validateInquiry(body);
    if (Object.keys(errors).length) {
      ctx.json(422, { ok: false, errors });
      return;
    }

    const date = now();
    const result = await db.run(
      `INSERT INTO inquiries (name, email, phone, service, message, status, email_status, ip_hash, day, created_at)
       VALUES (?, ?, ?, ?, ?, 'new', 'pending', ?, ?, ?)`,
      [value.name, value.email, value.phone, value.service, value.message, ctx.ipHash, dayKey(date, config.tzOffsetMinutes), toSqlDateTime(date)]
    );

    let emailStatus;
    try {
      emailStatus = await mailer.sendInquiry(value, serviceLabel[value.service]);
    } catch (error) {
      emailStatus = "failed";
      console.error("inquiry email failed:", error.message);
    }
    await db.run("UPDATE inquiries SET email_status = ? WHERE id = ?", [emailStatus, result.insertId]);

    // A confirmation to the visitor. If it fails the inquiry is still saved and the owner was already told.
    try {
      await mailer.sendReceipt(value, serviceLabel[value.service], String(result.insertId));
    } catch (error) {
      console.error("receipt email failed:", error.message);
    }

    ctx.json(201, { ok: true, id: result.insertId });
  });

  // ----- AI assistant -----

  router.post("/api/chat", async (ctx) => {
    limit(ctx, `chat:ip:${ctx.ip}`, 20, 60_000);
    limit(ctx, `chat:hour:${ctx.ip}`, 120, 3_600_000);

    const body = await ctx.readBody();
    const conversation = cleanConversation(body.messages);
    if (!conversation) throw new HttpError(400, "Send a list of messages that ends with a question.");

    const reply = await assistant.reply(conversation);
    ctx.json(200, reply);
  });

  // Streaming chat: one JSON event per line (step, sources, delta, done, error). Accepts images and document text.
  router.post("/api/chat/stream", async (ctx) => {
    limit(ctx, `chatstream:ip:${ctx.ip}`, 12, 60_000);
    limit(ctx, `chatstream:hour:${ctx.ip}`, 80, 3_600_000);

    const request = cleanChatRequest(await ctx.readBody(CHAT_BODY_LIMIT));
    if (!request) throw new HttpError(400, "Send a list of messages that ends with a question.");

    await ctx.stream(async (send, signal) => {
      for await (const event of assistant.respond({ ...request, signal })) send(event);
    });
  });

  // ----- Visitor tracking -----

  router.post("/api/track/view", async (ctx) => {
    limit(ctx, `track:ip:${ctx.ip}`, 120, 60_000);
    const body = await ctx.readBody();
    const visitorId = requireVisitor(body);
    if (isBot(ctx.userAgent)) return ctx.empty(204);

    await analytics.recordView({
      visitorId,
      path: cleanPath(body.path),
      referrer: referrerHost(body.referrer, ctx.host),
      device: deviceFrom(ctx.userAgent),
    });
    ctx.empty(204);
  });

  router.post("/api/track/heartbeat", async (ctx) => {
    limit(ctx, `track:ip:${ctx.ip}`, 120, 60_000);
    const body = await ctx.readBody();
    const visitorId = requireVisitor(body);
    if (isBot(ctx.userAgent)) return ctx.empty(204);
    await analytics.heartbeat({ visitorId, path: cleanPath(body.path) });
    ctx.empty(204);
  });

  router.post("/api/track/click", async (ctx) => {
    limit(ctx, `track:ip:${ctx.ip}`, 120, 60_000);
    const body = await ctx.readBody();
    const visitorId = requireVisitor(body);
    const label = cleanLine(body.label, 80);
    if (!label || isBot(ctx.userAgent)) return ctx.empty(204);
    await analytics.recordClick({ visitorId, label, path: cleanPath(body.path) });
    ctx.empty(204);
  });

  router.post("/api/track/error", async (ctx) => {
    limit(ctx, `error:ip:${ctx.ip}`, 20, 60_000);
    const body = await ctx.readBody();
    const message = cleanLine(body.message, 300);
    if (!message || isBot(ctx.userAgent)) return ctx.empty(204);
    const number = (value) => (Number.isInteger(value) && value >= 0 && value < 1e7 ? value : null);

    await analytics.recordError({
      message,
      source: cleanLine(body.source, 200) || null,
      line: number(body.line),
      col: number(body.col),
      stack: clean(body.stack, 1500) || null,
      path: cleanPath(body.path),
      userAgent: cleanLine(ctx.userAgent, 200) || null,
    });
    ctx.empty(204);
  });

  // ----- Live visitors and likes shown on the site -----

  router.get("/api/stats/public", async (ctx) => {
    limit(ctx, `stats:ip:${ctx.ip}`, 60, 60_000);
    const visitorId = ctx.url.searchParams.get("visitorId");
    ctx.json(200, await analytics.publicStats(isVisitorId(visitorId) ? visitorId : null));
  });

  router.post("/api/like", async (ctx) => {
    limit(ctx, `like:ip:${ctx.ip}`, 20, 60_000);
    const body = await ctx.readBody();
    ctx.json(200, await analytics.toggleLike(requireVisitor(body)));
  });
}