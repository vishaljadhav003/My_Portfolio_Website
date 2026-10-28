import { burnTime, createSession, destroySession, findSession, verifyPassword } from "../auth.js";
import { HttpError, parseCookies, serializeCookie } from "../http.js";
import { cleanLine } from "../security.js";
import { syncSearchStats } from "../gsc.js";
import { toSqlDateTime } from "../time.js";
import { services } from "../../../src/data.js";

const STATUSES = ["new", "read", "accepted", "replied", "archived"];
const serviceName = Object.fromEntries(services.map((item) => [item.value, item.label]));
const FIFTEEN_MINUTES = 15 * 60_000;

const isoUtc = (value) => (value ? `${String(value).replace(" ", "T")}Z` : null);

export function registerAdminRoutes(router, deps) {
  const { db, analytics, config, now, mailer } = deps;
  const { cookieName, hours, secureCookie } = config.session;

  const sessionCookie = (token, maxAge) => serializeCookie(cookieName, token, { maxAge, secure: secureCookie });

  /** Wraps a handler so it only runs for a signed-in admin. */
  const protect = (handler) => async (ctx) => {
    const token = parseCookies(ctx.req.headers.cookie)[cookieName];
    const admin = await findSession(db, token, now());
    if (!admin) throw new HttpError(401, "Please sign in.");
    if (ctx.req.method !== "GET" && ctx.req.headers["x-requested-with"] !== "fetch") {
      throw new HttpError(403, "Missing request header.");
    }
    ctx.admin = admin;
    ctx.sessionToken = token;
    await handler(ctx);
  };

  router.post("/api/admin/login", async (ctx) => {
    const body = await ctx.readBody();
    const username = cleanLine(body.username, 60).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password || password.length > 200) throw new HttpError(400, "Enter your username and password.");

    for (const [key, max] of [
      ["login:all", 60],
      [`login:ip:${ctx.ip}`, 10],
      [`login:user:${username}`, 5],
    ]) {
      const result = ctx.limiter.hit(key, max, FIFTEEN_MINUTES);
      if (!result.ok) {
        throw new HttpError(429, "Too many sign-in attempts. Try again later.", { retryAfter: result.retryAfter });
      }
    }

    const admin = await db.get("SELECT id, username, password_hash FROM admins WHERE username = ?", [username]);
    let valid = false;
    if (admin) valid = await verifyPassword(password, admin.password_hash);
    else await burnTime(password);
    if (!valid) throw new HttpError(401, "Invalid username or password.");

    ctx.limiter.reset(`login:user:${username}`);
    const date = now();
    await db.run("UPDATE admins SET last_login_at = ? WHERE id = ?", [toSqlDateTime(date), admin.id]);
    const token = await createSession(db, admin.id, hours, date);
    ctx.json(200, { ok: true, admin: { username: admin.username } }, { "Set-Cookie": sessionCookie(token, hours * 3600) });
  });

  router.post(
    "/api/admin/logout",
    protect(async (ctx) => {
      await destroySession(db, ctx.sessionToken);
      ctx.json(200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
    })
  );

  router.get(
    "/api/admin/me",
    protect(async (ctx) => ctx.json(200, { admin: { username: ctx.admin.username } }))
  );

  router.get(
    "/api/admin/overview",
    protect(async (ctx) => {
      const requested = Number(ctx.url.searchParams.get("days"));
      const days = [7, 30, 90].includes(requested) ? requested : 30;
      ctx.json(200, await analytics.overview(days));
    })
  );

  router.get(
    "/api/admin/inquiries",
    protect(async (ctx) => {
      const params = ctx.url.searchParams;
      const status = params.get("status");
      const search = cleanLine(params.get("q") || "", 80).replace(/[%_]/g, "");
      const page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
      const pageSize = 15;

      const where = [];
      const values = [];
      if (STATUSES.includes(status)) {
        where.push("status = ?");
        values.push(status);
      }
      if (search) {
        where.push("(name LIKE ? OR email LIKE ? OR message LIKE ? OR phone LIKE ?)");
        values.push(...Array(4).fill(`%${search}%`));
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const total = (await db.get(`SELECT COUNT(*) AS total FROM inquiries ${clause}`, values)).total;
      const rows = await db.all(
        `SELECT id, name, email, phone, service, message, status, email_status, created_at
           FROM inquiries ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...values, pageSize, (page - 1) * pageSize]
      );
      ctx.json(200, {
        total,
        page,
        pageSize,
        items: rows.map((row) => ({ ...row, created_at: isoUtc(row.created_at) })),
      });
    })
  );

  router.patch(
    "/api/admin/inquiries/:id",
    protect(async (ctx) => {
      const body = await ctx.readBody();
      if (!STATUSES.includes(body.status)) throw new HttpError(400, "Unknown status.");
      const id = Number(ctx.params.id) || 0;
      const before = await db.get("SELECT name, email, phone, service, message, status FROM inquiries WHERE id = ?", [id]);
      if (!before) throw new HttpError(404, "Inquiry not found.");
      await db.run("UPDATE inquiries SET status = ? WHERE id = ?", [body.status, id]);

      // Accepting tells the visitor that a call or email is coming. Only the first time.
      let notified = "none";
      if (body.status === "accepted" && before.status !== "accepted") {
        try {
          notified = await mailer.sendAccepted(before, serviceName[before.service] || before.service);
        } catch (error) {
          notified = "failed";
          console.error("accepted email failed:", error.message);
        }
      }
      ctx.json(200, { ok: true, notified });
    })
  );

  router.delete(
    "/api/admin/inquiries/:id",
    protect(async (ctx) => {
      const result = await db.run("DELETE FROM inquiries WHERE id = ?", [Number(ctx.params.id) || 0]);
      if (!result.affectedRows) throw new HttpError(404, "Inquiry not found.");
      ctx.json(200, { ok: true });
    })
  );

  router.get(
    "/api/admin/errors",
    protect(async (ctx) => {
      const rows = await db.all(
        "SELECT id, message, source, line, col, path, user_agent, created_at FROM error_logs ORDER BY id DESC LIMIT 50"
      );
      ctx.json(200, { items: rows.map((row) => ({ ...row, created_at: isoUtc(row.created_at) })) });
    })
  );

  router.post(
    "/api/admin/errors/clear",
    protect(async (ctx) => {
      await db.run("DELETE FROM error_logs");
      ctx.json(200, { ok: true });
    })
  );

  router.post(
    "/api/admin/search-stats/sync",
    protect(async (ctx) => {
      try {
        const rows = await syncSearchStats({ config, db, fetchImpl: deps.fetchImpl, now: now() });
        ctx.json(200, { ok: true, days: rows });
      } catch (error) {
        throw new HttpError(400, error.message);
      }
    })
  );
}