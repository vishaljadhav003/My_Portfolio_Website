import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// A tiny History API router. Every route is a real URL (/about, /projects, /faq).

const RouterContext = createContext({ path: "/", navigate: () => {} });

const normalize = (value) => {
  const clean = value.replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
};

export function Router({ children }) {
  const [path, setPath] = useState(() => normalize(window.location.pathname));

  useEffect(() => {
    const onPop = () => setPath(normalize(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback(
    (to) => {
      const next = normalize(to.split("#")[0].split("?")[0]);
      if (next !== path) {
        window.history.pushState({}, "", to);
        setPath(next);
      }
    },
    [path]
  );

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

export function Link({ to, onClick, children, ...rest }) {
  const { navigate } = useRouter();

  const handleClick = (event) => {
    if (onClick) onClick(event);
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.defaultPrevented || event.button !== 0 || modified) return;
    event.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
