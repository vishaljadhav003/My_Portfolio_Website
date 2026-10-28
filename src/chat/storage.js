// Chat history and memory live in this browser (localStorage). Nothing is stored on the server.

const CHATS_KEY = "vj-chat-v1";
const MEMORY_KEY = "vj-chat-memory-v1";
const MAX_CHATS = 25;

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

export function loadChats() {
  const data = read(CHATS_KEY, null);
  if (!data || !Array.isArray(data.chats)) return { chats: [], activeId: null };
  return { chats: data.chats, activeId: data.activeId ?? null };
}

/** Full-size images are kept only for the open chat. Other chats keep their thumbnails. */
function lighten(chat) {
  return {
    ...chat,
    messages: chat.messages.map((message) =>
      message.images?.length ? { ...message, images: message.images.map(({ thumb }) => ({ thumb })) } : message
    ),
  };
}

/** Saves the chats. If the browser is full, the oldest chats are dropped until it fits. */
export function saveChats(chats, activeId) {
  let kept = chats
    .filter((chat) => chat.messages.length)
    .slice(0, MAX_CHATS)
    .map((chat) => (chat.id === activeId ? chat : lighten(chat)));

  while (!write(CHATS_KEY, { chats: kept, activeId }) && kept.length > 1) kept = kept.slice(0, -1);
}

export function loadMemory() {
  const data = read(MEMORY_KEY, null);
  return { enabled: data?.enabled !== false, items: Array.isArray(data?.items) ? data.items : [] };
}

export function saveMemory(memory) {
  write(MEMORY_KEY, memory);
}
