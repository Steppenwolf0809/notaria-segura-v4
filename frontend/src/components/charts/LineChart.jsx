import React from 'react';

const LineChart = ({ data = [], onClick }) => {
  // Simple sparkline-like representation using a list
  const max = Math.max(1, ...data.map(d => Math.max(d.y1||0, d.y2||0, d.y3||0)));
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
      {data.map((d, i) => (
        <div key={i} style={{ cursor: 'pointer' }} onClick={() => onClick?.(d)}>
          <div title={`${d.x}: ${d.y1 || d.y}`}
            style={{ width: 6, height: `${((d.y1||d.y)/max)*100}%`, background: '#3b82f6' }} />
        </div>
      ))}
    </div>
  );
};

export default LineChart;

