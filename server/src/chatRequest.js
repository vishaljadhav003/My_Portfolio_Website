import { clean, cleanLine } from "./security.js";

// Validation for POST /api/chat/stream. Everything here is untrusted visitor input.

export const LIMITS = {
  messages: 12,
  contentChars: 1500,
  images: 3,
  imageChars: 1_400_000, // base64 characters, about 1 MB of image
  documents: 3,
  documentChars: 14_000,
  totalDocumentChars: 24_000,
  memory: 20,
  memoryChars: 200,
};

/** Room for three images plus text. Everything else in the API keeps the small default limit. */
export const CHAT_BODY_LIMIT = 5 * 1024 * 1024;

const IMAGE = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

function cleanImages(value) {
  if (!Array.isArray(value)) return [];
  const images = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length > LIMITS.imageChars) continue;
    const match = IMAGE.exec(item);
    if (match) images.push({ mediaType: match[1], data: match[2], dataUrl: item });
  }
  return images;
}

function cleanDocuments(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, LIMITS.documents)
    .map((item) => ({ name: cleanLine(item?.name, 120) || "document", text: clean(item?.text, LIMITS.documentChars) }))
    .filter((item) => item.text);
}

/**
 * Returns { conversation, memory } or null. Only visitor messages may carry files, only the
 * newest few images and documents are kept, and the last message must be from the visitor.
 */
export function cleanChatRequest(body) {
  if (!Array.isArray(body.messages)) return null;

  const conversation = body.messages.slice(-LIMITS.messages).map((message) => {
    const isUser = message?.role !== "assistant";
    return {
      role: isUser ? "user" : "assistant",
      content: clean(message?.content, LIMITS.contentChars),
      images: isUser ? cleanImages(message?.images) : [],
      documents: isUser ? cleanDocuments(message?.documents) : [],
    };
  });

  // Keep only the newest images and a bounded amount of document text.
  let imagesLeft = LIMITS.images;
  let charsLeft = LIMITS.totalDocumentChars;
  for (let index = conversation.length - 1; index >= 0; index--) {
    const message = conversation[index];
    message.images = message.images.slice(-imagesLeft);
    imagesLeft -= message.images.length;
    message.documents = message.documents.flatMap((document) => {
      if (charsLeft <= 0) return [];
      const text = document.text.slice(0, charsLeft);
      charsLeft -= text.length;
      return [{ ...document, text }];
    });
  }

  const usable = conversation.filter((message) => message.content || message.images.length || message.documents.length);
  while (usable.length && usable[0].role !== "user") usable.shift();
  const last = usable[usable.length - 1];
  if (!last || last.role !== "user") return null;

  const memory = (Array.isArray(body.memory) ? body.memory : [])
    .slice(0, LIMITS.memory)
    .map((item) => cleanLine(item, LIMITS.memoryChars))
    .filter(Boolean);

  // The language chosen in the chat window: English, Hindi or Marathi. Anything else means "match the visitor".
  const language = ({ en: "en", hi: "hi", mr: "mr" })[String(body.language || "").slice(0, 2).toLowerCase()] || "";

  return { conversation: usable, memory, language };
}