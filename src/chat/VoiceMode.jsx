import { useCallback, useEffect, useRef, useState } from "react";
import ChatIcon from "./icons.jsx";
import { createDictation, plainText, speak, stopSpeaking } from "./speech.js";

// Hands-free conversation: listen, send what was said, read the answer aloud, listen again.

const LABEL = {
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  paused: "Microphone paused",
  error: "Voice mode stopped",
};

export default function VoiceMode({ lang, onSend, onClose }) {
  const [phase, setPhase] = useState("listening");
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const phaseRef = useRef("listening");
  const aliveRef = useRef(true);
  const sessionRef = useRef(null);
  const cancelSpeechRef = useRef(null);

  const go = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const listen = useCallback(() => {
    if (!aliveRef.current) return;
    go("listening");
    setHeard("");
    const session = createDictation({
      lang,
      onText: async (text, isFinal) => {
        setHeard(text);
        if (!isFinal || phaseRef.current !== "listening") return;
        go("thinking");
        const result = await onSend({ text });
        if (!aliveRef.current) return;
        if (!result) {
          listen();
          return;
        }
        setAnswer(plainText(result.text));
        go("speaking");
        cancelSpeechRef.current = speak(result.text, { lang, onEnd: () => aliveRef.current && phaseRef.current === "speaking" && listen() });
      },
      onEnd: () => {
        // The browser stops listening after a pause. If nothing was said, start again.
        if (aliveRef.current && phaseRef.current === "listening") window.setTimeout(() => aliveRef.current && phaseRef.current === "listening" && listen(), 250);
      },
      onError: (code) => {
        if (code === "no-speech" || code === "aborted") return;
        setError(code === "not-allowed" || code === "service-not-allowed" ? "Microphone access is blocked. Allow it in your browser's site settings, then try again." : "Voice input is not working right now.");
        go("error");
      },
    });
    sessionRef.current = session;
    try {
      session.start();
    } catch (failure) {
      setError("Voice input could not start.");
      go("error");
    }
  }, [go, lang, onSend]);

  useEffect(() => {
    aliveRef.current = true;
    listen();
    return () => {
      aliveRef.current = false;
      sessionRef.current?.abort();
      cancelSpeechRef.current?.();
      stopSpeaking();
    };
    // Voice mode starts once when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = () => {
    if (phaseRef.current === "paused") {
      listen();
    } else {
      sessionRef.current?.abort();
      go("paused");
    }
  };

  const skipSpeaking = () => {
    cancelSpeechRef.current?.();
    listen();
  };

  return (
    <div className="ai-voice" role="dialog" aria-modal="true" aria-label="Voice conversation">
      <button type="button" className="ai-icon-btn ai-voice-close" aria-label="End voice mode" onClick={onClose}>
        <ChatIcon name="close" size={22} />
      </button>

      <div className={`ai-orb is-${phase}`} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <p className="ai-voice-state" role="status">
        {LABEL[phase]}
      </p>
      <p className="ai-voice-text">{error || (phase === "speaking" ? answer : heard) || (phase === "listening" ? "Say something. I am listening." : "")}</p>

      <div className="ai-voice-controls">
        <button type="button" className={`ai-voice-btn${phase === "paused" ? " is-off" : ""}`} aria-label={phase === "paused" ? "Resume microphone" : "Pause microphone"} aria-pressed={phase === "paused"} disabled={phase === "error" || phase === "thinking"} onClick={togglePause}>
          <ChatIcon name={phase === "paused" ? "mute" : "mic"} size={24} />
        </button>
        {phase === "speaking" && (
          <button type="button" className="ai-voice-btn" aria-label="Skip the answer" onClick={skipSpeaking}>
            <ChatIcon name="stop" size={22} />
          </button>
        )}
        <button type="button" className="ai-voice-btn is-end" aria-label="End voice mode" onClick={onClose}>
          <ChatIcon name="close" size={24} />
        </button>
      </div>
    </div>
  );
}
