import React, { useState } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';

const stateChip = (status) => {
  if (status === 'EN_PROCESO') return { label: 'En proceso', color: 'warning' };
  if (status === 'LISTO') return { label: 'Listo', color: 'success' };
  if (status === 'ENTREGADO') return { label: 'Entregado', color: 'default' };
  return { label: status, color: 'default' };
};

const DocRow = ({ doc, onListo, onEntregar, compact }) => {
  const ch = stateChip(doc.status);
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px auto', gap: 1, alignItems: 'center', py: 1, px: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, cursor: 'pointer' }} title="Copiar al buscador">
        {doc.protocolNumber}
      </Typography>
      <Typography variant="body2" noWrap title={doc.clientName} sx={{ color: 'text.primary' }}>{doc.clientName}</Typography>
      <Chip size="small" label={ch.label} color={ch.color} variant="outlined" />
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        {doc.status === 'EN_PROCESO' && (
          <Button size="small" variant="outlined" onClick={() => onListo?.(doc)}>Listo</Button>
        )}
        {doc.status === 'LISTO' && (
          <Button size="small" variant="contained" onClick={() => onEntregar?.(doc)}>Entregar</Button>
        )}
      </Box>
    </Box>
  );
};

export default DocRow;

