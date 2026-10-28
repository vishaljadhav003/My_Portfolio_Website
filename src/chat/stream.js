import { ApiError } from "../lib/api.js";

// Talks to POST /api/chat/stream. The answer arrives as one JSON event per line.

const MAX_MESSAGES = 12;

/** Chat messages in the shape the server expects. Failed and empty messages are left out. */
export function toRequestMessages(messages) {
  return messages
    .filter((message) => !message.failed && (message.content || message.images?.length || message.docs?.length))
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content,
      images: (message.images || []).map((image) => image.data).filter(Boolean),
      documents: (message.docs || []).map(({ name, text }) => ({ name, text })),
    }));
}

/** The language picked in the chat window (saved by ChatOverlay), for example en-IN, hi-IN or mr-IN. */
function chosenLanguage() {
  try {
    return localStorage.getItem("vj-chat-lang") || "";
  } catch (error) {
    return "";
  }
}

/** Async iterator of events: step, sources, delta, done, error. Throws ApiError for HTTP errors. */
export async function* streamChat({ messages, memory, signal }) {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-requested-with": "fetch" },
    body: JSON.stringify({ messages: toRequestMessages(messages), memory, language: chosenLanguage() }),
    signal,
  });

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      /* the error body is optional */
    }
    throw new ApiError(response.status, data);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end;
    while ((end = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (line) yield JSON.parse(line);
    }
  }
  const rest = buffer.trim();
  if (rest) yield JSON.parse(rest);
}