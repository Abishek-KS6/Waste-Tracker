import React from 'react';
import './BinCard.css';

export default function BinCard({ bin }) {
  const { binId, location, fillPercent, status, real } = bin;

  const color =
    status === 'FULL' ? 'var(--red)' :
    status === 'HALF' ? 'var(--yellow)' :
    'var(--green)';

  const emoji =
    status === 'FULL' ? '🔴' :
    status === 'HALF' ? '🟡' : '🟢';

  return (
    <div className={`bin-card ${status.toLowerCase()}`}>
      {/* Top bar color */}
      <div className="bin-card-bar" style={{ background: color }} />

      <div className="bin-card-header">
        <div className="bin-card-id">{binId}</div>
        <div className="bin-card-badge" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
          {emoji} {status}
        </div>
      </div>

      <div className="bin-card-location">📍 {location}</div>

      {/* Bin visual + fill bar */}
      <div className="bin-card-visual">
        <div className="bin-body-card">
          <div
            className="bin-fill-card"
            style={{
              height: `${fillPercent}%`,
              background: color,
              opacity: 0.35,
              transition: 'height 1s ease, background 0.5s ease',
            }}
          />
        </div>
        <div className="bin-base-card" />
      </div>

      {/* Fill percentage */}
      <div className="bin-card-fill-row">
        <div className="fill-bar-outer">
          <div
            className="fill-bar-inner"
            style={{
              width: `${fillPercent}%`,
              background: color,
              transition: 'width 1s ease, background 0.5s ease',
            }}
          />
        </div>
        <div className="fill-pct" style={{ color }}>{Math.round(fillPercent)}%</div>
      </div>

      {/* Real vs simulated tag */}
      <div className="bin-card-tag">
        {real ? '🔌 Live — Wokwi' : '🔁 Simulated'}
      </div>
    </div>
  );
}