import { memo, useState } from "react";
import ChatIcon from "./icons.jsx";
import Markdown from "./markdown.jsx";

// One message. Visitor messages are a bubble. Answers are plain text on the page, like Claude,
// with a "thought process" that lists what the server really did, and the sources it used.

const ROUTE_FOR = (id) => {
  if (id.startsWith("project-")) return "/projects";
  if (id.startsWith("faq-")) return "/faq";
  if (id === "contact") return "/contact";
  if (id === "services") return "/contact";
  return "/about";
};

function Thought({ message, live }) {
  const [open, setOpen] = useState(false);
  const { steps, thoughtMs } = message;
  if (!steps.length) return null;

  const active = steps.find((step) => !step.done);
  const seconds = thoughtMs ? Math.max(1, Math.round(thoughtMs / 1000)) : null;
  const summary = live && active ? `${active.label}…` : seconds ? `Thought for ${seconds}s` : "Thought process";

  return (
    <div className={`ai-thought${live ? " is-live" : ""}`}>
      <button type="button" className="ai-thought-head" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {live ? <span className="ai-spinner" /> : <ChatIcon name="spark" size={16} />}
        <span className="ai-thought-label">{summary}</span>
        <span className={`ai-chevron${open ? " is-open" : ""}`}>
          <ChatIcon name="chevron" size={16} />
        </span>
      </button>
      {(open || (live && steps.length > 0 && !message.content)) && (
        <ol className="ai-steps">
          {steps.map((step) => (
            <li key={step.id} className={step.done ? "is-done" : "is-active"}>
              <span className="ai-step-mark">{step.done ? <ChatIcon name="check" size={13} strokeWidth={2.4} /> : <span className="ai-spinner is-small" />}</span>
              <span>
                {step.label}
                {step.detail && <small>{step.detail}</small>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Message({ message, streaming, isLast, speaking, onSpeak, onRegenerate, onNavigate }) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    return (
      <article className="ai-msg is-user">
        {(message.images?.length > 0 || message.docs?.length > 0) && (
          <div className="ai-sent-files">
            {message.images?.map((image, index) => (image.thumb ? <img key={index} src={image.thumb} alt={image.name || "Attached image"} /> : null))}
            {message.docs?.map((doc) => (
              <span key={doc.name} className="ai-sent-doc">
                <ChatIcon name="file" size={16} />
                {doc.name}
              </span>
            ))}
          </div>
        )}
        {message.content && <div className="ai-bubble">{message.content}</div>}
        {message.remembered?.length > 0 && (
          <p className="ai-remembered">
            <ChatIcon name="brain" size={14} /> Saved to memory
          </p>
        )}
      </article>
    );
  }

  const live = streaming;
  const finished = !live && message.content;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      /* clipboard can be blocked */
    }
  };

  return (
    <article className="ai-msg is-assistant">
      <span className="ai-avatar" aria-hidden="true">
        <ChatIcon name="spark" size={18} />
      </span>
      <div className="ai-body">
        <Thought message={message} live={live} />

        {message.content ? (
          <div className={`ai-answer${message.failed ? " is-failed" : ""}`}>
            <Markdown text={message.content} onNavigate={onNavigate} />
            {live && <span className="ai-caret" aria-hidden="true" />}
          </div>
        ) : live && !message.steps.length ? (
          <span className="ai-dots" aria-label="Assistant is thinking">
            <span />
            <span />
            <span />
          </span>
        ) : null}

        {message.stopped && <p className="ai-stopped">Stopped.</p>}

        {finished && !message.failed && message.sources?.length > 0 && (
          <div className="ai-sources">
            <span>Sources</span>
            {message.sources.map((source) => (
              <button key={source.id} type="button" title={source.detail} onClick={() => onNavigate(ROUTE_FOR(source.id))}>
                {source.title.replace(/^[^:]+: /, "")}
              </button>
            ))}
          </div>
        )}

        {finished && (
          <div className="ai-actions">
            <button type="button" onClick={copy} aria-label="Copy answer" title="Copy">
              <ChatIcon name={copied ? "check" : "copy"} size={17} />
            </button>
            <button type="button" onClick={() => onSpeak(message)} aria-label={speaking ? "Stop reading aloud" : "Read aloud"} aria-pressed={speaking} title={speaking ? "Stop" : "Read aloud"} className={speaking ? "is-on" : ""}>
              <ChatIcon name={speaking ? "mute" : "speaker"} size={17} />
            </button>
            {isLast && (
              <button type="button" onClick={onRegenerate} aria-label="Regenerate answer" title="Regenerate">
                <ChatIcon name="refresh" size={17} />
              </button>
            )}
            {message.source === "local" && <span className="ai-badge" title="The AI model is off on this server, so this answer came from the portfolio data.">Basic mode</span>}
          </div>
        )}
      </div>
    </article>
  );
}

export default memo(Message);
