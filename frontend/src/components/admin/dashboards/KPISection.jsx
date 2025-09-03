import React from 'react';
import { Grid, Card, CardContent, Typography, Skeleton } from '@mui/material';

const formatNumber = (n) => new Intl.NumberFormat('es-EC').format(n || 0);

const KPICard = ({ title, value, accent, onClick, loading }) => (
  <Card onClick={onClick} sx={{ cursor: onClick ? 'pointer' : 'default' }}>
    <CardContent>
      <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
      {loading ? <Skeleton width={80} /> : (
        <Typography variant="h5" sx={{ color: accent, fontWeight: 600 }}>{value}</Typography>
      )}
    </CardContent>
  </Card>
);

const KPISection = ({ data, loading, onDrillDown }) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <KPICard title="Ingresados hoy" value={formatNumber(data?.ingresados_hoy)} accent="primary.main" loading={loading} onClick={() => onDrillDown?.('state=PENDIENTE')} />
      </Grid>
      <Grid item xs={6} md={3}>
        <KPICard title="Procesados hoy" value={formatNumber(data?.procesados_hoy)} accent="info.main" loading={loading} onClick={() => onDrillDown?.('state=LISTO')} />
      </Grid>
      <Grid item xs={6} md={3}>
        <KPICard title="Entregados hoy" value={formatNumber(data?.entregados_hoy)} accent="success.main" loading={loading} onClick={() => onDrillDown?.('state=ENTREGADO')} />
      </Grid>
      <Grid item xs={6} md={3}>
        <KPICard title="T. prom (h)" value={data?.t_prom_procesamiento_horas ?? 0} accent="warning.main" loading={loading} />
      </Grid>
    </Grid>
  );
};

export default KPISection;

