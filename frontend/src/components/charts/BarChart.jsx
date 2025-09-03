import React from 'react';

const BarChart = ({ data = [], onClick }) => {
  const max = Math.max(1, ...data.map(d => d.value||0));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => onClick?.(d)}>
          <div style={{ flex: 1, background: '#e5e7eb', height: 10, borderRadius: 6 }}>
            <div style={{ width: `${(d.value/max)*100}%`, height: '100%', background: '#3b82f6', borderRadius: 6 }} />
          </div>
          <small style={{ minWidth: 60, textAlign: 'right' }}>{d.value}</small>
          <small style={{ flexBasis: '40%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</small>
        </div>
      ))}
    </div>
  );
};

export default BarChart;

