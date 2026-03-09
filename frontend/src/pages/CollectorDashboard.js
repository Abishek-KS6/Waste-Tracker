import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';
import './Dashboard.css';
import './CollectorDashboard.css';

const socket = io('https://waste-tracker-kiwl.onrender.com');

export default function CollectorDashboard() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('wt_user') || '{}');

  const [zone,       setZone]       = useState(null);
  const [bins,       setBins]       = useState([]);
  const [connected,  setConnected]  = useState(false);
  const [collecting, setCollecting] = useState([]);
  const [collected,  setCollected]  = useState([]);
  const [noZone,     setNoZone]     = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/zones/my');
      setZone(data);
      setBins(data.bins || []);
      setNoZone(false);
    } catch (err) {
      if (err.response?.status === 404) setNoZone(true);
      else console.error(err.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('bin_update', (data) => {
      setBins(prev => prev.map(b =>
        b.binId === data.binId ? { ...b, fillPercent: data.fillPercent, status: data.status } : b
      ));
    });
    socket.on('bin_collected', (data) => {
      setCollected(prev => [{ ...data, id: Date.now() }, ...prev.slice(0, 4)]);
    });
    return () => { socket.off('connect'); socket.off('disconnect'); socket.off('bin_update'); socket.off('bin_collected'); };
  }, [fetchData]);

  const handleCollect = async (binId) => {
    setCollecting(prev => [...prev, binId]);
    try {
      await api.post(`/bins/${binId}/collect`);
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setCollecting(prev => prev.filter(id => id !== binId));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
    navigate('/login');
  };

  const urgentBins  = bins.filter(b => b.status === 'FULL');
  const warningBins = bins.filter(b => b.status === 'HALF');
  const okBins      = bins.filter(b => b.status === 'OK');

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-brand">
          <span className="dash-icon">🚛</span>
          <div>
            <div className="dash-title">Waste Tracker <span className="role-tag collector-tag">COLLECTOR</span></div>
            <div className="dash-subtitle">{zone ? `${zone.zoneId} — ${zone.name}` : 'Awaiting zone assignment'}</div>
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

        {/* No zone assigned yet */}
        {noZone && (
          <div className="no-zone-msg card">
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.4rem' }}>
              No Zone Assigned Yet
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              Please wait for the admin to assign you to a zone. Contact your supervisor if this takes too long.
            </div>
          </div>
        )}

        {zone && (
          <>
            {/* Collection toasts */}
            {collected.length > 0 && (
              <div className="collect-toasts">
                {collected.map(c => (
                  <div className="collect-toast" key={c.id}>
                    ✅ <strong>{c.binId}</strong> at {c.location} — collected by {c.collectedBy}
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="collector-summary">
              <div className="col-stat urgent">
                <div className="col-stat-num">{urgentBins.length}</div>
                <div className="col-stat-label">🔴 Collect NOW</div>
              </div>
              <div className="col-stat warning">
                <div className="col-stat-num">{warningBins.length}</div>
                <div className="col-stat-label">🟡 Monitor</div>
              </div>
              <div className="col-stat ok">
                <div className="col-stat-num">{okBins.length}</div>
                <div className="col-stat-label">🟢 All Good</div>
              </div>
              <div className="col-stat done">
                <div className="col-stat-num">{collected.length}</div>
                <div className="col-stat-label">✅ Collected</div>
              </div>
            </div>

            {/* URGENT */}
            {urgentBins.length > 0 && (
              <div>
                <div className="section-label urgent-label">🚨 Urgent — {zone.name}</div>
                <div className="collector-bins-grid">
                  {urgentBins.map(bin => (
                    <div className="collector-bin-card full" key={bin.binId}>
                      <div className="cbc-top">
                        <div>
                          <div className="cbc-id">{bin.binId} {bin.isReal && '🔌'}</div>
                          <div className="cbc-location">📍 {bin.location}</div>
                        </div>
                        <div className="cbc-pct full-pct">{Math.round(bin.fillPercent)}%</div>
                      </div>
                      <div className="fill-bar-outer" style={{ marginBottom: '1rem' }}>
                        <div className="fill-bar-inner" style={{ width: `${bin.fillPercent}%`, background: 'var(--red)' }} />
                      </div>
                      <button className="collect-btn" onClick={() => handleCollect(bin.binId)} disabled={collecting.includes(bin.binId)}>
                        {collecting.includes(bin.binId) ? '⏳ Processing...' : '🚛 Mark as Collected'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HALF */}
            {warningBins.length > 0 && (
              <div>
                <div className="section-label">⚠️ Monitor Soon</div>
                <div className="collector-bins-grid">
                  {warningBins.map(bin => (
                    <div className="collector-bin-card half" key={bin.binId}>
                      <div className="cbc-top">
                        <div>
                          <div className="cbc-id">{bin.binId} {bin.isReal && '🔌'}</div>
                          <div className="cbc-location">📍 {bin.location}</div>
                        </div>
                        <div className="cbc-pct half-pct">{Math.round(bin.fillPercent)}%</div>
                      </div>
                      <div className="fill-bar-outer">
                        <div className="fill-bar-inner" style={{ width: `${bin.fillPercent}%`, background: 'var(--yellow)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OK */}
            {okBins.length > 0 && (
              <div>
                <div className="section-label">✅ No Action Needed</div>
                <div className="collector-bins-grid">
                  {okBins.map(bin => (
                    <div className="collector-bin-card ok" key={bin.binId}>
                      <div className="cbc-top">
                        <div>
                          <div className="cbc-id">{bin.binId} {bin.isReal && '🔌'}</div>
                          <div className="cbc-location">📍 {bin.location}</div>
                        </div>
                        <div className="cbc-pct ok-pct">{Math.round(bin.fillPercent)}%</div>
                      </div>
                      <div className="fill-bar-outer">
                        <div className="fill-bar-inner" style={{ width: `${bin.fillPercent}%`, background: 'var(--green)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
