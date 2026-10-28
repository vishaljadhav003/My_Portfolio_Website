import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { services } from "../data.js";
import { Icon } from "../components/Icons.jsx";
import { BarList, LineChart } from "./Charts.jsx";
import Inquiries from "./Inquiries.jsx";

const REFRESH_MS = 30_000;
const serviceLabel = Object.fromEntries(services.map((service) => [service.value, service.label]));
const number = (value) => Number(value || 0).toLocaleString("en-IN");
const percent = (value) => `${(value * 100).toFixed(1)}%`;

function Stat({ icon, label, value, note, tone = "" }) {
  return (
    <div className={`stat ${tone}`}>
      <span className="stat-icon">
        <Icon name={icon} size={22} animated={false} />
      </span>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {note && <span className="stat-note">{note}</span>}
      </div>
    </div>
  );
}

export default function Dashboard({ admin, onLogout, onUnauthorized }) {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [data, errorData] = await Promise.all([api(`/api/admin/overview?days=${days}`), api("/api/admin/errors")]);
      setOverview(data);
      setErrors(errorData.items);
    } catch (failure) {
      if (failure.status === 401) onUnauthorized();
      else setMessage("Could not load the dashboard.");
    }
  }, [days, onUnauthorized]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const sync = async () => {
    setSyncing(true);
    setMessage("");
    try {
      const result = await api("/api/admin/search-stats/sync", { method: "POST" });
      setMessage(`Google Search data updated (${result.days} days).`);
      load();
    } catch (failure) {
      setMessage(failure.status === 401 ? "" : failure.message);
      if (failure.status === 401) onUnauthorized();
    } finally {
      setSyncing(false);
    }
  };

  const clearErrors = async () => {
    try {
      await api("/api/admin/errors/clear", { method: "POST" });
      load();
    } catch (failure) {
      if (failure.status === 401) onUnauthorized();
    }
  };

  if (!overview) {
    return (
      <div className="admin-loading" role="status">
        <span className="spline-loader" /> Loading dashboard…
      </div>
    );
  }

  const { totals, search, series } = overview;
  const lastUpdate = new Date(overview.generatedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="admin-wrap">
      <header className="admin-top">
        <div>
          <p className="eyebrow"><Icon name="terminal" size={16} animated={false} /> Admin</p>
          <h1 className="admin-title">Dashboard</h1>
          <p className="muted">Signed in as {admin.username} · updated {lastUpdate}</p>
        </div>
        <div className="admin-tools">
          <label className="sr-only" htmlFor="range">Time range</label>
          <select id="range" className="admin-input" value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
            <Icon name="refresh" size={16} animated={false} /> Refresh
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
            <Icon name="logout" size={16} animated={false} /> Sign out
          </button>
        </div>
      </header>

      {message && <p className="form-alert info" role="status">{message}</p>}

      <div className="stats-grid">
        <Stat icon="users" label="Live visitors" value={number(totals.live)} note="active in the last minute" tone="is-live" />
        <Stat icon="eye" label="Total visitors" value={number(totals.visitors)} note={`${number(overview.today.visitors)} today`} />
        <Stat icon="layout" label="Page views" value={number(totals.pageViews)} note={`${number(overview.today.views)} today`} />
        <Stat icon="mail" label="Total inquiries" value={number(totals.inquiries)} note={`${number(totals.newInquiries)} new`} />
        <Stat icon="search" label="Found on Google" value={search.configured ? number(search.impressions) : "n/a"} note={search.configured ? `avg position ${search.position.toFixed(1)}` : "connect Search Console"} />
        <Stat icon="external" label="Clicked from Google" value={search.configured ? number(search.clicks) : "n/a"} note={search.configured ? `CTR ${percent(search.ctr)}` : ""} />
        <Stat icon="pointer" label="Clicks on site" value={number(totals.clicks)} note="links and buttons" />
        <Stat icon="heart" label="Likes" value={number(totals.likes)} />
        <Stat icon="alert" label="Errors" value={number(totals.errors)} note={`${number(overview.today.errors)} today`} tone={totals.errors ? "is-bad" : ""} />
      </div>

      <div className="chart-grid-2">
        <LineChart
          title="Visitors and page views"
          series={series}
          lines={[
            { key: "views", label: "Views", color: "var(--accent)" },
            { key: "visitors", label: "Visitors", color: "var(--spark)" },
          ]}
        />
        <LineChart
          title="Inquiries and errors"
          series={series}
          lines={[
            { key: "inquiries", label: "Inquiries", color: "var(--accent)" },
            { key: "errors", label: "Errors", color: "var(--red)" },
          ]}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Google Search</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={sync} disabled={syncing}>
            <Icon name="refresh" size={16} animated={false} /> {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
        {search.configured ? (
          <LineChart
            title="Shown in Google and clicked"
            series={series}
            lines={[
              { key: "impressions", label: "Found", color: "var(--accent)" },
              { key: "searchClicks", label: "Clicked", color: "var(--spark)" },
            ]}
          />
        ) : (
          <p className="muted">
            Google does not share search numbers with a website directly. Add a Search Console service account in
            <code> server/.env</code> (see the README), then press Sync now.
          </p>
        )}
      </section>

      <div className="lists-grid">
        <BarList title="Top pages" items={overview.topPages.map((row) => ({ label: row.path, total: row.total }))} />
        <BarList title="Devices" items={overview.devices.map((row) => ({ label: row.device, total: row.total }))} />
        <BarList title="Where visitors come from" items={overview.referrers.map((row) => ({ label: row.referrer, total: row.total }))} empty="No referrers yet (direct visits)." />
        <BarList title="Most clicked" items={overview.topClicks.map((row) => ({ label: row.label, total: row.total }))} />
        <BarList title="Inquiries by service" items={overview.services.map((row) => ({ label: serviceLabel[row.service] || row.service, total: row.total }))} />
      </div>

      <Inquiries onChange={load} onUnauthorized={onUnauthorized} />

      <section className="panel" aria-labelledby="err-title">
        <div className="panel-head">
          <h2 id="err-title" className="panel-title">
            Website errors <span className="count">{totals.errors}</span>
          </h2>
          {errors.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearErrors}>
              Clear all
            </button>
          )}
        </div>
        {errors.length === 0 ? (
          <p className="muted">No errors recorded. 🎉</p>
        ) : (
          <ul className="error-list">
            {errors.map((item) => (
              <li key={item.id}>
                <strong>{item.message}</strong>
                <span className="muted">
                  {item.path}
                  {item.source ? ` · ${item.source}:${item.line ?? "?"}` : ""} · {new Date(item.created_at).toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
