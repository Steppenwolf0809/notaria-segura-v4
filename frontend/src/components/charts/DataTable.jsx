import React from 'react';

const DataTable = ({ columns = [], rows = [], actions }) => {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: 8, color: '#6b7280' }}>Sin datos</div>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table table-sm">
        <thead>
          <tr>
            {columns.map((c, i) => (<th key={i}>{c.label}</th>))}
            {actions && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c, j) => (<td key={j}>{r[c.key] ?? ''}</td>))}
              {actions && (
                <td>
                  {(actions(r) || []).map((a, k) => (
                    <button key={k} className="btn btn-link btn-sm" onClick={a.onClick}>{a.label}</button>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

