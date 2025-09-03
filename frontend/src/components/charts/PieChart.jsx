import React from 'react';

// Minimal pie using CSS (no libs) – clickable legend slices
const PieChart = ({ data = [], onClick }) => {
  const total = data.reduce((a,b)=>a+(b.value||0),0) || 1;
  let acc = 0;
  const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#06b6d4','#9333ea'];
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => onClick?.(d.label)}>
            <span style={{ width: 10, height: 10, background: colors[i%colors.length], display: 'inline-block', marginRight: 6, borderRadius: 2 }} />
            <small>{d.label}: {d.value}</small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;

