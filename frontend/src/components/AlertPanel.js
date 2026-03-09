import React from 'react';
import './AlertPanel.css';

export default function AlertPanel({ alerts, onDismiss }) {
  return (
    <div className="alert-panel">
      {alerts.map((alert) => (
        <div className="alert-item" key={alert.id}>
          <span className="alert-icon">🚨</span>
          <div className="alert-body">
            <div className="alert-msg">{alert.message}</div>
            <div className="alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</div>
          </div>
          <button className="alert-dismiss" onClick={() => onDismiss(alert.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
