import { Link } from "../router.jsx";
import { useSeo } from "../hooks.js";

export default function NotFound() {
  useSeo({
    title: "Page not found | Vishal Jadhav",
    description: "This page does not exist. Head back to the home page or browse the projects.",
    path: "/404",
  });
  return (
    <section className="page-hero" aria-labelledby="nf-title">
      <div className="container">
        <h1 id="nf-title" className="page-title">
          Page not found.
        </h1>
        <p className="lead">The address may be mistyped, or the page has moved.</p>
        <div className="hero-cta">
          <Link className="btn btn-primary" to="/">
            Back to home
          </Link>
          <Link className="btn btn-ghost" to="/projects">
            See projects
          </Link>
        </div>
      </div>
    </section>
  );
}
