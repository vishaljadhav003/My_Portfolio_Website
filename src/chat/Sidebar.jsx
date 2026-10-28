import { useState } from "react";
import ChatIcon from "./icons.jsx";

// Chat history: new chat, search, and the saved chats grouped by day.

const DAY = 86_400_000;

function groupLabel(time, now) {
  const start = new Date(now).setHours(0, 0, 0, 0);
  if (time >= start) return "Today";
  if (time >= start - DAY) return "Yesterday";
  if (time >= start - 7 * DAY) return "Previous 7 days";
  return "Older";
}

export default function Sidebar({ chats, activeId, query, onQuery, onSelect, onNew, onDelete, onMemory, memoryCount, onClose, open }) {
  const [confirming, setConfirming] = useState(null);
  const term = query.trim().toLowerCase();
  const visible = chats
    .filter((chat) => !term || chat.title.toLowerCase().includes(term) || chat.messages.some((message) => message.content.toLowerCase().includes(term)))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const now = Date.now();
  const groups = [];
  for (const chat of visible) {
    const label = groupLabel(chat.updatedAt, now);
    const group = groups.find((item) => item.label === label);
    if (group) group.chats.push(chat);
    else groups.push({ label, chats: [chat] });
  }

  return (
    <aside className={`ai-sidebar${open ? " is-open" : ""}`} aria-label="Chat history">
      <div className="ai-side-top">
        <button type="button" className="ai-new" onClick={onNew}>
          <ChatIcon name="edit" size={18} /> New chat
        </button>
        <button type="button" className="ai-icon-btn ai-side-close" aria-label="Close menu" onClick={onClose}>
          <ChatIcon name="close" size={20} />
        </button>
      </div>

      <label className="ai-search">
        <ChatIcon name="search" size={16} />
        <span className="sr-only">Search chats</span>
        <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search chats" autoComplete="off" />
      </label>

      <nav className="ai-history" aria-label="Your chats">
        {groups.length === 0 && <p className="ai-empty">{term ? "No chats match." : "Your chats will appear here."}</p>}
        {groups.map((group) => (
          <section key={group.label}>
            <h3>{group.label}</h3>
            <ul>
              {group.chats.map((chat) => (
                <li key={chat.id} className={chat.id === activeId ? "is-active" : ""}>
                  <button type="button" className="ai-chat-item" aria-current={chat.id === activeId ? "true" : undefined} onClick={() => onSelect(chat.id)}>
                    {chat.title}
                  </button>
                  {confirming === chat.id ? (
                    <button
                      type="button"
                      className="ai-delete is-confirm"
                      onClick={() => {
                        setConfirming(null);
                        onDelete(chat.id);
                      }}
                      onBlur={() => setConfirming(null)}
                    >
                      Delete?
                    </button>
                  ) : (
                    <button type="button" className="ai-delete" aria-label={`Delete chat ${chat.title}`} onClick={() => setConfirming(chat.id)}>
                      <ChatIcon name="trash" size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="ai-side-foot">
        <button type="button" className="ai-memory-btn" onClick={onMemory}>
          <ChatIcon name="brain" size={18} /> Memory
          <span className="ai-count">{memoryCount}</span>
        </button>
      </div>
    </aside>
  );
}
