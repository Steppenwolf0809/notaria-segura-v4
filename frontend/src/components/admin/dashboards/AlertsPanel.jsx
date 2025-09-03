import React from 'react';
import { Card, CardContent, Typography, Skeleton } from '@mui/material';
import DataTable from '../../charts/DataTable.jsx';

const AlertsPanel = ({ alerts = [], loading, onDrillDown }) => {
  const cols = [
    { key: 'tipo', label: 'Tipo' },
    { key: 'severidad', label: 'Severidad' },
    { key: 'detalle', label: 'Detalle' },
    { key: 'documento_id', label: 'Documento' },
    { key: 'creado_at', label: 'Fecha' },
  ];

  const actions = (row) => [
    row.documento_id ? { label: 'Ver documento', onClick: () => onDrillDown?.(`documento_id=${row.documento_id}`) } : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1">Alertas</Typography>
        {loading ? <Skeleton height={200} /> : (
          <DataTable columns={cols} rows={alerts} actions={actions} emptyLabel="Sin alertas" />
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;

