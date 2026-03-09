import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f1419', border: '1px solid #1e2d3d', borderRadius: 8, padding: '0.6rem 1rem', fontFamily: 'DM Mono, monospace', fontSize: '0.72rem' }}>
      <div style={{ color: '#5a7080', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#00ff87' }}>Avg: {payload[0]?.value}%</div>
      {payload[1] && <div style={{ color: '#00d4ff' }}>Max: {payload[1]?.value}%</div>}
    </div>
  );
};

export default function FillChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: '0.75rem' }}>Waiting for data...</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00ff87" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00ff87" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1e2d3d" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fill: '#5a7080', fontSize: 11, fontFamily: 'DM Mono' }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#5a7080', fontSize: 11, fontFamily: 'DM Mono' }} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={80} stroke="#ff4d6d" strokeDasharray="4 4" strokeOpacity={0.5} />
        <ReferenceLine y={50} stroke="#ffd166" strokeDasharray="4 4" strokeOpacity={0.3} />
        <Area type="monotone" dataKey="avgFill" stroke="#00ff87" strokeWidth={2} fill="url(#fillGreen)" dot={{ fill: '#00ff87', r: 3 }} />
        <Area type="monotone" dataKey="maxFill" stroke="#00d4ff" strokeWidth={1.5} fill="url(#fillTeal)" dot={false} strokeDasharray="4 4" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
