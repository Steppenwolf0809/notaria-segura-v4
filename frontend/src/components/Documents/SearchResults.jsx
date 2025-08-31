import React from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import DocRow from './DocRow';

const SearchResults = ({ contextHits = [], globalGroups = [], onVerTodos, onListo, onEntregar }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {contextHits?.length > 0 && (
        <>
          <Typography variant="caption" sx={{ color: 'text.secondary', pl: 1 }}>Resultados en la vista actual</Typography>
          {contextHits.map((d) => (
            <DocRow key={d.id} doc={d} onListo={onListo} onEntregar={onEntregar} />
          ))}
        </>
      )}
      {globalGroups && globalGroups.length > 0 && (
        <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Resultados globales (Todos los estados)</Typography>
          {globalGroups.map((g) => (
            <Box key={g.state} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip size="small" label={g.state === 'proceso' ? 'En proceso' : g.state.charAt(0).toUpperCase() + g.state.slice(1)} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{g.count} coincidencias</Typography>
                <Button size="small" onClick={() => onVerTodos?.(g.state)}>Ver todos</Button>
              </Box>
              {g.hits?.map((d) => (
                <DocRow key={d.id} doc={d} onListo={onListo} onEntregar={onEntregar} />
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SearchResults;

