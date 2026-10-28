import { useState } from "react";
import ChatIcon from "./icons.jsx";

// What the assistant remembers about the visitor. Everything is visible and can be edited or removed.

export default function MemoryPanel({ memory, onAdd, onRemove, onClear, onToggle, onClose }) {
  const [draft, setDraft] = useState("");

  const submit = (event) => {
    event.preventDefault();
    onAdd(draft);
    setDraft("");
  };

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <section className="ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-memory-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2 id="ai-memory-title">
            <ChatIcon name="brain" size={20} /> Memory
          </h2>
          <button type="button" className="ai-icon-btn" aria-label="Close memory" onClick={onClose}>
            <ChatIcon name="close" size={20} />
          </button>
        </header>

        <p className="ai-modal-text">
          When you share something like your name or what you need, the assistant keeps a short note and uses it in every chat. Notes are saved only in this browser.
        </p>

        <label className="ai-switch">
          <input type="checkbox" checked={memory.enabled} onChange={(event) => onToggle(event.target.checked)} />
          <span className="ai-switch-track" aria-hidden="true" />
          <span>Use memory</span>
        </label>

        <ul className="ai-memory-list">
          {memory.items.length === 0 && <li className="ai-empty">Nothing saved yet. Try telling me your name.</li>}
          {memory.items.map((item) => (
            <li key={item.id}>
              <span>{item.text}</span>
              <button type="button" className="ai-icon-btn" aria-label={`Forget: ${item.text}`} onClick={() => onRemove(item.id)}>
                <ChatIcon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>

        <form className="ai-memory-add" onSubmit={submit}>
          <label className="sr-only" htmlFor="ai-memory-input">
            Add a note
          </label>
          <input id="ai-memory-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a note, e.g. I run a bakery in Pune" maxLength={200} autoComplete="off" />
          <button type="submit" disabled={!draft.trim()}>
            Add
          </button>
        </form>

        {memory.items.length > 0 && (
          <button type="button" className="ai-link-btn" onClick={onClear}>
            Clear all notes
          </button>
        )}
      </section>
    </div>
  );
}
