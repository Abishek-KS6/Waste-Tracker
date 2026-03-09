import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';
import './Dashboard.css';
import './ResidentDashboard.css';

const socket = io('https://waste-tracker-kiwl.onrender.com');

// Resident sees Zone A by default (nearest zone)
const MY_ZONE = 'ZONE_A';

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('wt_user') || '{}');

  const [zone,      setZone]      = useState(null);
  const [bins,      setBins]      = useState([]);
  const [connected, setConnected] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/zones');
      const myZone = data.find(z => z.zoneId === MY_ZONE);
      if (myZone) {
        setZone(myZone);
        setBins(myZone.bins || []);
      }
    } catch (err) { console.error(err.message); }
  }, []);

  useEffect(() => {
    fetchData();
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('bin_update', (data) => {
      if (data.zoneId === MY_ZONE) {
        setBins(prev => prev.map(b =>
          b.binId === data.binId ? { ...b, fillPercent: data.fillPercent, status: data.status } : b
        ));
      }
    });
    return () => { socket.off('connect'); socket.off('disconnect'); socket.off('bin_update'); };
  }, [fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
    navigate('/login');
  };

  const fullBins = bins.filter(b => b.status === 'FULL');
  const nearestBin = bins[0]; // BIN_001 = main gate

  const color =
    nearestBin?.status === 'FULL' ? 'var(--red)' :
    nearestBin?.status === 'HALF' ? 'var(--yellow)' :
    'var(--green)';

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((nearestBin?.fillPercent || 0) / 100) * circumference;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-brand">
          <span className="dash-icon">🏠</span>
          <div>
            <div className="dash-title">Waste Tracker <span className="role-tag resident-tag">RESIDENT</span></div>
            <div className="dash-subtitle">{zone ? `${zone.zoneId} — ${zone.name}` : 'Loading...'}</div>
          </div>
        </div>
        <div className="dash-header-right">
          <div className={`conn-badge ${connected ? 'live' : 'offline'}`}>
            <span className="conn-dot" />{connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dash-main">

        {/* Alert if bins are full */}
        {fullBins.length > 0 && (
          <div className="resident-alert">
            🚨 <strong>{fullBins.length} bin(s)</strong> in your zone are full. Collection team has been notified.
          </div>
        )}

        <div className="resident-layout">
          {/* Nearest bin gauge */}
          <div className="card resident-main-card">
            <div className="card-label">Your Nearest Bin — {nearestBin?.location}</div>
            <div className="resident-gauge-wrap">
              <svg width="220" height="220" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--border)" strokeWidth="14" />
                <circle cx="110" cy="110" r={radius} fill="none" stroke={color} strokeWidth="14"
                  strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                  transform="rotate(-90 110 110)"
                  style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }} />
              </svg>
              <div className="resident-gauge-center">
                <div className="resident-pct" style={{ color }}>{Math.round(nearestBin?.fillPercent || 0)}%</div>
                <div className="resident-pct-label">FILLED</div>
              </div>
            </div>

            <div className={`resident-status-msg ${nearestBin?.status?.toLowerCase() || 'ok'}`}>
              {nearestBin?.status === 'FULL' ? '⚠️ This bin is full! Please use another bin nearby.' :
               nearestBin?.status === 'HALF' ? '📢 Bin is getting full. Please minimize waste.' :
               '✅ Bin is in good condition. No action needed.'}
            </div>

            {/* Zone collector info */}
            {zone?.collectorName && (
              <div className="zone-collector-info">
                👷 Zone Collector: <strong>{zone.collectorName}</strong>
              </div>
            )}
          </div>

          {/* All zone bins */}
          <div className="card resident-area-card">
            <div className="card-label">All 5 Bins in {zone?.name}</div>
            <div className="resident-bins-list">
              {bins.map((bin, i) => {
                const bc = bin.status === 'FULL' ? 'var(--red)' : bin.status === 'HALF' ? 'var(--yellow)' : 'var(--green)';
                const emoji = bin.status === 'FULL' ? '🔴' : bin.status === 'HALF' ? '🟡' : '🟢';
                return (
                  <div className={`resident-bin-row ${i === 0 ? 'my-bin' : ''}`} key={bin.binId}>
                    <div className="rbin-left">
                      <div className="rbin-emoji">{emoji}</div>
                      <div>
                        <div className="rbin-id">
                          {bin.binId}
                          {bin.isReal && <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>🔌</span>}
                          {i === 0 && <span className="my-tag">NEAREST</span>}
                        </div>
                        <div className="rbin-loc">{bin.location}</div>
                      </div>
                    </div>
                    <div className="rbin-right">
                      <div className="fill-bar-outer" style={{ width: 80 }}>
                        <div className="fill-bar-inner" style={{ width: `${bin.fillPercent}%`, background: bc }} />
                      </div>
                      <div className="rbin-pct" style={{ color: bc }}>{Math.round(bin.fillPercent)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="resident-tip">
              💡 <strong>Tip:</strong> If the nearest bin is full, use another bin in the zone while waiting for collection.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
