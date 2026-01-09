import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { Clear as ClearIcon, Search as SearchIcon } from '@mui/icons-material';

/**
 * Componente reutilizable de filtro de rango de fechas
 * Utiliza MUI X Date Pickers con estilo dark mode compatible
 * Requiere clic en "Aplicar" para ejecutar el filtro
 */
const DateRangeFilter = ({
    fechaDesde,
    fechaHasta,
    onFechaDesdeChange,
    onFechaHastaChange,
    onApply,
    onClear,
    label = 'Filtrar por fecha',
    size = 'small'
}) => {
    // Estado interno para manejar las fechas antes de aplicar
    const [localDesde, setLocalDesde] = useState(fechaDesde || '');
    const [localHasta, setLocalHasta] = useState(fechaHasta || '');

    // Sincronizar con props externas cuando cambian
    useEffect(() => {
        setLocalDesde(fechaDesde || '');
        setLocalHasta(fechaHasta || '');
    }, [fechaDesde, fechaHasta]);

    // Convertir string ISO a Date para el DatePicker (usando hora local)
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        // Parsear YYYY-MM-DD como fecha local, no UTC
        const [year, month, day] = dateStr.split('-').map(Number);
        if (!year || !month || !day) return null;
        const date = new Date(year, month - 1, day);
        return isNaN(date.getTime()) ? null : date;
    };

    // Formatear Date a string ISO (YYYY-MM-DD) para el estado
    // IMPORTANTE: Usar fecha local, no UTC, para evitar problemas de zona horaria
    const formatDate = (date) => {
        if (!date || isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const hasLocalFilters = localDesde || localHasta;
    const hasAppliedFilters = fechaDesde || fechaHasta;

    // Verificar si hay cambios pendientes de aplicar
    const hasPendingChanges = localDesde !== (fechaDesde || '') || localHasta !== (fechaHasta || '');

    const handleApply = () => {
        if (onApply) {
            onApply(localDesde, localHasta);
        } else {
            // Fallback: llamar a los handlers individuales
            if (onFechaDesdeChange) onFechaDesdeChange(localDesde);
            if (onFechaHastaChange) onFechaHastaChange(localHasta);
        }
    };

    const handleClear = () => {
        setLocalDesde('');
        setLocalHasta('');
        if (onClear) {
            onClear();
        } else {
            if (onFechaDesdeChange) onFechaDesdeChange('');
            if (onFechaHastaChange) onFechaHastaChange('');
        }
    };

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
                    value={parseDate(localDesde)}
                    onChange={(newValue) => setLocalDesde(formatDate(newValue))}
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
                    value={parseDate(localHasta)}
                    onChange={(newValue) => setLocalHasta(formatDate(newValue))}
                    minDate={parseDate(localDesde)}
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

                {/* Botón Aplicar - visible cuando hay cambios pendientes */}
                {hasLocalFilters && (
                    <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={handleApply}
                        startIcon={<SearchIcon />}
                        disabled={!hasPendingChanges && hasAppliedFilters}
                        sx={{
                            textTransform: 'none',
                            minWidth: 'auto',
                            px: 2
                        }}
                    >
                        Aplicar
                    </Button>
                )}

                {/* Botón Limpiar - visible cuando hay filtros aplicados */}
                {(hasLocalFilters || hasAppliedFilters) && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={handleClear}
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

