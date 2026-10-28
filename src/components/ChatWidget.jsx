import { Suspense, lazy, useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icons.jsx";

// Bottom-right button. It opens the full-screen assistant, which is loaded the first time it is needed
// and then kept alive, so a conversation (and a streaming answer) survives closing and reopening.

const ChatOverlay = lazy(() => import("../chat/ChatOverlay.jsx"));

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const openChat = () => {
    setLoaded(true);
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <div className="chat" hidden={open}>
        <motion.button
          type="button"
          className="chat-toggle"
          aria-label="Open AI assistant"
          data-track="AI assistant"
          onClick={openChat}
          onPointerEnter={() => import("../chat/ChatOverlay.jsx")}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
        >
          <Icon name="chat" size={26} strokeWidth={2} animated={false} />
        </motion.button>
      </div>

      {loaded && (
        <Suspense fallback={null}>
          <ChatOverlay open={open} onClose={close} />
        </Suspense>
      )}
    </>
  );
}
