import { dayKey, lastDays, toSqlDateTime } from "./time.js";

const LIVE_WINDOW_MS = 60_000;

/** Everything that writes or reads visitor statistics. Plain SQL, no dialect-specific functions. */
export function createAnalytics({ db, tzOffsetMinutes = 330, now = () => new Date() }) {
  const day = (date) => dayKey(date, tzOffsetMinutes);

  async function touchPresence(visitorId, path, date) {
    await db.run("INSERT IGNORE INTO presence (visitor_id, path, last_seen) VALUES (?, ?, ?)", [
      visitorId,
      path,
      toSqlDateTime(date),
    ]);
    await db.run("UPDATE presence SET path = ?, last_seen = ? WHERE visitor_id = ?", [path, toSqlDateTime(date), visitorId]);
  }

  return {
    async recordView({ visitorId, path, referrer, device }) {
      const date = now();
      const stamp = toSqlDateTime(date);
      const inserted = await db.run(
        "INSERT IGNORE INTO visitors (visitor_id, first_seen, last_seen, views, device, referrer) VALUES (?, ?, ?, 1, ?, ?)",
        [visitorId, stamp, stamp, device, referrer]
      );
      if (inserted.affectedRows === 0) {
        await db.run("UPDATE visitors SET last_seen = ?, views = views + 1 WHERE visitor_id = ?", [stamp, visitorId]);
      }
      await db.run(
        "INSERT INTO page_views (visitor_id, path, referrer, device, day, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [visitorId, path, referrer, device, day(date), stamp]
      );
      await touchPresence(visitorId, path, date);
    },

    async heartbeat({ visitorId, path }) {
      await touchPresence(visitorId, path, now());
    },

    async recordClick({ visitorId, label, path }) {
      const date = now();
      await db.run("INSERT INTO clicks (visitor_id, label, path, day, created_at) VALUES (?, ?, ?, ?, ?)", [
        visitorId,
        label,
        path,
        day(date),
        toSqlDateTime(date),
      ]);
    },

    async recordError({ message, source, line, col, stack, path, userAgent }) {
      const date = now();
      await db.run(
        "INSERT INTO error_logs (message, source, line, col, stack, path, user_agent, day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [message, source, line, col, stack, path, userAgent, day(date), toSqlDateTime(date)]
      );
    },

    /** Toggles the like for a visitor and returns the new state. */
    async toggleLike(visitorId) {
      const existing = await db.get("SELECT visitor_id FROM likes WHERE visitor_id = ?", [visitorId]);
      if (existing) {
        await db.run("DELETE FROM likes WHERE visitor_id = ?", [visitorId]);
      } else {
        await db.run("INSERT IGNORE INTO likes (visitor_id, created_at) VALUES (?, ?)", [visitorId, toSqlDateTime(now())]);
      }
      return { liked: !existing, likes: await this.countLikes() };
    },

    async countLikes() {
      return (await db.get("SELECT COUNT(*) AS total FROM likes")).total;
    },

    async liveVisitors() {
      const since = toSqlDateTime(new Date(now().getTime() - LIVE_WINDOW_MS));
      return (await db.get("SELECT COUNT(*) AS total FROM presence WHERE last_seen >= ?", [since])).total;
    },

    async publicStats(visitorId) {
      const liked = visitorId ? Boolean(await db.get("SELECT visitor_id FROM likes WHERE visitor_id = ?", [visitorId])) : false;
      return { live: await this.liveVisitors(), likes: await this.countLikes(), liked };
    },

    async pruneOld() {
      const cutoff = toSqlDateTime(new Date(now().getTime() - 86_400_000));
      await db.run("DELETE FROM presence WHERE last_seen < ?", [cutoff]);
    },

    /** Numbers for the admin dashboard. */
    async overview(days = 30) {
      const date = now();
      const keys = lastDays(date, days, tzOffsetMinutes);
      const from = keys[0];
      const today = keys[keys.length - 1];
      const count = async (sql, params = []) => (await db.get(sql, params)).total ?? 0;

      const [
        totalVisitors,
        totalViews,
        live,
        likes,
        totalInquiries,
        newInquiries,
        totalClicks,
        totalErrors,
      ] = await Promise.all([
        count("SELECT COUNT(*) AS total FROM visitors"),
        count("SELECT COUNT(*) AS total FROM page_views"),
        this.liveVisitors(),
        this.countLikes(),
        count("SELECT COUNT(*) AS total FROM inquiries"),
        count("SELECT COUNT(*) AS total FROM inquiries WHERE status = 'new'"),
        count("SELECT COUNT(*) AS total FROM clicks"),
        count("SELECT COUNT(*) AS total FROM error_logs"),
      ]);

      const [viewRows, inquiryRows, errorRows, searchRows] = await Promise.all([
        db.all("SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM page_views WHERE day >= ? GROUP BY day", [from]),
        db.all("SELECT day, COUNT(*) AS total FROM inquiries WHERE day >= ? GROUP BY day", [from]),
        db.all("SELECT day, COUNT(*) AS total FROM error_logs WHERE day >= ? GROUP BY day", [from]),
        db.all("SELECT day, impressions, clicks, position FROM search_stats WHERE day >= ? ORDER BY day", [from]),
      ]);

      const byDay = (rows, field) => Object.fromEntries(rows.map((row) => [String(row.day).slice(0, 10), row[field]]));
      const viewsByDay = byDay(viewRows, "views");
      const visitorsByDay = byDay(viewRows, "visitors");
      const errorsByDay = byDay(errorRows, "total");
      const inquiriesByDay = byDay(inquiryRows, "total");
      const searchByDay = Object.fromEntries(searchRows.map((row) => [String(row.day).slice(0, 10), row]));

      const series = keys.map((key) => ({
        day: key,
        views: viewsByDay[key] || 0,
        visitors: visitorsByDay[key] || 0,
        inquiries: inquiriesByDay[key] || 0,
        errors: errorsByDay[key] || 0,
        impressions: searchByDay[key]?.impressions || 0,
        searchClicks: searchByDay[key]?.clicks || 0,
      }));

      const impressions = searchRows.reduce((sum, row) => sum + row.impressions, 0);
      const searchClicks = searchRows.reduce((sum, row) => sum + row.clicks, 0);
      const weighted = searchRows.reduce((sum, row) => sum + row.position * row.impressions, 0);

      const [topPages, devices, referrers, topClicks, topErrors, services] = await Promise.all([
        db.all("SELECT path, COUNT(*) AS total FROM page_views WHERE day >= ? GROUP BY path ORDER BY total DESC LIMIT 8", [from]),
        db.all("SELECT device, COUNT(*) AS total FROM page_views WHERE day >= ? GROUP BY device ORDER BY total DESC", [from]),
        db.all("SELECT referrer, COUNT(*) AS total FROM page_views WHERE day >= ? AND referrer IS NOT NULL GROUP BY referrer ORDER BY total DESC LIMIT 8", [from]),
        db.all("SELECT label, COUNT(*) AS total FROM clicks WHERE day >= ? GROUP BY label ORDER BY total DESC LIMIT 8", [from]),
        db.all("SELECT message, COUNT(*) AS total, MAX(created_at) AS last_seen FROM error_logs WHERE day >= ? GROUP BY message ORDER BY total DESC LIMIT 8", [from]),
        db.all("SELECT service, COUNT(*) AS total FROM inquiries GROUP BY service ORDER BY total DESC"),
      ]);

      return {
        days,
        generatedAt: date.toISOString(),
        totals: {
          visitors: totalVisitors,
          pageViews: totalViews,
          live,
          likes,
          inquiries: totalInquiries,
          newInquiries,
          clicks: totalClicks,
          errors: totalErrors,
        },
        today: {
          views: viewsByDay[today] || 0,
          visitors: visitorsByDay[today] || 0,
          inquiries: inquiriesByDay[today] || 0,
          errors: errorsByDay[today] || 0,
        },
        search: {
          configured: searchRows.length > 0,
          impressions,
          clicks: searchClicks,
          ctr: impressions ? searchClicks / impressions : 0,
          position: impressions ? weighted / impressions : 0,
        },
        series,
        topPages,
        devices,
        referrers,
        topClicks,
        topErrors,
        services,
      };
    },
  };
}
