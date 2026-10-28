import { useCallback, useEffect, useRef, useState } from "react";
import { SITE } from "../data.js";
import { useRouter } from "../router.jsx";
import Composer from "./Composer.jsx";
import ChatIcon from "./icons.jsx";
import MemoryPanel from "./MemoryPanel.jsx";
import Message from "./Message.jsx";
import Sidebar from "./Sidebar.jsx";
import { LANGUAGES, plainText, speak, stopSpeaking } from "./speech.js";
import { useChat } from "./useChat.js";
import VoiceMode from "./VoiceMode.jsx";
import "./chat.css";

// Full-screen assistant, laid out like Claude: history on the left, the conversation in a centred
// column, one message box at the bottom.

const SUGGESTIONS = [
  { title: "What can you build?", text: "What services do you offer?" },
  { title: "Security skills", text: "Tell me about your red and blue team security work" },
  { title: "See the projects", text: "Show me your projects" },
  { title: "Work with Vishal", text: "How can I contact Vishal?" },
];
const LANG_KEY = "vj-chat-lang";
const NEAR_BOTTOM = 140;

function savedLang() {
  try {
    const code = localStorage.getItem(LANG_KEY);
    return LANGUAGES.some((item) => item.code === code) ? code : "en-IN";
  } catch (error) {
    return "en-IN";
  }
}

export default function ChatOverlay({ open, onClose }) {
  const chat = useChat();
  const { navigate } = useRouter();
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 900px)").matches);
  const [sidebar, setSidebar] = useState(wide);
  const [query, setQuery] = useState("");
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [lang, setLang] = useState(savedLang);
  const [dragging, setDragging] = useState(false);
  const [away, setAway] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [focusKey, setFocusKey] = useState(0);
  const listRef = useRef(null);
  const nearBottomRef = useRef(true);
  const addFilesRef = useRef(null);
  const cancelSpeechRef = useRef(null);
  const rootRef = useRef(null);

  const { activeChat, busy } = chat;
  const messages = activeChat?.messages || [];

  // Keep the page behind still while the assistant is open.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("chat-open", open);
    if (open) {
      window.__lenis?.stop();
      setFocusKey((key) => key + 1);
    } else {
      window.__lenis?.start();
      stopSpeaking();
      setSpeakingId(null);
    }
    return () => {
      root.classList.remove("chat-open");
      window.__lenis?.start();
    };
  }, [open]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 900px)");
    const update = () => {
      setWide(query.matches);
      setSidebar(query.matches);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (voiceOpen) setVoiceOpen(false);
      else if (memoryOpen) setMemoryOpen(false);
      else if (!wide && sidebar) setSidebar(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, voiceOpen, memoryOpen, wide, sidebar, onClose]);

  // Stay at the bottom while an answer streams, unless the visitor scrolled up to read.
  useEffect(() => {
    const list = listRef.current;
    if (list && nearBottomRef.current) list.scrollTo({ top: list.scrollHeight, behavior: busy ? "auto" : "smooth" });
  }, [messages, busy, activeChat?.id]);

  useEffect(() => {
    nearBottomRef.current = true;
    setAway(false);
    // A new chat shows its welcome from the top. An old chat opens at its latest message.
    listRef.current?.scrollTo({ top: messages.length ? listRef.current.scrollHeight : 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id]);

  const onScroll = () => {
    const list = listRef.current;
    const near = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM;
    nearBottomRef.current = near;
    setAway(!near);
  };

  const jumpToLatest = () => {
    const list = listRef.current;
    nearBottomRef.current = true;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  };

  const goTo = useCallback(
    (path) => {
      onClose();
      navigate(path);
    },
    [navigate, onClose]
  );

  const changeLang = (event) => {
    setLang(event.target.value);
    try {
      localStorage.setItem(LANG_KEY, event.target.value);
    } catch (error) {
      /* the language still applies for this visit */
    }
  };

  const toggleSpeak = useCallback(
    (message) => {
      cancelSpeechRef.current?.();
      if (speakingId === message.id) {
        setSpeakingId(null);
        return;
      }
      setSpeakingId(message.id);
      cancelSpeechRef.current = speak(plainText(message.content), { lang, onEnd: () => setSpeakingId(null) });
    },
    [lang, speakingId]
  );

  const send = useCallback(
    (payload) => {
      cancelSpeechRef.current?.();
      setSpeakingId(null);
      nearBottomRef.current = true;
      return chat.send(payload);
    },
    [chat.send] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startNew = () => {
    chat.newChat();
    setFocusKey((key) => key + 1);
    if (!wide) setSidebar(false);
  };

  const pickChat = (id) => {
    chat.selectChat(id);
    if (!wide) setSidebar(false);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) addFilesRef.current?.(event.dataTransfer.files);
  };

  return (
    <div
      ref={rootRef}
      className="ai-overlay"
      data-open={open}
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label="AI assistant"
      aria-hidden={!open}
      inert={!open ? "" : undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => event.currentTarget === event.target && setDragging(false)}
      onDrop={onDrop}
    >
      {sidebar && !wide && <button type="button" className="ai-backdrop" aria-label="Close menu" onClick={() => setSidebar(false)} />}
      <Sidebar
        open={sidebar}
        chats={chat.chats}
        activeId={chat.activeId}
        query={query}
        onQuery={setQuery}
        onSelect={pickChat}
        onNew={startNew}
        onDelete={chat.deleteChat}
        onMemory={() => setMemoryOpen(true)}
        memoryCount={chat.memory.items.length}
        onClose={() => setSidebar(false)}
      />

      <section className="ai-main">
        <header className="ai-top">
          <button type="button" className="ai-icon-btn" aria-label={sidebar ? "Hide chat history" : "Show chat history"} aria-expanded={sidebar} onClick={() => setSidebar((value) => !value)}>
            <ChatIcon name="menu" size={22} />
          </button>
          <h2 className="ai-title">{activeChat?.title || "New chat"}</h2>
          <label className="ai-lang" title="Language for answers and voice">
            <ChatIcon name="globe" size={16} />
            <span className="sr-only">Language for answers and voice</span>
            <select value={lang} onChange={changeLang}>
              {LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="ai-icon-btn" aria-label="Close assistant" onClick={onClose}>
            <ChatIcon name="close" size={22} />
          </button>
        </header>

        <div className="ai-scroll" ref={listRef} onScroll={onScroll}>
          {messages.length === 0 ? (
            <div className="ai-welcome">
              <span className="ai-logo" aria-hidden="true">
                <ChatIcon name="spark" size={30} />
              </span>
              <h1>How can I help you today?</h1>
              <p>I&rsquo;m {SITE.name.split(" ")[0]}&rsquo;s assistant. Ask about his work, attach a PDF or an image, or tap the wave icon to talk.</p>
              <ul className="ai-suggestions">
                {SUGGESTIONS.map((item) => (
                  <li key={item.title}>
                    <button type="button" onClick={() => send({ text: item.text })}>
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="ai-thread" aria-live="polite" aria-relevant="additions">
              {messages.map((message, index) => (
                <Message
                  key={message.id}
                  message={message}
                  streaming={busy && index === messages.length - 1 && message.role === "assistant"}
                  isLast={index === messages.length - 1}
                  speaking={speakingId === message.id}
                  onSpeak={toggleSpeak}
                  onRegenerate={chat.regenerate}
                  onNavigate={goTo}
                />
              ))}
            </div>
          )}
        </div>

        {away && messages.length > 0 && (
          <button type="button" className="ai-jump" aria-label="Scroll to latest message" onClick={jumpToLatest}>
            <ChatIcon name="down" size={18} />
          </button>
        )}

        <div className="ai-dock">
          <Composer busy={busy} lang={lang} onSend={send} onStop={chat.stop} onVoiceMode={() => setVoiceOpen(true)} focusKey={focusKey} addFilesRef={addFilesRef} />
          <p className="ai-fineprint">AI can make mistakes. Attached files are sent to the AI service to answer, so do not share secrets.</p>
        </div>
      </section>

      {memoryOpen && (
        <MemoryPanel
          memory={chat.memory}
          onAdd={chat.addMemory}
          onRemove={chat.removeMemory}
          onClear={chat.clearMemory}
          onToggle={chat.setMemoryEnabled}
          onClose={() => setMemoryOpen(false)}
        />
      )}
      {voiceOpen && <VoiceMode lang={lang} onSend={send} onClose={() => setVoiceOpen(false)} />}
      {dragging && (
        <div className="ai-drop" aria-hidden="true">
          <ChatIcon name="file" size={36} />
          <p>Drop an image, PDF or text file</p>
        </div>
      )}
    </div>
  );
}