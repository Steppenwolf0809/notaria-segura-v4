import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import PieChart from '../../charts/PieChart.jsx';
import LineChart from '../../charts/LineChart.jsx';

const FlowCharts = ({ estados = [], flujo = [], days = 7, loading, onDrillDown }) => {
  const dataEstados = estados.map(e => ({ label: e.clave, value: e.total }));
  const dataFlujo = flujo.slice(-days).map(f => ({ x: f.fecha, y1: f.ingresados, y2: f.procesados, y3: f.entregados }));

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary">Distribución de estados</Typography>
      {loading ? <Skeleton height={160} /> : <PieChart data={dataEstados} onClick={(label) => onDrillDown?.(`state=${label === 'LISTO_ENTREGA' ? 'LISTO' : label}`)} />}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Flujo diario</Typography>
      {loading ? <Skeleton height={160} /> : <LineChart data={dataFlujo} onClick={(d) => onDrillDown?.(`fecha=${d?.x}`)} />}
    </Box>
  );
};

export default FlowCharts;

