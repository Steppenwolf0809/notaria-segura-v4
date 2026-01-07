import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Chip,
  Box,
  Typography,
  Collapse,
  IconButton,
  Tooltip,
  Skeleton
} from '@mui/material';
import {
  Group as GroupIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoAwesome as SmartIcon,
  Info as InfoIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import documentService from '../../services/document-service';

/**
 * 🔗 COMPONENTE DE ALERTA DE AGRUPACIÓN
 * Muestra avisos cuando hay documentos que pueden agruparse
 * Componente reutilizable para tarjetas, listas y cualquier vista
 */
const GroupingAlert = ({ 
  document, 
  variant = 'standard', // 'standard', 'compact', 'chip'
  onGroupAction,
  showAutoButton = true,
  sx = {}
}) => {
  const [groupableDocuments, setGroupableDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Solo verificar si el documento está EN_PROCESO y tiene clientName
    if (document?.status === 'EN_PROCESO' && document?.clientName && !hasChecked) {
      detectGroupableDocuments();
    }
  }, [document, hasChecked]);

  /**
   * Detectar documentos agrupables
   */
  const detectGroupableDocuments = async () => {
    if (!document?.clientName) return;

    setLoading(true);
    setHasChecked(true);

    try {
      const response = await documentService.detectGroupableDocuments({
        clientName: document.clientName,
        clientPhone: document.clientPhone || ''
      });

      // Filtrar el documento actual de la lista
      const otherDocs = response.groupableDocuments?.filter(doc => doc.id !== document.id) || [];

      if (response.canGroup && otherDocs.length > 0) {
        setGroupableDocuments(otherDocs);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manejar acción de agrupación
   */
  const handleGroupAction = (event) => {
    // Prevenir propagación del click para evitar conflictos con tarjeta padre
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (onGroupAction) {
      onGroupAction(groupableDocuments, document);
    }
  };

  // No mostrar nada si no hay documentos agrupables o está cargando
  if (loading) {
    return variant === 'chip' ? (
      <Skeleton variant="rectangular" width={120} height={24} sx={{ borderRadius: 12 }} />
    ) : null;
  }

  if (groupableDocuments.length === 0) {
    return null;
  }

  // Variante CHIP - Para espacios pequeños
  if (variant === 'chip') {
    return (
      <Tooltip title={`${groupableDocuments.length} documentos pueden agruparse con este`}>
        <Chip
          icon={<GroupIcon />}
          label={`Agrupar (${groupableDocuments.length + 1})`}
          color="warning"
          size="small"
          onClick={handleGroupAction}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'warning.dark',
              color: 'white'
            },
            ...sx
          }}
        />
      </Tooltip>
    );
  }

  // Variante COMPACT - Ultra-compacta con área clickeable amplia
  if (variant === 'compact') {
    return (
      <Box
        onClick={showAutoButton ? handleGroupAction : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: 'rgba(23, 162, 184, 0.1)',
          border: '1px solid #17a2b8',
          borderRadius: '4px',
          fontSize: '11px',
          marginTop: '6px',
          marginBottom: '4px',
          minHeight: '28px', // Área generosa para click
          cursor: showAutoButton ? 'pointer' : 'default',
          userSelect: 'none',
          transition: 'all 0.2s ease',
          '&:hover': showAutoButton ? {
            background: 'rgba(23, 162, 184, 0.2)',
            borderColor: '#138496',
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 4px rgba(23, 162, 184, 0.3)',
            '& .accion-agrupacion': {
              background: '#138496'
            }
          } : {},
          ...sx
        }}
      >
        {/* Información de agrupación */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          flexGrow: 1 
        }}>
          <SmartIcon sx={{ fontSize: '12px', color: '#17a2b8', mr: 0.5 }} />
          <Typography variant="caption" sx={{ 
            color: '#17a2b8', 
            fontWeight: 500,
            fontSize: '11px',
            lineHeight: 1,
            ml: 0.5
          }}>
            +{groupableDocuments.length} relacionado{groupableDocuments.length > 1 ? 's' : ''}
          </Typography>
        </Box>
        
        {/* Acción visual (ya no es botón separado) */}
        {showAutoButton && (
          <Box 
            className="accion-agrupacion"
            sx={{
              display: 'flex',
              alignItems: 'center',
              background: '#17a2b8',
              color: 'white',
              padding: '3px 8px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 600,
              transition: 'background 0.2s ease'
            }}>
            <Typography variant="caption" sx={{ 
              fontSize: '10px', 
              fontWeight: 600,
              color: 'inherit',
              mr: 0.5
            }}>
              Agrupar
            </Typography>
            <ChevronRightIcon sx={{ fontSize: '10px' }} />
          </Box>
        )}
      </Box>
    );
  }

  // Variante STANDARD - Para tarjetas completas
  return (
    <Alert 
      severity="warning" 
      icon={<SmartIcon />}
      sx={{ 
        mb: 2,
        border: '1px solid',
        borderColor: 'warning.main',
        ...sx 
      }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showAutoButton && (
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={handleGroupAction}
              startIcon={<GroupIcon />}
            >
              Agrupar Ahora
            </Button>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            color="inherit"
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      }
    >
      <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🔗 Documentos Agrupables Detectados
      </AlertTitle>
      
      <Typography variant="body2" sx={{ mb: 1 }}>
        Se encontraron <strong>{groupableDocuments.length} documentos adicionales</strong> del 
        mismo cliente:
      </Typography>
      
      <Box sx={{ 
        mb: 2, 
        p: 1.5, 
        bgcolor: 'info.light', 
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'info.main'
      }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'info.dark' }}>
          👤 {document.clientName}
        </Typography>
        {document.clientPhone && (
          <Typography variant="body2" sx={{ color: 'info.dark', fontSize: '0.875rem' }}>
            📱 {document.clientPhone}
          </Typography>
        )}
        <Typography variant="caption" sx={{ 
          color: 'warning.dark',
          fontWeight: 'bold',
          display: 'block',
          mt: 0.5
        }}>
          ⚠️ Verifique que sea la misma persona para agrupar
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
        <strong>Beneficios de agrupar:</strong>
      </Typography>

      <Box sx={{ mb: 1 }}>
        <Chip 
          icon={<InfoIcon />} 
          label="Un solo código de retiro" 
          size="small" 
          color="primary" 
          sx={{ mr: 0.5, mb: 0.5 }} 
        />
        <Chip 
          icon={<InfoIcon />} 
          label="Una notificación WhatsApp" 
          size="small" 
          color="primary" 
          sx={{ mr: 0.5, mb: 0.5 }} 
        />
        <Chip 
          icon={<InfoIcon />} 
          label="Entrega conjunta" 
          size="small" 
          color="primary" 
          sx={{ mr: 0.5, mb: 0.5 }} 
        />
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            📄 Documentos que se pueden agrupar:
          </Typography>
          {groupableDocuments.map((doc, index) => (
            <Box key={doc.id} sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              mb: 1.5, 
              p: 1,
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Chip
                  label={doc.documentType}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ mr: 1, fontSize: '0.75rem' }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {doc.protocolNumber}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                📅 {new Date(doc.fechaFactura || doc.createdAt).toLocaleDateString('es-EC')} •
                🔄 {doc.status}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Alert>
  );
};

export default GroupingAlert;