import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, visitorId } from "./api.js";

// Live visitor count and likes, shown on the public site. Polls the server while the tab is visible.

const POLL_MS = 15_000;
const StatsContext = createContext({ live: 0, likes: 0, liked: false, online: false, toggleLike: () => {} });

export function StatsProvider({ children }) {
  const [stats, setStats] = useState({ live: 0, likes: 0, liked: false, online: false });

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/stats/public?visitorId=${visitorId()}`);
      setStats({ live: data.live, likes: data.likes, liked: data.liked, online: true });
    } catch (error) {
      setStats((current) => ({ ...current, online: false }));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const toggleLike = useCallback(async () => {
    try {
      const data = await api("/api/like", { method: "POST", body: { visitorId: visitorId() } });
      setStats((current) => ({ ...current, liked: data.liked, likes: data.likes }));
    } catch (error) {
      /* the button simply does not change */
    }
  }, []);

  const value = useMemo(() => ({ ...stats, toggleLike }), [stats, toggleLike]);
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export const useSiteStats = () => useContext(StatsContext);
