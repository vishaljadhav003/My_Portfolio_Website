// Voice: dictation (SpeechRecognition) and reading answers aloud (speechSynthesis).
// Both are built into the browser and cost nothing. Support varies: Chrome, Edge and Safari
// have dictation; Firefox does not. Chrome sends dictation audio to Google to turn it into text.

export const LANGUAGES = [
  { code: "en-IN", label: "English", short: "EN" },
  { code: "hi-IN", label: "हिन्दी", short: "हि" },
  { code: "mr-IN", label: "मराठी", short: "म" },
];

const recognitionClass = () => (typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null);

export const dictationSupported = () => Boolean(recognitionClass());
export const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/**
 * One dictation session. Callbacks: onText(text, isFinal), onEnd(), onError(code).
 * Returns { start, stop, abort }.
 */
export function createDictation({ lang, onText, onEnd, onError }) {
  const Ctor = recognitionClass();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) final += result[0].transcript;
      else interim += result[0].transcript;
    }
    if (final) onText(final.trim(), true);
    else if (interim) onText(interim.trim(), false);
  };
  recognition.onerror = (event) => onError?.(event.error);
  recognition.onend = () => onEnd?.();

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}

/** Markdown and links removed, so it reads naturally. */
export function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " code block. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/[*_#>~]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

const DEVANAGARI = /[ऀ-ॿ]/;

function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split("-")[0];
  return voices.find((voice) => voice.lang === lang) || voices.find((voice) => voice.lang.startsWith(base)) || voices.find((voice) => voice.default) || null;
}

/** Speaks `text` in sentences (long utterances can stall in Chrome). Returns a cancel function. */
export function speak(text, { lang = "en-IN", onEnd } = {}) {
  if (!speechSupported()) {
    onEnd?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  // Devanagari text needs a Hindi or Marathi voice even if the interface language is English.
  const spoken = DEVANAGARI.test(text) ? (lang === "en-IN" ? "hi-IN" : lang) : "en-IN";
  const sentences = plainText(text).match(/[^.!?।\n]+[.!?।]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  let cancelled = false;
  let index = 0;

  const next = () => {
    if (cancelled) return;
    if (index >= sentences.length) {
      onEnd?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(sentences[index++]);
    utterance.lang = spoken;
    const voice = pickVoice(spoken);
    if (voice) utterance.voice = voice;
    utterance.rate = 1.02;
    utterance.onend = next;
    utterance.onerror = next;
    synth.speak(utterance);
  };
  next();

  return () => {
    cancelled = true;
    synth.cancel();
  };
}

export const stopSpeaking = () => {
  if (speechSupported()) window.speechSynthesis.cancel();
};
