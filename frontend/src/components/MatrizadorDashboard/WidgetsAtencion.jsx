import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Notifications as NotificationsIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

/**
 * Widget "Requieren Atención" - EXACTO AL PROTOTIPO
 * Extraído de MatrizadorDashboardNew.jsx
 */
const RequierenAtencionWidget = ({ needAttentionDocs = [] }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <WarningIcon sx={{ color: 'warning.main', mr: 1.5, fontSize: 24 }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
          Requieren Atención
        </Typography>
        <Chip 
          label={needAttentionDocs.length} 
          color="warning" 
          size="small"
          sx={{ ml: 'auto' }}
        />
      </Box>
      
      {needAttentionDocs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: 'success.light', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            ¡Excelente! No hay documentos atrasados
          </Typography>
        </Box>
      ) : (
        <List dense sx={{ py: 0 }}>
          {needAttentionDocs.slice(0, 4).map((doc) => (
            <ListItem key={doc.id} sx={{ px: 0, py: 1 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'warning.light', width: 36, height: 36 }}>
                  <AccessTimeIcon sx={{ fontSize: 18 }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={doc.clientName}
                secondary={`${doc.documentType} - ${Math.floor((new Date() - new Date(doc.fechaFactura || doc.createdAt)) / (1000 * 60 * 60 * 24))} días`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
          {needAttentionDocs.length > 4 && (
            <ListItem sx={{ px: 0, justifyContent: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                +{needAttentionDocs.length - 4} documentos más
              </Typography>
            </ListItem>
          )}
        </List>
      )}
    </CardContent>
  </Card>
);

/**
 * Widget "Actividad Reciente" - EXACTO AL PROTOTIPO
 * Extraído de MatrizadorDashboardNew.jsx
 */
const ActividadRecienteWidget = ({ todayDocs = [] }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <NotificationsIcon sx={{ color: 'info.main', mr: 1.5, fontSize: 24 }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
          Actividad Reciente
        </Typography>
      </Box>
      
      <List dense sx={{ py: 0 }}>
        {todayDocs.slice(0, 5).map((doc) => (
          <ListItem key={doc.id} sx={{ px: 0, py: 1 }}>
            <ListItemAvatar>
              <Avatar sx={{ 
                bgcolor: doc.status === 'LISTO' ? 'success.main' : 'info.main', 
                width: 36, 
                height: 36 
              }}>
                {doc.status === 'LISTO' ? 
                  <CheckCircleIcon sx={{ fontSize: 18 }} /> : 
                  <AssignmentIcon sx={{ fontSize: 18 }} />
                }
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={doc.clientName}
              secondary={`${doc.documentType} - Hoy`}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
            <Chip
              label={doc.status === 'LISTO' ? 'Completado' : 'En Proceso'}
              size="small"
              color={doc.status === 'LISTO' ? 'success' : 'info'}
              variant="outlined"
            />
          </ListItem>
        ))}
        
        {todayDocs.length === 0 && (
          <ListItem sx={{ px: 0, justifyContent: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No hay actividad reciente hoy
            </Typography>
          </ListItem>
        )}
      </List>
    </CardContent>
  </Card>
);

/**
 * Sección de Widgets de Atención - 2 COLUMNAS
 * Incluye widgets de documentos que requieren atención y actividad reciente
 */
const WidgetsAtencion = ({ advancedMetrics, loading = false }) => {
  // Si está cargando, mostramos skeleton básico
  if (loading) {
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 300 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ width: 140, height: 24, bgcolor: 'grey.300', borderRadius: 1 }} />
              </Box>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Box sx={{ width: 48, height: 48, bgcolor: 'grey.200', borderRadius: '50%', mx: 'auto', mb: 1 }} />
                <Box sx={{ width: 200, height: 16, bgcolor: 'grey.200', borderRadius: 1, mx: 'auto' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 300 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ width: 140, height: 24, bgcolor: 'grey.300', borderRadius: 1 }} />
              </Box>
              <Box sx={{ py: 1 }}>
                {[1, 2, 3].map((item) => (
                  <Box key={item} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: 36, height: 36, bgcolor: 'grey.200', borderRadius: '50%', mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ width: '70%', height: 16, bgcolor: 'grey.300', borderRadius: 1, mb: 0.5 }} />
                      <Box sx={{ width: '50%', height: 12, bgcolor: 'grey.200', borderRadius: 1 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} lg={6}>
        <RequierenAtencionWidget needAttentionDocs={advancedMetrics.needAttention} />
      </Grid>
      <Grid item xs={12} lg={6}>
        <ActividadRecienteWidget todayDocs={advancedMetrics.todayDocs} />
      </Grid>
    </Grid>
  );
};

export default WidgetsAtencion;