import { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks.js";

// A typing terminal line that cycles through roles.

const ROLES = ["ai-engineer", "full-stack-developer", "red-team-analyst", "blue-team-analyst"];

export default function Terminal() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(reduced ? ROLES[0] : "");

  useEffect(() => {
    if (reduced) return undefined;
    const word = ROLES[index];
    let count = 0;
    let timer;

    const type = () => {
      count += 1;
      setTyped(word.slice(0, count));
      if (count < word.length) timer = window.setTimeout(type, 70);
      else timer = window.setTimeout(erase, 1800);
    };
    const erase = () => {
      count -= 1;
      setTyped(word.slice(0, Math.max(count, 0)));
      if (count > 0) timer = window.setTimeout(erase, 35);
      else setIndex((value) => (value + 1) % ROLES.length);
    };
    timer = window.setTimeout(type, 400);
    return () => window.clearTimeout(timer);
  }, [index, reduced]);

  return (
    <p className="terminal" aria-hidden="true">
      <span className="terminal-user">vishal@lab</span>
      <span className="terminal-sep">:</span>
      <span className="terminal-dir">~</span>
      <span className="terminal-sep">$ </span>
      <span className="terminal-cmd">whoami</span>
      <span className="terminal-arrow"> &rarr; </span>
      <span className="terminal-out">{typed}</span>
      <span className="terminal-caret" />
    </p>
  );
}
