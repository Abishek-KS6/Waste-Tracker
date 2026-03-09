import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';
import BinCard from '../components/BinCard';
import StatsCards from '../components/StatsCards';
import FillChart from '../components/FillChart';
import AlertPanel from '../components/AlertPanel';
import './Dashboard.css';

const socket = io('http://localhost:5000');

const BIN_LIST = [
  { binId: 'BIN_001', location: 'Block A - Main Gate',   real: true  },
  { binId: 'BIN_002', location: 'Block B - Cafeteria',   real: false },
  { binId: 'BIN_003', location: 'Block C - Library',     real: false },
  { binId: 'BIN_004', location: 'Block D - Parking',     real: false },
  { binId: 'BIN_005', location: 'Block E - Sports Area', real: false },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('wt_user') || '{}');

  const [bins,       setBins]       = useState(() =>
    BIN_LIST.map(b => ({ ...b, fillPercent: 0, status: 'OK' }))
  );
  const [summary,    setSummary]    = useState(null);
  const [chartData,  setChartData]  = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [connected,  setConnected]  = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [binRes, summaryRes, weeklyRes] = await Promise.all([
        api.get('/bins'),
        api.get('/stats/summary'),
        api.get('/stats/weekly'),
      ]);

      // Merge DB data with our bin list
      if (binRes.data.length > 0) {
        setBins(prev => prev.map(b => {
          const dbBin = binRes.data.find(d => d.binId === b.binId);
          return dbBin ? { ...b, fillPercent: dbBin.fillPercent, status: dbBin.status } : b;
        }));
      }

      setSummary(summaryRes.data);

      const formatted = weeklyRes.data.map(d => ({
        date:    d._id.slice(5),
        avgFill: parseFloat(d.avgFill.toFixed(1)),
        maxFill: parseFloat(d.maxFill.toFixed(1)),
      }));
      setChartData(formatted);

    } catch (err) {
      console.error('Fetch error:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchData();

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('bin_update', (data) => {
      setBins(prev => prev.map(b =>
        b.binId === data.binId
          ? { ...b, fillPercent: data.fillPercent, status: data.status }
          : b
      ));
      setLastUpdate(new Date(data.recordedAt));
    });

    socket.on('bin_alert', (alert) => {
      setAlerts(prev => [{ ...alert, id: Date.now() }, ...prev.slice(0, 4)]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('bin_update');
      socket.off('bin_alert');
    };
  }, [fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('wt_token');
    localStorage.removeItem('wt_user');
    navigate('/login');
  };

  const fullCount = bins.filter(b => b.status === 'FULL').length;
  const halfCount = bins.filter(b => b.status === 'HALF').length;
  const okCount   = bins.filter(b => b.status === 'OK').length;

  return (
    <div className="dashboard">
      {/* HEADER */}
      <header className="dash-header">
        <div className="dash-brand">
          <span className="dash-icon">🗑️</span>
          <div>
            <div className="dash-title">Waste Tracker</div>
            <div className="dash-subtitle">Recycling & Collection Monitor — 5 Bins</div>
          </div>
        </div>
        <div className="dash-header-right">
          <div className="bin-summary-pills">
            <span className="pill ok">🟢 {okCount} OK</span>
            <span className="pill half">🟡 {halfCount} Half</span>
            <span className="pill full">🔴 {fullCount} Full</span>
          </div>
          <div className={`conn-badge ${connected ? 'live' : 'offline'}`}>
            <span className="conn-dot" />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dash-main">
        {/* ALERTS */}
        {alerts.length > 0 && (
          <AlertPanel alerts={alerts} onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))} />
        )}

        {/* STATS */}
        <StatsCards summary={summary} />

        {/* BINS GRID */}
        <div>
          <div className="section-label">All Bins — Live Status</div>
          <div className="bins-grid">
            {bins.map(bin => (
              <BinCard key={bin.binId} bin={bin} />
            ))}
          </div>
        </div>

        {/* CHART */}
        <div className="card chart-card">
          <div className="card-label">7-Day Fill Level Trend</div>
          {lastUpdate && (
            <div className="last-update">Last update: {lastUpdate.toLocaleTimeString()}</div>
          )}
          <FillChart data={chartData} />
        </div>
      </main>
    </div>
  );
}