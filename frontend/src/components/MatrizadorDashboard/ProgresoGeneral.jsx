import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress
} from '@mui/material';

/**
 * Componente Progress Bar General - EXACTO AL PROTOTIPO
 * Extraído de MatrizadorDashboardNew.jsx
 */
const ProgresoGeneral = ({ kpiMetrics, loading = false }) => {
  // Si está cargando, mostramos skeleton
  if (loading) {
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ width: 140, height: 24, bgcolor: 'grey.300', borderRadius: 1 }} />
            <Box sx={{ width: 60, height: 24, bgcolor: 'grey.300', borderRadius: 1 }} />
          </Box>
          <Box sx={{ 
            height: 10, 
            bgcolor: 'grey.200', 
            borderRadius: 5,
            mb: 1
          }} />
          <Box sx={{ width: 220, height: 14, bgcolor: 'grey.200', borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Progreso General
          </Typography>
          <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
            {kpiMetrics.productivity.value}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={kpiMetrics.productivity.numericValue || 75} 
          sx={{ 
            height: 10, 
            borderRadius: 5,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5
            }
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Documentos completados del total asignado
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ProgresoGeneral;