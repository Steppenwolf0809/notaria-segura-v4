import React, { useState } from 'react'
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Button,
  Snackbar
} from '@mui/material'
import {
  CheckCircle,
  Warning,
  Error,
  ExpandMore,
  ExpandLess,
  AutoFixHigh,
  Info
} from '@mui/icons-material'

/**
 * Panel de validación de calidad de datos extraídos
 * Muestra puntuación, problemas detectados y correcciones sugeridas
 */
export default function DataValidationPanel({ validation, onApplyFixes, onDataUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [applyingFixes, setApplyingFixes] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  if (!validation) {
    return null
  }

  const { score, confidence, summary, issues, warnings, suggestions, autoFixes } = validation

  // Determinar color y icono basado en la confianza
  const getConfidenceConfig = () => {
    switch (confidence) {
      case 'high':
        return { color: 'success', icon: <CheckCircle />, label: 'Alta calidad' }
      case 'medium':
        return { color: 'warning', icon: <Warning />, label: 'Calidad aceptable' }
      case 'low':
        return { color: 'error', icon: <Error />, label: 'Requiere revisión' }
      case 'very_low':
        return { color: 'error', icon: <Error />, label: 'Calidad muy baja' }
      default:
        return { color: 'info', icon: <Info />, label: 'Sin validar' }
    }
  }

  const config = getConfidenceConfig()
  const scorePercentage = Math.round(score * 100)
  const hasAutoFixes = autoFixes && Object.keys(autoFixes).length > 0
  const totalProblems = (issues?.length || 0) + (warnings?.length || 0)

  const handleApplyFixes = async () => {
    if (!hasAutoFixes || !onApplyFixes) return

    setApplyingFixes(true)
    try {
      await onApplyFixes(autoFixes)
      setSnackbar({
        open: true,
        message: 'Correcciones aplicadas exitosamente',
        severity: 'success'
      })
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error aplicando correcciones: ' + (error.message || 'Error desconocido'),
        severity: 'error'
      })
    } finally {
      setApplyingFixes(false)
    }
  }

  return (
    <Paper elevation={2} sx={{ mb: 2 }}>
      <Alert severity={config.color} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {config.icon}
            <AlertTitle sx={{ mb: 0 }}>
              Validación de Datos - {config.label}
            </AlertTitle>
            <Chip 
              label={`${scorePercentage}%`} 
              color={config.color} 
              size="small" 
              variant="outlined"
            />
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {hasAutoFixes && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<AutoFixHigh />}
                onClick={handleApplyFixes}
                disabled={applyingFixes}
                sx={{ mr: 1 }}
              >
                {applyingFixes ? 'Aplicando...' : 'Corregir Automáticamente'}
              </Button>
            )}
            
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              disabled={totalProblems === 0 && !suggestions?.length}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ mt: 1 }}>
          {summary}
        </Typography>

        <Collapse in={expanded} timeout="auto">
          <Box sx={{ mt: 2 }}>
            {/* Issues críticos */}
            {issues && issues.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  <Error fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Problemas críticos ({issues.length})
                </Typography>
                <List dense>
                  {issues.map((issue, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Error color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={issue}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Advertencias */}
            {warnings && warnings.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  <Warning fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Advertencias ({warnings.length})
                </Typography>
                <List dense>
                  {warnings.map((warning, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Warning color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={warning}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Sugerencias */}
            {suggestions && suggestions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="info.main" gutterBottom>
                  <Info fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Sugerencias ({suggestions.length})
                </Typography>
                <List dense>
                  {suggestions.map((suggestion, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Info color="info" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={suggestion}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Correcciones automáticas disponibles */}
            {hasAutoFixes && (
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  <AutoFixHigh fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Correcciones automáticas disponibles ({Object.keys(autoFixes).length})
                </Typography>
                <List dense>
                  {Object.entries(autoFixes).map(([field, value], index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <AutoFixHigh color="primary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${field}: "${value}"`}
                        primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </Collapse>
      </Alert>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  )
}
