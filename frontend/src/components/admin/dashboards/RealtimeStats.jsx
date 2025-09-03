import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const timeAgo = (d) => {
  if (!d) return '—';
  const diff = Math.max(0, (Date.now() - new Date(d).getTime()) / 60000);
  const m = Math.floor(diff);
  return `Actualizado hace ${m} min`;
};

const RealtimeStats = ({ lastUpdated, onRefresh, loading }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" color="text.secondary">{timeAgo(lastUpdated)}</Typography>
      <Tooltip title="Actualizar ahora">
        <span>
          <IconButton onClick={onRefresh} disabled={loading} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default RealtimeStats;

