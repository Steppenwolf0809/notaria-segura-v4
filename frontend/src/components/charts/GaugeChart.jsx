import React from 'react';

const GaugeChart = ({ value = 0, min = 0, max = 100 }) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ height: 10, background: '#e5e7eb', borderRadius: 6 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: '#22c55e', borderRadius: 6 }} />
    </div>
  );
};

export default GaugeChart;

