import { useCallback, useEffect, useRef, useState } from "react";
import { SITE } from "../data.js";
import { extractMemories, mergeMemory } from "./memory.js";
import { loadChats, loadMemory, newId, saveChats, saveMemory } from "./storage.js";
import { streamChat } from "./stream.js";

// All chat state in one place: conversations, memory, and the streaming of one answer at a time.
// The answer is revealed a few characters at a time, so it reads like it is being written even when
// the server sends a whole sentence at once.

const TITLE_MAX = 48;
const INTERRUPTED = "That answer was interrupted. Please ask again.";

const titleFrom = (text, attachments) => {
  const line = text.replace(/\s+/g, " ").trim();
  if (!line) return attachments[0]?.name || "New chat";
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX).trim()}…` : line;
};

/** After a reload, an answer that never finished is shown as interrupted. */
function repair(chats) {
  return chats.map((chat) => ({
    ...chat,
    messages: chat.messages.map((message) =>
      message.role === "assistant" && !message.content && !message.failed ? { ...message, content: INTERRUPTED, failed: true, steps: [] } : message
    ),
  }));
}

function errorText(error) {
  if (error.status === 429) return "You are sending messages quickly. Please wait a moment and try again.";
  if (error.status === 413) return "That is too much to send at once. Try a smaller image or document.";
  return `I could not reach the server just now. You can use the contact form or email ${SITE.email}.`;
}

export function useChat() {
  const [initial] = useState(() => loadChats());
  const [chats, setChats] = useState(() => repair(initial.chats));
  const [activeId, setActiveId] = useState(() => (initial.chats.some((chat) => chat.id === initial.activeId) ? initial.activeId : null));
  const [memory, setMemory] = useState(() => loadMemory());
  const [busy, setBusy] = useState(false);

  const chatsRef = useRef(chats);
  const activeRef = useRef(activeId);
  const memoryRef = useRef(memory);
  const busyRef = useRef(false);
  const abortRef = useRef(null);
  chatsRef.current = chats;
  activeRef.current = activeId;
  memoryRef.current = memory;

  useEffect(() => {
    if (!busy) saveChats(chats, activeId);
  }, [chats, activeId, busy]);

  useEffect(() => {
    saveMemory(memory);
  }, [memory]);

  const activeChat = chats.find((chat) => chat.id === activeId) || null;

  /** Streams one answer into the message `messageId` of chat `chatId`. Resolves with { text, source }. */
  const run = useCallback(async (chatId, messageId, history, notes) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const started = performance.now();
    let pending = "";
    let timer = 0;
    let source = "ai";
    let wrote = false;

    const patch = (change) =>
      setChats((list) =>
        list.map((chat) =>
          chat.id !== chatId ? chat : { ...chat, updatedAt: Date.now(), messages: chat.messages.map((message) => (message.id === messageId ? change(message) : message)) }
        )
      );
    const finishSteps = (message) => ({ ...message, steps: message.steps.map((step) => ({ ...step, done: true })) });

    const startPump = () => {
      if (timer) return;
      timer = window.setInterval(() => {
        if (!pending) return;
        const size = document.hidden ? pending.length : Math.max(2, Math.ceil(pending.length / 14));
        const chunk = pending.slice(0, size);
        pending = pending.slice(size);
        patch((message) => ({ ...message, content: message.content + chunk }));
      }, 18);
    };
    const drain = () =>
      new Promise((resolve) => {
        const check = () => (pending ? window.setTimeout(check, 20) : resolve());
        check();
      });

    let text = "";
    try {
      for await (const event of streamChat({ messages: history, memory: notes, signal: controller.signal })) {
        if (event.type === "step") {
          patch((message) => ({
            ...message,
            steps: [...message.steps.map((step) => ({ ...step, done: true })), { id: event.id, label: event.label, detail: event.detail, done: false }],
          }));
        } else if (event.type === "sources") {
          patch((message) => ({ ...message, sources: event.items }));
        } else if (event.type === "delta") {
          if (!wrote) {
            wrote = true;
            const thoughtMs = Math.round(performance.now() - started);
            patch((message) => ({ ...finishSteps(message), thoughtMs }));
          }
          pending += event.text;
          text += event.text;
          startPump();
        } else if (event.type === "done") {
          source = event.source;
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
      await drain();
      patch((message) => ({ ...finishSteps(message), source, thoughtMs: message.thoughtMs ?? Math.round(performance.now() - started) }));
    } catch (error) {
      const rest = pending;
      pending = "";
      if (controller.signal.aborted) {
        patch((message) => ({ ...finishSteps(message), content: message.content + rest, stopped: true }));
      } else {
        const shown = wrote ? "" : errorText(error);
        text = text || shown;
        patch((message) => ({ ...finishSteps(message), content: message.content + rest + shown, failed: !wrote }));
      }
    } finally {
      window.clearInterval(timer);
      abortRef.current = null;
      busyRef.current = false;
      setBusy(false);
    }
    return { text, source };
  }, []);

  const send = useCallback(
    async ({ text = "", attachments = [] }) => {
      const content = text.trim();
      if ((!content && !attachments.length) || busyRef.current) return null;
      busyRef.current = true;
      setBusy(true);

      // Memory: save facts the visitor shares about themselves.
      let remembered = [];
      let notes = [];
      if (memoryRef.current.enabled) {
        const { list, added } = mergeMemory(memoryRef.current.items, extractMemories(content));
        remembered = added.map((item) => item.text);
        notes = list.map((item) => item.text);
        if (added.length) setMemory((current) => ({ ...current, items: list }));
      }

      const now = Date.now();
      const userMessage = {
        id: newId(),
        role: "user",
        content,
        createdAt: now,
        remembered,
        images: attachments.filter((item) => item.kind === "image").map(({ data, thumb, name }) => ({ data, thumb, name })),
        docs: attachments.filter((item) => item.kind === "document").map(({ name, pages, text: documentText, truncated }) => ({ name, pages, text: documentText, truncated })),
      };
      const assistantMessage = { id: newId(), role: "assistant", content: "", createdAt: now, steps: [], sources: [] };

      const existing = chatsRef.current.find((chat) => chat.id === activeRef.current);
      const chatId = existing ? existing.id : newId();
      const history = [...(existing?.messages || []), userMessage];

      setChats((list) =>
        existing
          ? list.map((chat) => (chat.id === chatId ? { ...chat, updatedAt: now, messages: [...chat.messages, userMessage, assistantMessage] } : chat))
          : [{ id: chatId, title: titleFrom(content, attachments), createdAt: now, updatedAt: now, messages: [userMessage, assistantMessage] }, ...list]
      );
      setActiveId(chatId);
      return run(chatId, assistantMessage.id, history, notes);
    },
    [run]
  );

  const regenerate = useCallback(async () => {
    const chat = chatsRef.current.find((item) => item.id === activeRef.current);
    if (!chat || busyRef.current) return null;
    const lastAssistant = chat.messages.length - 1;
    if (chat.messages[lastAssistant]?.role !== "assistant") return null;

    busyRef.current = true;
    setBusy(true);
    const history = chat.messages.slice(0, lastAssistant);
    const fresh = { id: newId(), role: "assistant", content: "", createdAt: Date.now(), steps: [], sources: [] };
    setChats((list) => list.map((item) => (item.id === chat.id ? { ...item, messages: [...history, fresh] } : item)));
    return run(chat.id, fresh.id, history, memoryRef.current.enabled ? memoryRef.current.items.map((item) => item.text) : []);
  }, [run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
  }, []);

  const selectChat = useCallback((id) => {
    abortRef.current?.abort();
    setActiveId(id);
  }, []);

  const deleteChat = useCallback((id) => {
    if (id === activeRef.current) abortRef.current?.abort();
    setChats((list) => list.filter((chat) => chat.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const clearChats = useCallback(() => {
    abortRef.current?.abort();
    setChats([]);
    setActiveId(null);
  }, []);

  const addMemory = useCallback((text) => {
    const note = text.replace(/\s+/g, " ").trim().slice(0, 200);
    if (note) setMemory((current) => ({ ...current, items: mergeMemory(current.items, [note]).list }));
  }, []);
  const removeMemory = useCallback((id) => setMemory((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) })), []);
  const clearMemory = useCallback(() => setMemory((current) => ({ ...current, items: [] })), []);
  const setMemoryEnabled = useCallback((enabled) => setMemory((current) => ({ ...current, enabled })), []);

  return { chats, activeChat, activeId, busy, memory, send, regenerate, stop, newChat, selectChat, deleteChat, clearChats, addMemory, removeMemory, clearMemory, setMemoryEnabled };
}
