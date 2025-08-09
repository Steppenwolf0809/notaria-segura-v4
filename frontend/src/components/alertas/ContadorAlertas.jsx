import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Componente contador de alertas para la barra de navegación
 * Muestra badge con número de alertas críticas y urgentes
 */
function ContadorAlertas({ userRole, onClick, autoRefresh = 300000 }) { // 5 minutos por defecto
  const [alertas, setAlertas] = useState({
    total: 0,
    criticas: 0,
    urgentes: 0,
    atencion: 0
  });
  const [loading, setLoading] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const fetchResumenAlertas = async () => {
    if (!userRole || ['CAJA'].includes(userRole)) {
      return; // CAJA no tiene alertas específicas
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/alertas/resumen`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setAlertas(response.data.data.stats);
        setUltimaActualizacion(response.data.data.ultimaActualizacion);
      }
    } catch (error) {
      console.error('Error obteniendo resumen de alertas:', error);
      // En caso de error, mantener los valores actuales o resetear
      if (error.response?.status === 401) {
        // Token expirado, no resetear para evitar parpadeos
        return;
      }
      setAlertas({ total: 0, criticas: 0, urgentes: 0, atencion: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Efecto inicial y configuración de auto-refresh
  useEffect(() => {
    fetchResumenAlertas();

    let interval;
    if (autoRefresh > 0) {
      interval = setInterval(fetchResumenAlertas, autoRefresh);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userRole, autoRefresh]);

  // Calcular número para el badge (críticas + urgentes)
  const badgeCount = alertas.criticas + alertas.urgentes;
  const showBadge = badgeCount > 0;

  // Determinar color del badge según el nivel más alto
  const getBadgeColor = () => {
    if (alertas.criticas > 0) return 'error';
    if (alertas.urgentes > 0) return 'warning';
    return 'info';
  };

  // Generar tooltip informativo
  const getTooltipText = () => {
    if (loading) return 'Cargando alertas...';
    if (badgeCount === 0) return 'Sin alertas críticas o urgentes';
    
    const parts = [];
    if (alertas.criticas > 0) parts.push(`${alertas.criticas} crítica${alertas.criticas !== 1 ? 's' : ''}`);
    if (alertas.urgentes > 0) parts.push(`${alertas.urgentes} urgente${alertas.urgentes !== 1 ? 's' : ''}`);
    if (alertas.atencion > 0) parts.push(`${alertas.atencion} de atención`);
    
    return parts.join(', ');
  };

  // Si no hay rol con alertas, no mostrar nada
  if (!userRole || ['CAJA'].includes(userRole)) {
    return null;
  }

  return (
    <Tooltip title={getTooltipText()}>
      <IconButton 
        color="inherit" 
        onClick={onClick}
        disabled={loading}
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          <Badge 
            badgeContent={showBadge ? badgeCount : 0}
            color={getBadgeColor()}
            max={99}
            invisible={!showBadge}
          >
            {alertas.criticas > 0 ? (
              <WarningIcon />
            ) : (
              <NotificationsIcon />
            )}
          </Badge>
        )}
      </IconButton>
    </Tooltip>
  );
}

export default ContadorAlertas;