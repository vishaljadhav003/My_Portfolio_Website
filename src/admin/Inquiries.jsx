import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { services } from "../data.js";
import { Icon } from "../components/Icons.jsx";

const STATUSES = ["new", "read", "accepted", "replied", "archived"];
const serviceLabel = Object.fromEntries(services.map((service) => [service.value, service.label]));
const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";

export default function Inquiries({ onChange, onUnauthorized }) {
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pageSize: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (search) params.set("q", search);
      setData(await api(`/api/admin/inquiries?${params}`));
      setError("");
    } catch (failure) {
      if (failure.status === 401) onUnauthorized();
      else setError("Could not load inquiries.");
    } finally {
      setLoading(false);
    }
  }, [page, status, search, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (request) => {
    try {
      setNotice("");
      const reply = await request();
      if (reply && reply.notified === "sent") setNotice("Accepted. A confirmation email was sent to the visitor.");
      else if (reply && reply.notified === "failed") setNotice("Accepted, but the confirmation email could not be sent. Please contact the visitor yourself.");
      else if (reply && reply.notified === "skipped") setNotice("Accepted. Email is not set up on the server, so no confirmation was sent.");
      await load();
      onChange();
    } catch (failure) {
      if (failure.status === 401) onUnauthorized();
      else setError("That did not work. Please try again.");
    }
  };

  const setItemStatus = (id, next) => act(() => api(`/api/admin/inquiries/${id}`, { method: "PATCH", body: { status: next } }));
  const remove = (id) => {
    setConfirming(null);
    return act(() => api(`/api/admin/inquiries/${id}`, { method: "DELETE" }));
  };

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <section className="panel inquiries" aria-labelledby="inq-title">
      <div className="panel-head">
        <h2 id="inq-title" className="panel-title">
          Inquiries <span className="count">{data.total}</span>
        </h2>
        <input type="search" className="admin-input" placeholder="Search name, email, message" aria-label="Search inquiries" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className="tabs" role="tablist" aria-label="Filter by status">
        {["", ...STATUSES].map((value) => (
          <button key={value || "all"} type="button" role="tab" aria-selected={status === value} className={status === value ? "is-active" : ""} onClick={() => { setStatus(value); setPage(1); }}>
            {value || "all"}
          </button>
        ))}
      </div>

      {error && <p className="form-alert" role="alert">{error}</p>}
      {notice && <p className="muted" role="status">{notice}</p>}

      {!loading && data.items.length === 0 ? (
        <p className="muted empty">No inquiries {status || search ? "match this filter" : "yet"}.</p>
      ) : (
        <ul className="inq-list" aria-busy={loading}>
          {data.items.map((item) => (
            <li key={item.id} className={`inq status-${item.status}`}>
              <div className="inq-main">
                <div className="inq-top">
                  <strong>{item.name}</strong>
                  <span className="pill">{serviceLabel[item.service] || item.service}</span>
                  {item.email_status === "failed" && <span className="pill pill-red" title="The notification email could not be sent. The inquiry is still saved.">email failed</span>}
                </div>
                <p className="inq-meta">
                  <a href={`mailto:${item.email}`}>{item.email}</a> · <a href={`tel:${item.phone}`}>{item.phone}</a> · {formatDate(item.created_at)}
                </p>
                <p className="inq-message">{item.message}</p>
              </div>
              <div className="inq-actions">
                <label className="sr-only" htmlFor={`status-${item.id}`}>Status</label>
                <select id={`status-${item.id}`} className="admin-input" value={item.status} onChange={(event) => setItemStatus(item.id, event.target.value)}>
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                {item.status !== "accepted" && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setItemStatus(item.id, "accepted")} title="Marks it accepted and emails the visitor that you will call or email them.">
                    Accept
                  </button>
                )}
                <a className="btn btn-ghost btn-sm" href={`mailto:${item.email}?subject=${encodeURIComponent("Re: your inquiry")}`}>
                  Reply
                </a>
                {confirming === item.id ? (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(item.id)}>
                    Confirm delete
                  </button>
                ) : (
                  <button type="button" className="icon-btn" aria-label={`Delete inquiry from ${item.name}`} onClick={() => setConfirming(item.id)} onBlur={() => setConfirming(null)}>
                    <Icon name="trash" size={18} animated={false} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="pager">
          <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}