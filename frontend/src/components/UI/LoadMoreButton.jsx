import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { KeyboardArrowDown as ArrowDownIcon } from '@mui/icons-material';

/**
 * Componente botón "Cargar más" con indicador de loading
 * Diseño sutil y no prominente como especificado
 */
const LoadMoreButton = ({ 
  onLoadMore, 
  hasMore, 
  isLoading, 
  remainingCount = 0,
  disabled = false 
}) => {
  if (!hasMore) return null;

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      mt: 2,
      mb: 1
    }}>
      <Button
        onClick={onLoadMore}
        disabled={disabled || isLoading}
        variant="outlined"
        size="small"
        startIcon={isLoading ? (
          <CircularProgress size={14} />
        ) : (
          <ArrowDownIcon sx={{ fontSize: 16 }} />
        )}
        sx={{
          borderStyle: 'dotted',
          borderColor: 'rgba(148, 163, 184, 0.5)',
          color: 'text.secondary',
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'none',
          py: 0.5,
          px: 1.5,
          minHeight: 28,
          '&:hover': {
            backgroundColor: 'rgba(148, 163, 184, 0.08)',
            borderColor: 'rgba(148, 163, 184, 0.7)',
            borderStyle: 'solid'
          },
          '&:disabled': {
            opacity: 0.6
          }
        }}
      >
        {isLoading ? (
          'Cargando...'
        ) : (
          <>
            Cargar más
            {remainingCount > 0 && (
              <Typography component="span" sx={{ 
                ml: 0.5, 
                fontSize: '0.7rem', 
                opacity: 0.7 
              }}>
                ({remainingCount})
              </Typography>
            )}
          </>
        )}
      </Button>
    </Box>
  );
};

export default LoadMoreButton;