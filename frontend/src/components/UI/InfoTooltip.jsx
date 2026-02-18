import React from 'react';
import { Tooltip } from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { grey } from '@mui/material/colors';

/**
 * Componente reutilizable de tooltip informativo para el rol administrador.
 * Muestra un icono (i) discreto que al hacer hover despliega una explicación.
 *
 * @param {string} text - Texto a mostrar en el tooltip.
 * @param {string} [placement='top'] - Posición del tooltip (top, bottom, left, right).
 * @param {object} [sx] - Estilos adicionales para el icono.
 */
const InfoTooltip = ({ text, placement = 'top', sx = {} }) => (
  <Tooltip
    title={text}
    placement={placement}
    arrow
    slotProps={{
      tooltip: {
        sx: {
          bgcolor: grey[900],
          color: '#fff',
          fontSize: '12px',
          lineHeight: 1.5,
          maxWidth: 280,
          p: '8px 12px',
          whiteSpace: 'pre-line',
          '& .MuiTooltip-arrow': {
            color: grey[900],
          },
        },
      },
      arrow: {
        sx: {
          color: grey[900],
        },
      },
    }}
  >
    <InfoOutlinedIcon
      sx={{
        fontSize: 16,
        color: 'action.active',
        opacity: 0.6,
        cursor: 'help',
        transition: 'opacity 0.2s ease',
        '&:hover': { opacity: 1 },
        verticalAlign: 'middle',
        ml: 0.5,
        ...sx,
      }}
    />
  </Tooltip>
);

export default InfoTooltip;
