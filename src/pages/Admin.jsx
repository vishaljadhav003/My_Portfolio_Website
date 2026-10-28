import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { Icon } from "../components/Icons.jsx";
import Dashboard from "../admin/Dashboard.jsx";

// /admin: secure sign-in, then the dashboard. The server decides who is signed in (HttpOnly session cookie).
// There are no default credentials. Create the first admin with `npm run create-admin` in /server.

function Login({ onSignedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/admin/login", { method: "POST", body: { username, password } });
      setPassword("");
      onSignedIn(data.admin);
    } catch (failure) {
      setError(failure.status === 429 ? failure.message : failure.status === 401 || failure.status === 400 ? failure.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <span className="login-badge">
          <Icon name="lock" size={28} />
        </span>
        <h1>Admin sign in</h1>
        <p className="muted">Authorised access only.</p>

        <div className="field">
          <label htmlFor="admin-user">Admin ID</label>
          <input id="admin-user" name="username" autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={60} value={username} onChange={(event) => setUsername(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="admin-pass">Password</label>
          <div className="password-wrap">
            <input id="admin-pass" name="password" type={show ? "text" : "password"} autoComplete="current-password" maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="button" className="show-btn" aria-pressed={show} onClick={() => setShow((value) => !value)}>
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <p className="form-alert" role="alert">
            <Icon name="alert" size={18} animated={false} /> {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary form-submit" disabled={busy || !username || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function Admin() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  // Search engines must never index this page.
  useEffect(() => {
    document.title = "Admin | Vishal Jadhav";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    api("/api/admin/me")
      .then((data) => setAdmin(data.admin))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  const signedOut = useCallback(() => setAdmin(null), []);
  const logout = async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } finally {
      setAdmin(null);
    }
  };

  if (checking) {
    return (
      <div className="admin-loading" role="status">
        <span className="spline-loader" /> Checking session…
      </div>
    );
  }
  return admin ? <Dashboard admin={admin} onLogout={logout} onUnauthorized={signedOut} /> : <Login onSignedIn={setAdmin} />;
}
