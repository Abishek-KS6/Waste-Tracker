import React from 'react';
import './StatsCards.css';

export default function StatsCards({ summary }) {
  const cards = [
    { icon: '🗑️', label: 'Total Bins',     value: 5,                                         color: 'var(--teal)'   },
    { icon: '📊', label: 'Total Readings', value: summary?.total ?? '—',                      color: 'var(--text)'   },
    { icon: '📈', label: 'Avg Fill Level', value: summary?.avgFill ? `${summary.avgFill}%` : '—', color: 'var(--green)'  },
    { icon: '🚨', label: 'Full Alerts',    value: summary?.fullCount ?? '—',                  color: 'var(--red)'    },
    { icon: '⚠️', label: 'Half-Full',      value: summary?.halfCount ?? '—',                  color: 'var(--yellow)' },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, i) => (
        <div className="stat-card card" key={i}>
          <div className="stat-icon">{card.icon}</div>
          <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
          <div className="stat-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}