import React from 'react';
import { Card, CardContent, Typography, Grid, Skeleton, Chip } from '@mui/material';
import LineChart from '../../charts/LineChart.jsx';
import BarChart from '../../charts/BarChart.jsx';

const formatMoney = (n) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n || 0);

const FinancialMetrics = ({ data, loading, onDrillDown }) => {
  const serie = data?.serie || [];
  const porTipo = (data?.por_tipo || []).sort((a,b) => b.total - a.total);
  const topN = porTipo.slice(0, 5);
  const otros = porTipo.slice(5).reduce((a,b)=>a+b.total,0);
  const bars = [...topN.map(t => ({ label: t.clave, value: t.total })), ...(otros>0?[{label:'Otros', value: otros}]:[])];

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1">Finanzas</Typography>
        <Typography variant="caption" color="text.secondary">Fuente: Facturación autorizada</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={8}>
            {loading ? <Skeleton height={180} /> : <LineChart data={serie.map(s => ({ x: s.fecha, y1: s.total }))} onClick={(d)=>onDrillDown?.(`fecha=${d?.x}`)} />}
          </Grid>
          <Grid item xs={12} md={4}>
            {loading ? <Skeleton height={180} /> : <BarChart data={bars} onClick={(item)=>onDrillDown?.(`tipo_documento=${encodeURIComponent(item?.label||'')}`)} />}
          </Grid>
        </Grid>
        {!loading && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={4}><Chip label={`Facturado: ${formatMoney(data?.totales?.total_facturado)}`} color="success" variant="outlined" /></Grid>
            <Grid item xs={4}><Chip label={`Notas crédito: ${formatMoney(data?.totales?.total_nc)}`} color="warning" variant="outlined" /></Grid>
            <Grid item xs={4}><Chip label={`Neto: ${formatMoney(data?.totales?.neto)}`} color="info" variant="outlined" /></Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialMetrics;

