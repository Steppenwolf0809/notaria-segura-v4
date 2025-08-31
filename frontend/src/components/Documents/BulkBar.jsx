import React from 'react';
import { Box, Button, Typography } from '@mui/material';

const BulkBar = ({ count, onMarkListo }) => {
  if (!count) return null;
  return (
    <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', p: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="body2">{count} seleccionados</Typography>
      <Button size="small" variant="contained" onClick={onMarkListo}>Marcar Listo</Button>
    </Box>
  );
};

export default BulkBar;

