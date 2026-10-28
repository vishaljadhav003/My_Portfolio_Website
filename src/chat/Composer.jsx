import { useCallback, useEffect, useRef, useState } from "react";
import ChatIcon from "./icons.jsx";
import { ACCEPT, LIMITS, readAttachment } from "./files.js";
import { createDictation, dictationSupported } from "./speech.js";

// The message box: auto-growing text, attachments (button, drag and drop, paste), dictation,
// voice mode and send / stop.

const MAX_HEIGHT = 200;

export default function Composer({ busy, lang, onSend, onStop, onVoiceMode, focusKey, addFilesRef }) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(0);
  const [notice, setNotice] = useState("");
  const [listening, setListening] = useState(false);
  const areaRef = useRef(null);
  const fileRef = useRef(null);
  const dictationRef = useRef(null);
  const baseRef = useRef("");
  const canDictate = dictationSupported();

  const resize = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(resize, [text, resize]);
  useEffect(() => {
    areaRef.current?.focus({ preventScroll: true });
  }, [focusKey]);
  useEffect(() => () => dictationRef.current?.abort(), []);

  const addFiles = useCallback(
    async (files) => {
      setNotice("");
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith("image/");
        const used = (kind) => attachments.filter((item) => item.kind === kind).length;
        if (isImage ? used("image") >= LIMITS.images : used("document") >= LIMITS.documents) {
          setNotice(isImage ? `You can attach up to ${LIMITS.images} images.` : `You can attach up to ${LIMITS.documents} documents.`);
          continue;
        }
        setLoading((count) => count + 1);
        try {
          const attachment = await readAttachment(file);
          setAttachments((current) => [...current, attachment]);
        } catch (error) {
          setNotice(error.message || "That file could not be read.");
        } finally {
          setLoading((count) => count - 1);
        }
      }
    },
    [attachments]
  );

  // The overlay forwards files dropped anywhere on the screen to this composer.
  useEffect(() => {
    if (addFilesRef) addFilesRef.current = addFiles;
  }, [addFiles, addFilesRef]);

  const submit = () => {
    if (busy || loading || (!text.trim() && !attachments.length)) return;
    dictationRef.current?.abort();
    setListening(false);
    onSend({ text, attachments });
    setText("");
    setAttachments([]);
    setNotice("");
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const onPaste = (event) => {
    const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
    if (files.length) {
      event.preventDefault();
      addFiles(files);
    }
  };

  const toggleDictation = () => {
    if (listening) {
      dictationRef.current?.stop();
      return;
    }
    setNotice("");
    baseRef.current = text ? `${text.trim()} ` : "";
    const session = createDictation({
      lang,
      onText: (spoken) => setText(baseRef.current + spoken),
      onEnd: () => setListening(false),
      onError: (code) => {
        setListening(false);
        if (code === "not-allowed" || code === "service-not-allowed") setNotice("Microphone access is blocked. Allow it in your browser's site settings.");
        else if (code !== "no-speech" && code !== "aborted") setNotice("Voice input stopped. Please try again.");
      },
    });
    dictationRef.current = session;
    try {
      session.start();
      setListening(true);
    } catch (error) {
      setListening(false);
    }
  };

  const canSend = !busy && !loading && (text.trim() || attachments.length);

  return (
    <form
      className="ai-composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {notice && (
        <p className="ai-notice" role="status">
          {notice}
        </p>
      )}

      <div className="ai-box">
        {(attachments.length > 0 || loading > 0) && (
          <ul className="ai-attachments" aria-label="Attachments">
            {attachments.map((item) => (
              <li key={item.id} className="ai-attachment">
                {item.kind === "image" ? <img src={item.thumb} alt="" /> : <span className="ai-file-icon"><ChatIcon name="file" size={18} /></span>}
                <span className="ai-attachment-name">
                  {item.name}
                  {item.kind === "document" && <small>{item.pages ? `${item.pages} page${item.pages === 1 ? "" : "s"}` : "text"}{item.truncated ? ", shortened" : ""}</small>}
                </span>
                <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setAttachments((current) => current.filter((other) => other.id !== item.id))}>
                  <ChatIcon name="close" size={14} />
                </button>
              </li>
            ))}
            {loading > 0 && (
              <li className="ai-attachment is-loading" aria-live="polite">
                <span className="ai-spinner" /> Reading file…
              </li>
            )}
          </ul>
        )}

        <label className="sr-only" htmlFor="ai-input">
          Message
        </label>
        <textarea
          id="ai-input"
          ref={areaRef}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={listening ? "Listening…" : "Ask anything about Vishal"}
          maxLength={1500}
          enterKeyHint="send"
          autoComplete="off"
        />

        <div className="ai-tools">
          <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
          <button type="button" className="ai-tool" aria-label="Attach an image or document" title="Attach an image, PDF or text file" onClick={() => fileRef.current?.click()}>
            <ChatIcon name="plus" size={22} />
          </button>
          <span className="ai-tools-spacer" />
          <button
            type="button"
            className={`ai-tool${listening ? " is-live" : ""}`}
            aria-label={listening ? "Stop dictation" : "Dictate with your voice"}
            aria-pressed={listening}
            title={canDictate ? "Dictate" : "Voice input is not supported in this browser"}
            disabled={!canDictate}
            onClick={toggleDictation}
          >
            <ChatIcon name="mic" size={20} />
          </button>
          <button type="button" className="ai-tool" aria-label="Start voice conversation" title={canDictate ? "Talk with the assistant" : "Voice mode is not supported in this browser"} disabled={!canDictate} onClick={onVoiceMode}>
            <ChatIcon name="wave" size={20} />
          </button>
          {busy ? (
            <button type="button" className="ai-send is-stop" aria-label="Stop generating" onClick={onStop}>
              <ChatIcon name="stop" size={18} strokeWidth={2.2} />
            </button>
          ) : (
            <button type="submit" className="ai-send" aria-label="Send message" disabled={!canSend}>
              <ChatIcon name="arrowUp" size={20} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
