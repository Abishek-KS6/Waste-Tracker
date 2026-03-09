import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';
import FillChart from '../components/FillChart';
import AlertPanel from '../components/AlertPanel';
import './Dashboard.css';
import './AdminDashboard.css';

const socket = io('https://waste-tracker-kiwl.onrender.com');

const ZONE_COLORS = {
  ZONE_A: 'var(--green)',
  ZONE_B: 'var(--teal)',
  ZONE_C: 'var(--yellow)',
  ZONE_D: '#c084fc',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('wt_user') || '{}');

  const [zones,      setZones]      = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [chartData,  setChartData]  = useState([]);
  const [connected,  setConnected]  = useState(false);
  const [activeTab,  setActiveTab]  = useState('zones');
  const [assigning,  setAssigning]  = useState(null); // zoneId being assigned

  const fetchData = useCallback(async () => {
    try {
      const [zonesRes, collectorsRes, weeklyRes] = await Promise.all([
        api.get('/zones'),
        api.get('/zones/collectors'),
        api.get('/stats/weekly'),
      ]);
      setZones(zonesRes.data);
      setCollectors(collectorsRes.data);
      setChartData(weeklyRes.data.map(d => ({
        date: d._id.slice(5),
        avgFill: parseFloat(d.avgFill.toFixed(1)),
        maxFill: parseFloat(d.maxFill.toFixed(1)),
      })));
    } catch (err) { console.error(err.message); }
  }, []);

  useEffect(() => {
    fetchData();
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('bin_update', (data) => {
      setZones(prev => prev.map(zone => ({
        ...zone,
        bins: zone.bins?.map(b =>
          b.binId === data.binId ? { ...b, fillPercent: data.fillPercent, status: data.status } : b
        )
      })));
    });
    socket.on('bin_alert', (alert) => {
      setAlerts(prev => [{ ...alert, id: Date.now() }, ...prev.slice(0, 9)]);
    });
    return () => { socket.off('connect'); socket.off('disconnect'); socket.off('bin_update'); socket.off('bin_alert'); };
  }, [fetchData]);

  const handleAssign = async (zoneId, collectorId) => {
    if (!collectorId) return;
    setAssigning(zoneId);
    try {
      await api.put(`/zones/${zoneId}/assign`, { collectorId });
      await fetchData();
    } catch (err) {
      alert('Assignment failed: ' + (err.response?.data?.message || err.message));
    } finally { setAssigning(null); }
  };

  const handleUnassign = async (zoneId) => {
    try {
      await api.put(`/zones/${zoneId}/unassign`);
      await fetchData();
    } catch (err) { alert('Unassign failed'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
    navigate('/login');
  };

  // Global stats
  const allBins   = zones.flatMap(z => z.bins || []);
  const fullCount = allBins.filter(b => b.status === 'FULL').length;
  const halfCount = allBins.filter(b => b.status === 'HALF').length;
  const okCount   = allBins.filter(b => b.status === 'OK').length;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-brand">
          <span className="dash-icon">🗑️</span>
          <div>
            <div className="dash-title">Waste Tracker <span className="role-tag admin-tag">ADMIN</span></div>
            <div className="dash-subtitle">20 Bins — 4 Zones — Full Control</div>
          </div>
        </div>
        <div className="dash-header-right">
          <div className="bin-summary-pills">
            <span className="pill ok">🟢 {okCount}</span>
            <span className="pill half">🟡 {halfCount}</span>
            <span className="pill full">🔴 {fullCount}</span>
          </div>
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

      <div className="dash-tabs">
        <button className={`tab-btn ${activeTab === 'zones' ? 'active' : ''}`} onClick={() => setActiveTab('zones')}>🗺️ Zones & Bins</button>
        <button className={`tab-btn ${activeTab === 'assign' ? 'active' : ''}`} onClick={() => setActiveTab('assign')}>👷 Assign Collectors</button>
        <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>📊 Analytics</button>
      </div>

      <main className="dash-main">
        {alerts.length > 0 && <AlertPanel alerts={alerts} onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))} />}

        {/* ZONES & BINS TAB */}
        {activeTab === 'zones' && (
          <div className="zones-grid">
            {zones.map(zone => {
              const color = ZONE_COLORS[zone.zoneId] || 'var(--green)';
              const zoneFull = zone.bins?.filter(b => b.status === 'FULL').length || 0;
              const zoneHalf = zone.bins?.filter(b => b.status === 'HALF').length || 0;
              return (
                <div className="zone-card" key={zone.zoneId} style={{ borderColor: `${color}40` }}>
                  <div className="zone-header" style={{ borderBottom: `2px solid ${color}` }}>
                    <div>
                      <div className="zone-id" style={{ color }}>{zone.zoneId}</div>
                      <div className="zone-name">{zone.name}</div>
                      <div className="zone-desc">{zone.description}</div>
                    </div>
                    <div className="zone-stats">
                      {zoneFull > 0 && <span className="zpill full">🔴 {zoneFull}</span>}
                      {zoneHalf > 0 && <span className="zpill half">🟡 {zoneHalf}</span>}
                    </div>
                  </div>
                  <div className="zone-collector-row">
                    <span className="zcol-label">Collector:</span>
                    <span className="zcol-name" style={{ color: zone.collectorName ? color : 'var(--muted)' }}>
                      {zone.collectorName || '— Not assigned'}
                    </span>
                  </div>
                  <div className="zone-bins-list">
                    {zone.bins?.map(bin => {
                      const bc = bin.status === 'FULL' ? 'var(--red)' : bin.status === 'HALF' ? 'var(--yellow)' : 'var(--green)';
                      return (
                        <div className="zbin-row" key={bin.binId}>
                          <div className="zbin-info">
                            <span className="zbin-id">{bin.binId}</span>
                            {bin.isReal && <span className="real-tag">🔌</span>}
                            <span className="zbin-loc">{bin.location}</span>
                          </div>
                          <div className="zbin-right">
                            <div className="fill-bar-outer" style={{ width: 80 }}>
                              <div className="fill-bar-inner" style={{ width: `${bin.fillPercent}%`, background: bc }} />
                            </div>
                            <span className="zbin-pct" style={{ color: bc }}>{Math.round(bin.fillPercent)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ASSIGN COLLECTORS TAB */}
        {activeTab === 'assign' && (
          <div className="assign-section">
            <div className="assign-info card">
              <div className="card-label">Collector Assignment</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                Assign one collector per zone. Each collector will only see bins in their assigned zone.
              </p>
              <div className="collectors-available">
                <strong style={{ fontSize: '0.8rem', color: 'var(--text)' }}>Available Collectors ({collectors.length}):</strong>
                <div className="collector-chips">
                  {collectors.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>No collectors registered yet. Ask them to register with role "Collector".</span>}
                  {collectors.map(c => (
                    <div className="collector-chip" key={c._id}>
                      <span>👷 {c.name}</span>
                      <span className="chip-zone">{c.zoneId || 'Unassigned'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="assign-zones-grid">
              {zones.map(zone => {
                const color = ZONE_COLORS[zone.zoneId] || 'var(--green)';
                return (
                  <div className="assign-card card" key={zone.zoneId} style={{ borderLeft: `3px solid ${color}` }}>
                    <div className="assign-card-header">
                      <div>
                        <div className="zone-id" style={{ color }}>{zone.zoneId}</div>
                        <div className="zone-name">{zone.name}</div>
                      </div>
                      <div className="assign-status">
                        {zone.collectorName
                          ? <span className="assigned-badge" style={{ color, border: `1px solid ${color}40`, background: `${color}10` }}>✅ {zone.collectorName}</span>
                          : <span className="unassigned-badge">⚠️ Unassigned</span>
                        }
                      </div>
                    </div>

                    <div className="assign-controls">
                      <select
                        className="assign-select"
                        defaultValue=""
                        onChange={(e) => handleAssign(zone.zoneId, e.target.value)}
                        disabled={assigning === zone.zoneId}
                      >
                        <option value="" disabled>Select collector...</option>
                        {collectors.map(c => (
                          <option key={c._id} value={c._id}>{c.name} {c.zoneId ? `(currently ${c.zoneId})` : ''}</option>
                        ))}
                      </select>
                      {zone.collectorName && (
                        <button className="unassign-btn" onClick={() => handleUnassign(zone.zoneId)}>
                          Remove
                        </button>
                      )}
                    </div>
                    {assigning === zone.zoneId && <div className="assigning-msg">⏳ Assigning...</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="card chart-card">
            <div className="card-label">7-Day Fill Level Trend — All Zones</div>
            <FillChart data={chartData} />
          </div>
        )}
      </main>
    </div>
  );
}
