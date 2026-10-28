import { techWords } from "../data.js";

export default function Marquee() {
  const row = [...techWords, ...techWords];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((word, i) => (
          <span className="marquee-item" key={`${word}-${i}`}>
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
