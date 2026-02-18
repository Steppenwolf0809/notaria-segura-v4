import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    LinearProgress,
    Chip,
    Tooltip,
    InputAdornment,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Collapse,
    MenuItem,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    Info as InfoIcon,
    AttachMoney as MoneyIcon,
    TrendingUp as TrendingIcon,
    Schedule as ClockIcon,
    Gavel as JudicaturaIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import billingService from '../../services/billing-service';
import {
    calculateStateParticipation,
    calculateBracketProgress,
    getSemaphoreState,
    extractSubtotal,
    getMonthRange,
} from '../../utils/stateParticipationCalculator';
import {
    TAX_BRACKETS,
    SBU_CURRENT,
    IVA_RATE,
} from '../../config/state_participation_config';
import InfoTooltip from '../UI/InfoTooltip';

// ── Helpers ──
const fmt = (val) =>
    '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (val) => `${(val * 100).toFixed(0)}%`;

const MONTHS_TO_SHOW = 6;

const TOOLTIP_LEGAL = `Calculo basado en la Resolucion 005-2023 del Consejo de la Judicatura.\n\nBase Imponible = Subtotal facturado (sin IVA) del mes en curso.\nFormula: Base Fija (SBU x $${SBU_CURRENT}) + Tasa Variable x (Facturado - Limite Inferior del tramo).\n\nEste valor refleja unicamente lo facturado hasta la fecha de corte, sin proyecciones a futuro. El IVA (${(IVA_RATE * 100).toFixed(0)}%) se excluye automaticamente del monto total registrado en el sistema.`;

const createMonthOptions = (monthsBack = MONTHS_TO_SHOW) => {
    const today = new Date();

    return Array.from({ length: monthsBack }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const rawLabel = date.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });

        return {
            key,
            date,
            label: rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1),
        };
    });
};

// ── Payment Info Banner ──
const PaymentInfoBanner = ({ selectedMonthKey }) => {
    // Parse the selected month to compute the payment month (next month)
    const [year, month] = (selectedMonthKey || '').split('-').map(Number);
    const billingDate = new Date(year, month - 1, 1);
    const paymentDate = new Date(year, month, 1); // next month
    const billingMonthName = billingDate.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
    const paymentMonthName = paymentDate.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                mb: 3,
                borderRadius: 3,
                border: '1.5px solid #6366f130',
                bgcolor: 'rgba(99, 102, 241, 0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
            }}
        >
            <ClockIcon sx={{ color: '#6366f1' }} />
            <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 700, fontSize: '0.8125rem' }}>
                    Fecha limite de pago: 10 de {paymentMonthName}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                    Lo facturado en {billingMonthName} se paga hasta el 10 del mes siguiente.
                </Typography>
            </Box>
        </Paper>
    );
};

// ── Bracket Table ──
const BracketReferenceTable = ({ currentBracket }) => {
    const [open, setOpen] = useState(false);

    return (
        <Box sx={{ mt: 2 }}>
            <Box
                onClick={() => setOpen(!open)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    py: 0.5,
                    '&:hover': { opacity: 0.8 },
                }}
            >
                <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Tabla de Referencia — Resolucion 005-2023
                </Typography>
                {open ? <CollapseIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> : <ExpandIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
            </Box>
            <Collapse in={open}>
                <TableContainer component={Paper} elevation={0} sx={{ mt: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary' }}>Esquema</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary' }}>Rango (USD)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary' }}>Base Fija (SBU)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary' }}>Base Fija ($)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'text.secondary' }}>% Variable</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {TAX_BRACKETS.map((b) => (
                                <TableRow
                                    key={b.schema}
                                    sx={{
                                        bgcolor: b.schema === currentBracket ? 'action.selected' : 'transparent',
                                        '& td': { borderColor: 'divider' },
                                    }}
                                >
                                    <TableCell>
                                        <Chip
                                            label={b.schema}
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontSize: '0.6875rem',
                                                fontWeight: 700,
                                                bgcolor: b.schema === currentBracket ? '#0284c7' : 'action.hover',
                                                color: b.schema === currentBracket ? '#fff' : 'text.primary',
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.75rem' }}>
                                        {b.upperLimit === Infinity
                                            ? `> ${fmt(b.lowerLimit - 0.01)}`
                                            : `${fmt(b.lowerLimit)} – ${fmt(b.upperLimit)}`}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                        {b.fixedSBU}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                        {fmt(b.fixedSBU * SBU_CURRENT)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                        {fmtPct(b.variableRate)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Collapse>
        </Box>
    );
};

// ═══════════════════════════════════════════════════
// ██  MAIN COMPONENT — ParticipacionEstado        ██
// ═══════════════════════════════════════════════════
const ParticipacionEstado = () => {
    // ── State ──
    const monthOptions = useMemo(() => createMonthOptions(), []);
    const [selectedMonthKey, setSelectedMonthKey] = useState(monthOptions[0]?.key || '');
    const [grossIncome, setGrossIncome] = useState('');
    const [monthSnapshots, setMonthSnapshots] = useState({});
    const [loadingSnapshots, setLoadingSnapshots] = useState(true);
    const [snapshotError, setSnapshotError] = useState('');

    const loadMonthSnapshots = useCallback(async () => {
        try {
            setLoadingSnapshots(true);
            setSnapshotError('');

            const results = await Promise.all(
                monthOptions.map(async (option) => {
                    const range = getMonthRange(option.date, { currentMonthUntilToday: true });
                    const summary = await billingService.getSummary({
                        dateFrom: range.fromISO,
                        dateTo: range.toISO,
                    });
                    const totalWithIVA = Number(summary?.totals?.invoiced || 0);
                    // Usar subtotal directo de la BD; fallback a estimación
                    const subtotalFromDB = Number(summary?.totals?.subtotalInvoiced || 0);
                    const subtotal = subtotalFromDB > 0 ? subtotalFromDB : Number(extractSubtotal(totalWithIVA));

                    const calc = calculateStateParticipation(subtotal);
                    const progress = calculateBracketProgress(subtotal, calc.bracketInfo);

                    return {
                        key: option.key,
                        monthLabel: option.label,
                        gross: subtotal,
                        totalWithIVA,
                        isCurrentMonth: range.isCurrentMonth,
                        paymentEstimate: Number(calc.totalToPay || 0),
                        bracketLevel: calc.bracketLevel,
                        bracketProgressPercent: progress.percent,
                        remainingToNextBracket: progress.remaining,
                    };
                })
            );

            const mapped = results.reduce((acc, item) => {
                acc[item.key] = item;
                return acc;
            }, {});

            setMonthSnapshots(mapped);
        } catch (error) {
            console.error('Error cargando progresion mensual de participacion:', error);
            setSnapshotError('No se pudo cargar la progresion historica de facturacion.');
        } finally {
            setLoadingSnapshots(false);
        }
    }, [monthOptions]);

    useEffect(() => {
        loadMonthSnapshots();
    }, [loadMonthSnapshots]);

    useEffect(() => {
        if (!selectedMonthKey) return;
        const selectedSnapshot = monthSnapshots[selectedMonthKey];
        if (!selectedSnapshot) return;
        setGrossIncome(selectedSnapshot.gross.toFixed(2));
    }, [selectedMonthKey, monthSnapshots]);

    // ── Derived state ──
    const calculation = useMemo(() => {
        const val = parseFloat(grossIncome) || 0;
        return calculateStateParticipation(val);
    }, [grossIncome]);

    const selectedSnapshot = monthSnapshots[selectedMonthKey];

    // ── Progress towards next bracket ──
    const bracketProgress = useMemo(() => {
        const income = parseFloat(grossIncome) || 0;
        const { bracketInfo } = calculation;
        if (!bracketInfo.nextBracketAt) return { value: 100, label: 'Tramo maximo', remaining: 0, isTopBracket: true };

        const rangeStart = bracketInfo.lowerLimit;
        const rangeEnd = bracketInfo.nextBracketAt;
        const progress = ((income - rangeStart) / (rangeEnd - rangeStart)) * 100;
        const clamped = Math.max(0, Math.min(progress, 100));
        const remaining = Math.max(0, rangeEnd - income);

        return { value: clamped, label: `${fmt(remaining)} hasta el siguiente tramo`, remaining, isTopBracket: false };
    }, [grossIncome, calculation]);

    // ── Semaphore ──
    const semaphore = useMemo(() => {
        return getSemaphoreState(bracketProgress.remaining, bracketProgress.isTopBracket);
    }, [bracketProgress]);

    // ── Handlers ──
    const handleIncomeChange = useCallback((e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        setGrossIncome(raw);
    }, []);

    // ── Bracket Progress Color ──
    const progressColor = semaphore.color;

    const historicalRows = useMemo(() => {
        return monthOptions
            .map((option) => {
                const snapshot = monthSnapshots[option.key];
                if (!snapshot) return null;

                return {
                    key: option.key,
                    month: option.label,
                    gross: snapshot.gross,
                    paymentEstimate: snapshot.paymentEstimate,
                    progress: snapshot.bracketProgressPercent,
                    remaining: snapshot.remainingToNextBracket,
                };
            })
            .filter(Boolean);
    }, [monthOptions, monthSnapshots]);

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {/* ── Header ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
                        display: 'flex',
                    }}
                >
                    <JudicaturaIcon sx={{ color: '#fff', fontSize: 28 }} />
                </Box>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
                        Participacion al Estado
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Consejo de la Judicatura · Resolucion 005-2023 · SBU {new Date().getFullYear()}: {fmt(SBU_CURRENT)}
                    </Typography>
                </Box>
            </Box>

            {/* ── Payment Info Banner ── */}
            <PaymentInfoBanner selectedMonthKey={selectedMonthKey} />

            <Card
                sx={{
                    mb: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <TimelineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.6875rem' }}>
                            CORTE DE FACTURACION
                        </Typography>
                    </Box>
                    <TextField
                        select
                        fullWidth
                        value={selectedMonthKey}
                        label="Mes de facturacion"
                        onChange={(e) => setSelectedMonthKey(e.target.value)}
                        helperText="Los valores corresponden a la Base Imponible (sin IVA) facturada al corte de cada mes."
                    >
                        {monthOptions.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    {snapshotError && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            {snapshotError}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                {/* Input Card */}
                <Card
                    sx={{
                        flex: 1,
                        minWidth: 280,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <MoneyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.6875rem' }}>
                                BASE IMPONIBLE MENSUAL (SIN IVA)
                            </Typography>
                            <Tooltip title={TOOLTIP_LEGAL} placement="top" arrow>
                                <InfoIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                            </Tooltip>
                        </Box>
                        <TextField
                            fullWidth
                            value={grossIncome}
                            onChange={handleIncomeChange}
                            placeholder="0.00"
                            variant="outlined"
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                sx: {
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    letterSpacing: '-0.01em',
                                    '& fieldset': { borderColor: 'divider', borderRadius: 2 },
                                    '&:hover fieldset': { borderColor: '#0284c7 !important' },
                                    '&.Mui-focused fieldset': { borderColor: '#0284c7 !important' },
                                },
                            }}
                            sx={{ mb: 2 }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                                label={`Esquema ${calculation.bracketLevel}`}
                                size="small"
                                sx={{
                                    fontWeight: 700,
                                    bgcolor: '#0284c7',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                }}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {calculation.bracketInfo.variableRate > 0
                                    ? `Base: ${calculation.bracketInfo.fixedSBU} SBU + ${fmtPct(calculation.bracketInfo.variableRate)} sobre excedente`
                                    : 'Sin participacion (tramo exento)'}
                            </Typography>
                        </Box>
                        {selectedSnapshot?.totalWithIVA > 0 && (
                            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1.5 }}>
                                Total facturado con IVA: {fmt(selectedSnapshot.totalWithIVA)} → Base Imponible: {fmt(grossIncome)}
                            </Typography>
                        )}
                    </CardContent>
                </Card>

                {/* Result Card — Deuda al corte de hoy */}
                <Card
                    sx={{
                        flex: 1,
                        minWidth: 280,
                        borderRadius: 3,
                        border: '2px solid',
                        borderColor: semaphore.color,
                    }}
                >
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.6875rem' }}>
                                    A PAGAR POR LO FACTURADO
                                </Typography>
                            </Box>
                            {/* Semaphore dot */}
                            <Tooltip title={semaphore.label}>
                                <Box sx={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    bgcolor: semaphore.color,
                                    boxShadow: `0 0 6px ${semaphore.color}60`,
                                    flexShrink: 0,
                                }} />
                            </Tooltip>
                        </Box>

                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                            Calculado sobre la Base Imponible al corte
                        </Typography>

                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                color: 'text.primary',
                                letterSpacing: '-0.03em',
                                fontSize: '2.5rem',
                                mb: 1.5,
                            }}
                        >
                            {fmt(calculation.totalToPay)}
                        </Typography>

                        {/* Breakdown */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block' }}>
                                    Base Fija
                                    <InfoTooltip text="Monto fijo establecido por ley segun el tramo en que se ubica. Se calcula como: SBU x cantidad de SBU del esquema." />
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {fmt(calculation.fixedBaseAmount)}
                                </Typography>
                            </Box>
                            <Typography variant="h6" sx={{ color: 'text.disabled', alignSelf: 'flex-end', pb: 0.25 }}>+</Typography>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block' }}>
                                    Excedente Variable
                                    <InfoTooltip text="Porcentaje aplicado sobre el monto que excede el limite inferior del tramo actual." />
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {fmt(calculation.variableBaseAmount)}
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* ── Bracket Progress Bar + Semaphore ── */}
            <Card
                sx={{
                    mb: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.6875rem' }}>
                            PROXIMIDAD AL SIGUIENTE TRAMO
                            <InfoTooltip text={'Verde: margen amplio, no requiere accion.\nAmarillo: cercano al siguiente tramo, monitoree la facturacion.\nRojo: muy cerca o supero el tramo, el porcentaje de participacion aumentara.'} />
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                                size="small"
                                label={semaphore.label}
                                sx={{
                                    height: 22,
                                    fontSize: '0.65rem',
                                    bgcolor: `${semaphore.color}18`,
                                    color: semaphore.color,
                                    fontWeight: 700,
                                }}
                            />
                            <Typography variant="caption" sx={{ color: progressColor, fontWeight: 700, fontSize: '0.8125rem' }}>
                                {bracketProgress.value.toFixed(0)}%
                            </Typography>
                        </Box>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={bracketProgress.value}
                        sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 5,
                                bgcolor: progressColor,
                                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                            },
                        }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Tramo actual: Esquema {calculation.bracketLevel}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {bracketProgress.label}
                        </Typography>
                    </Box>

                    {/* Reference Table */}
                    <BracketReferenceTable currentBracket={calculation.bracketLevel} />
                </CardContent>
            </Card>

            {/* ── Monthly History ── */}
            <Card
                sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.6875rem', display: 'block', mb: 1.5 }}>
                        PROGRESION HISTORICA (BASE IMPONIBLE)
                    </Typography>
                    {loadingSnapshots ? (
                        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Mes</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Base Imponible</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Pago Estado</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Progreso Tramo</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Margen Tramo</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {historicalRows.map((row) => (
                                        <TableRow
                                            key={row.key}
                                            hover
                                            selected={row.key === selectedMonthKey}
                                            onClick={() => setSelectedMonthKey(row.key)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell sx={{ fontSize: '0.8125rem', textTransform: 'capitalize' }}>{row.month}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{fmt(row.gross)}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.8125rem' }}>{fmt(row.paymentEstimate)}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.8125rem' }}>{row.progress.toFixed(0)}%</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.8125rem' }}>
                                                {row.remaining > 0 ? fmt(row.remaining) : 'Tramo maximo'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default ParticipacionEstado;
