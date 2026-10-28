import { useId, useState } from "react";

// Small SVG charts. No chart library, so the admin stays light.

const W = 640;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 40 };

const niceMax = (value) => {
  if (value <= 5) return 5;
  const power = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / power) * power;
};

const shortDay = (key) => {
  const [, month, day] = key.split("-");
  return `${Number(day)}/${Number(month)}`;
};

/** Lines with a soft fill. `lines` is [{ key, label, color }]. */
export function LineChart({ series, lines, title }) {
  const gradient = useId();
  const [hover, setHover] = useState(null);
  const count = series.length;
  const max = niceMax(Math.max(1, ...series.flatMap((point) => lines.map((line) => point[line.key]))));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (index) => PAD.left + (count <= 1 ? innerW / 2 : (index / (count - 1)) * innerW);
  const y = (value) => PAD.top + innerH - (value / max) * innerH;
  const path = (key) => series.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(point[key]).toFixed(1)}`).join(" ");

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(((ratio * W - PAD.left) / innerW) * (count - 1));
    setHover(Math.max(0, Math.min(count - 1, index)));
  };

  const ticks = [0, 0.5, 1].map((fraction) => Math.round(max * fraction));
  const labelEvery = Math.max(1, Math.ceil(count / 6));
  const active = hover === null ? null : series[hover];

  return (
    <figure className="chart">
      <figcaption className="chart-head">
        <span>{title}</span>
        <span className="legend">
          {lines.map((line) => (
            <span key={line.key} style={{ "--dot": line.color }}>
              {line.label}
            </span>
          ))}
        </span>
      </figcaption>
      <div className="chart-box">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={lines[0].color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={lines[0].color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="chart-grid" />
              <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="chart-text">
                {tick}
              </text>
            </g>
          ))}
          {series.map((point, index) =>
            index % labelEvery === 0 ? (
              <text key={point.day} x={x(index)} y={H - 8} textAnchor="middle" className="chart-text">
                {shortDay(point.day)}
              </text>
            ) : null
          )}
          <path d={`${path(lines[0].key)} L${x(count - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={`url(#${gradient})`} />
          {lines.map((line) => (
            <path key={line.key} d={path(line.key)} fill="none" stroke={line.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="chart-cursor" />
              {lines.map((line) => (
                <circle key={line.key} cx={x(hover)} cy={y(active[line.key])} r="4.5" fill={line.color} />
              ))}
            </g>
          )}
        </svg>
        {active && (
          <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
            <strong>{shortDay(active.day)}</strong>
            {lines.map((line) => (
              <span key={line.key} style={{ "--dot": line.color }}>
                {line.label}: {active[line.key]}
              </span>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}

/** Horizontal bars for "top" lists. `items` is [{ label, total }]. */
export function BarList({ title, items, empty = "No data yet." }) {
  const max = Math.max(1, ...items.map((item) => item.total));
  return (
    <section className="panel">
      <h3 className="panel-title">{title}</h3>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="bars">
          {items.map((item) => (
            <li key={item.label}>
              <div className="bar-row">
                <span className="bar-label" title={item.label}>
                  {item.label}
                </span>
                <span className="bar-value">{item.total}</span>
              </div>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(item.total / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
