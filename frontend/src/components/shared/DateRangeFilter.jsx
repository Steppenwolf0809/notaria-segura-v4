import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { Clear as ClearIcon } from '@mui/icons-material';

/**
 * Componente reutilizable de filtro de rango de fechas
 * Utiliza MUI X Date Pickers con estilo dark mode compatible
 */
const DateRangeFilter = ({
    fechaDesde,
    fechaHasta,
    onFechaDesdeChange,
    onFechaHastaChange,
    onClear,
    label = 'Filtrar por fecha',
    size = 'small'
}) => {
    // Convertir string ISO a Date para el DatePicker
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    };

    // Formatear Date a string ISO (YYYY-MM-DD) para el estado
    const formatDate = (date) => {
        if (!date || isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    };

    const hasFilters = fechaDesde || fechaHasta;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                {label && (
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                        {label}:
                    </Typography>
                )}

                <DatePicker
                    label="Fecha Desde"
                    value={parseDate(fechaDesde)}
                    onChange={(newValue) => onFechaDesdeChange(formatDate(newValue))}
                    slotProps={{
                        textField: {
                            size,
                            sx: { minWidth: 150 }
                        },
                        actionBar: {
                            actions: ['clear', 'today']
                        }
                    }}
                    format="dd/MM/yyyy"
                />

                <DatePicker
                    label="Fecha Hasta"
                    value={parseDate(fechaHasta)}
                    onChange={(newValue) => onFechaHastaChange(formatDate(newValue))}
                    minDate={parseDate(fechaDesde)}
                    slotProps={{
                        textField: {
                            size,
                            sx: { minWidth: 150 }
                        },
                        actionBar: {
                            actions: ['clear', 'today']
                        }
                    }}
                    format="dd/MM/yyyy"
                />

                {hasFilters && onClear && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={onClear}
                        startIcon={<ClearIcon />}
                        sx={{
                            textTransform: 'none',
                            minWidth: 'auto',
                            px: 1.5
                        }}
                    >
                        Limpiar
                    </Button>
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default DateRangeFilter;
