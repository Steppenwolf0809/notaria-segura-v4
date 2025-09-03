import React, { useMemo, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Skeleton, Alert, Chip, IconButton, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import KPISection from './KPISection.jsx';
import FlowCharts from './FlowCharts.jsx';
import ProductivityMetrics from './ProductivityMetrics.jsx';
import FinancialMetrics from './FinancialMetrics.jsx';
import AlertsPanel from './AlertsPanel.jsx';
import RealtimeStats from './RealtimeStats.jsx';
import useAdminKpis from '../../../modules/kpis/hooks/useAdminKpis.ts';

const AdminDashboardMain = ({ onDrillDown }) => {
  const [days, setDays] = useState(7);
  const {
    general, productivity, financial, alerts,
    loading, error, lastUpdated, refresh,
  } = useAdminKpis({ days });

  const handleDrill = (qs) => {
    if (onDrillDown) onDrillDown(qs);
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <RealtimeStats lastUpdated={lastUpdated} onRefresh={refresh} loading={loading} />
        <Box>
          <Chip label={`${days} días`} color="info" variant="outlined" sx={{ mr: 1 }} />
          <Button size="small" onClick={() => setDays(days === 7 ? 30 : 7)}>
            {days === 7 ? 'Ver 30 días' : 'Ver 7 días'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <KPISection data={general?.resumen} loading={loading} onDrillDown={handleDrill} />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Estados de documentos</Typography>
              <FlowCharts estados={general?.estados || []} flujo={general?.flujo_diario || []} days={days} loading={loading} onDrillDown={handleDrill} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <FinancialMetrics data={financial} loading={loading} onDrillDown={handleDrill} />
        </Grid>
        <Grid item xs={12}>
          <ProductivityMetrics data={productivity} loading={loading} onDrillDown={handleDrill} />
        </Grid>
        <Grid item xs={12}>
          <AlertsPanel alerts={alerts} loading={loading} onDrillDown={handleDrill} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboardMain;

