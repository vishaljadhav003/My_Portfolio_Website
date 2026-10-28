import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import { useRouter } from "./router.jsx";
import { ReadyContext } from "./context.js";
import { scrollToTop, useReducedMotion } from "./hooks.js";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Preloader from "./components/Preloader.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Projects from "./pages/Projects.jsx";
import Faq from "./pages/Faq.jsx";
import Contact from "./pages/Contact.jsx";
import NotFound from "./pages/NotFound.jsx";
import ScrollTopButton from "./components/ScrollTopButton.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import { StatsProvider } from "./lib/stats.jsx";
import { startTracking, trackView } from "./lib/track.js";

// The admin area is only for the owner, so it is loaded on demand.
const Admin = lazy(() => import("./pages/Admin.jsx"));

const ROUTES = {
  "/": Home,
  "/about": About,
  "/projects": Projects,
  "/faq": Faq,
  "/contact": Contact,
  "/admin": Admin,
};

const INTRO_KEY = "vj-intro-seen";

function shouldPlayIntro(reduced) {
  if (reduced) return false;
  try {
    return sessionStorage.getItem(INTRO_KEY) !== "1";
  } catch (error) {
    return true;
  }
}

export default function App() {
  const { path } = useRouter();
  const reduced = useReducedMotion();
  const [intro, setIntro] = useState(() => shouldPlayIntro(window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  const ready = !intro;

  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch (error) {
      /* private mode: the intro simply plays again next visit */
    }
    setIntro(false);
  }, []);

  // Smooth scrolling
  useEffect(() => {
    if (reduced) return undefined;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    let frame = requestAnimationFrame(function tick(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      delete window.__lenis;
    };
  }, [reduced]);

  // No scrolling while the preloader is on screen
  useEffect(() => {
    document.documentElement.classList.toggle("is-loading", intro);
    if (window.__lenis) (intro ? window.__lenis.stop() : window.__lenis.start());
    return () => document.documentElement.classList.remove("is-loading");
  }, [intro]);

  // Visitor tracking: one view per page change, plus heartbeat, clicks and errors.
  useEffect(() => trackView(path), [path]);
  useEffect(() => startTracking(() => window.location.pathname.replace(/\/+$/, "") || "/"), []);

  const Page = ROUTES[path] || NotFound;
  const isAdmin = path === "/admin";

  return (
    <StatsProvider>
    <ReadyContext.Provider value={ready}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {intro && <Preloader onDone={finishIntro} />}
      <Navbar />
      <AnimatePresence mode="wait" onExitComplete={scrollToTop}>
        <motion.div
          key={path}
          className="page"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <main id="main">
            <Suspense fallback={<div className="admin-loading" role="status"><span className="spline-loader" /></div>}>
              <Page />
            </Suspense>
          </main>
          {!isAdmin && <Footer />}
        </motion.div>
      </AnimatePresence>
      {ready && (
        <>
          <ScrollTopButton />
          {!isAdmin && <ChatWidget />}
        </>
      )}
    </ReadyContext.Provider>
    </StatsProvider>
  );
}
