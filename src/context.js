import { createContext, useContext } from "react";

/** false while the preloader is on screen, so hero animations wait for it. */
export const ReadyContext = createContext(true);
export const useReady = () => useContext(ReadyContext);
