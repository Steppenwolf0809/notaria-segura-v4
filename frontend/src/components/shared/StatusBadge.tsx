import React from 'react';
import { Chip } from '@mui/material';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

export type DocumentStatus = 'EN_PROCESO' | 'LISTO' | 'ENTREGADO' | 'ANULADO' | string;

interface StatusBadgeProps {
  status: DocumentStatus | null | undefined;
  className?: string;
}

function normalizeStatus(raw?: DocumentStatus | null): 'EN_PROCESO' | 'LISTO' | 'ENTREGADO' | 'ANULADO' | 'OTRO' {
  const value = (raw || '').toString().trim().toUpperCase();
  if (value === 'EN_PROCESO' || value === 'PROCESO') return 'EN_PROCESO';
  if (value === 'LISTO') return 'LISTO';
  if (value === 'ENTREGADO') return 'ENTREGADO';
  if (value === 'ANULADO_NOTA_CREDITO' || value === 'ANULADO') return 'ANULADO';
  return 'OTRO';
}

function getLabel(status: ReturnType<typeof normalizeStatus>): string {
  switch (status) {
    case 'EN_PROCESO':
      return 'En proceso';
    case 'LISTO':
      return 'Listo';
    case 'ENTREGADO':
      return 'Entregado';
    case 'ANULADO':
      return 'Anulado';
    default:
      return '—';
  }
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const norm = normalizeStatus(status);

  const chipProps = (() => {
    switch (norm) {
      case 'EN_PROCESO':
        return { color: 'warning' as const, icon: <HourglassEmptyIcon fontSize="small" /> };
      case 'LISTO':
        return { color: 'info' as const, icon: <TaskAltIcon fontSize="small" /> };
      case 'ENTREGADO':
        return { color: 'success' as const, icon: <CheckCircleIcon fontSize="small" /> };
      case 'ANULADO':
        return { color: 'error' as const, icon: <CancelIcon fontSize="small" /> };
      default:
        return { color: 'default' as const, icon: undefined };
    }
  })();

  return (
    <Chip
      size="small"
      variant="filled"
      {...chipProps}
      label={getLabel(norm)}
      className={className}
      sx={{ height: 22, fontWeight: 600, '& .MuiChip-label': { px: 1 } }}
    />
  );
}


