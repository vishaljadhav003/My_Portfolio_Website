import { cx } from "../utils.js";

/** A stylised browser window used as the project thumbnail. Pure CSS, no image files to load. */
export default function BrowserMock({ project, large = false }) {
  const host = project.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <div className={cx("mock", `mock-${project.tone}`, `mock-layout-${project.layout}`, large && "mock-large")} aria-hidden="true">
      <div className="mock-bar">
        <i />
        <i />
        <i />
        <span>{host}</span>
      </div>
      <div className="mock-body">
        <div className="mock-nav">
          <b />
          <span />
          <span />
          <span />
        </div>
        <div className="mock-hero">
          <div className="mock-copy">
            <strong>{project.title}</strong>
            <em />
            <em />
            <u />
          </div>
          <div className="mock-art" />
        </div>
        <div className="mock-cards">
          <s />
          <s />
          <s />
        </div>
      </div>
    </div>
  );
}
