import React, { useState, useMemo, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    LinearProgress,
    Checkbox,
    FormControlLabel,
    Button,
    Chip,
    Divider,
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
} from '@mui/material';
import {
    Warning as WarningIcon,
    CheckCircle as CheckIcon,
    ErrorOutline as ErrorIcon,
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    Info as InfoIcon,
    AttachMoney as MoneyIcon,
    TrendingUp as TrendingIcon,
    Schedule as ClockIcon,
    Gavel as JudicaturaIcon,
} from '@mui/icons-material';
import {
    calculateStateParticipation,
    getAlertState,
    applyPenalty,
} from '../../utils/stateParticipationCalculator';
import {
    TAX_BRACKETS,
    SBU_CURRENT,
} from '../../config/state_participation_config';

// ── Helpers ──
const fmt = (val) =>
    '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (val) => `${(val * 100).toFixed(0)}%`;

// ── Alert Banner ──
const AlertBanner = ({ alertState }) => {
    const { status, message, color, bgColor, isFlashing } = alertState;

    const iconMap = {
        normal: <ClockIcon sx={{ color }} />,
        critical: <WarningIcon sx={{ color }} />,
        deadline: <ErrorIcon sx={{ color }} />,
        overdue: <ErrorIcon sx={{ color }} />,
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                mb: 3,
                borderRadius: 3,
                border: `1.5px solid ${color}30`,
                bgcolor: bgColor,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                animation: isFlashing ? 'pulse-alert 2s ease-in-out infinite' : 'none',
                '@keyframes pulse-alert': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                },
            }}
        >
            {iconMap[status]}
            <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ color, fontWeight: 700, fontSize: '0.8125rem' }}>
                    {status === 'normal' && 'Estado: Normal'}
                    {status === 'critical' && '⚠️ Estado: CRÍTICO'}
                    {status === 'deadline' && '🔴 Estado: ÚLTIMO DÍA'}
                    {status === 'overdue' && '🚨 Estado: EN MORA'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                    {message}
                </Typography>
            </Box>
            <Chip
                label={`Día ${new Date().getDate()} del mes`}
                size="small"
                sx={{
                    bgcolor: `${color}18`,
                    color,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                }}
            />
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
                    Tabla de Referencia — Resolución 005-2023
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
    const [grossIncome, setGrossIncome] = useState('');
    // Simple checklist state
    const [checklist, setChecklist] = useState({
        formularioCerrado: false,
        pagado: false,
        comprobanteRegistrado: false,
    });
    const [completedMonths, setCompletedMonths] = useState([]);

    // ── Derived state ──
    const alertState = useMemo(() => getAlertState(), []);

    const calculation = useMemo(() => {
        const val = parseFloat(grossIncome) || 0;
        return calculateStateParticipation(val);
    }, [grossIncome]);

    const penaltyInfo = useMemo(() => {
        if (alertState.isOverdue) {
            return applyPenalty(calculation.totalToPay);
        }
        return null;
    }, [alertState.isOverdue, calculation.totalToPay]);

    // ── Progress towards next bracket ──
    const bracketProgress = useMemo(() => {
        const income = parseFloat(grossIncome) || 0;
        const { bracketInfo } = calculation;
        if (!bracketInfo.nextBracketAt) return { value: 100, label: 'Tramo máximo', remaining: 0 };

        const rangeStart = bracketInfo.lowerLimit;
        const rangeEnd = bracketInfo.nextBracketAt;
        const progress = ((income - rangeStart) / (rangeEnd - rangeStart)) * 100;
        const clamped = Math.max(0, Math.min(progress, 100));
        const remaining = Math.max(0, rangeEnd - income);

        return { value: clamped, label: `${fmt(remaining)} hasta el siguiente tramo`, remaining };
    }, [grossIncome, calculation]);

    // ── Handlers ──
    const handleIncomeChange = useCallback((e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        setGrossIncome(raw);
    }, []);

    const handleChecklistChange = useCallback((key) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const handleMarkComplete = useCallback(() => {
        const month = new Date().toLocaleString('es-EC', { month: 'long', year: 'numeric' });
        setCompletedMonths((prev) => [
            { month, amount: penaltyInfo ? penaltyInfo.totalWithPenalty : calculation.totalToPay, date: new Date().toLocaleDateString('es-EC') },
            ...prev,
        ]);
        // Reset for next period
        setGrossIncome('');
        setChecklist({ formularioCerrado: false, pagado: false, comprobanteRegistrado: false });
    }, [calculation, penaltyInfo]);

    const allChecked = checklist.formularioCerrado && checklist.pagado && checklist.comprobanteRegistrado;
    const canComplete = allChecked && parseFloat(grossIncome) > 0;

    const finalAmount = penaltyInfo ? penaltyInfo.totalWithPenalty : calculation.totalToPay;

    // ── Bracket Progress Color ──
    const progressColor = bracketProgress.value > 85 ? '#dc2626' : bracketProgress.value > 60 ? '#d97706' : '#0284c7';

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
                        Participación al Estado
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Consejo de la Judicatura · Resolución 005-2023 · SBU {new Date().getFullYear()}: {fmt(SBU_CURRENT)}
                    </Typography>
                </Box>
            </Box>

            {/* ── Alert Banner ── */}
            <AlertBanner alertState={alertState} />

            {/* ── Revenue Input + Calculation Result ── */}
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
                                INGRESO BRUTO MENSUAL (SIN IVA)
                            </Typography>
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
                                    : 'Sin participación (tramo exento)'}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* Result Card */}
                <Card
                    sx={{
                        flex: 1,
                        minWidth: 280,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: alertState.isOverdue ? 'error.main' : 'divider',
                    }}
                >
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <TrendingIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.6875rem' }}>
                                {alertState.isOverdue ? 'TOTAL CON RECARGO (3%)' : 'TOTAL A PAGAR'}
                            </Typography>
                        </Box>

                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                color: alertState.isOverdue ? 'error.main' : 'text.primary',
                                letterSpacing: '-0.03em',
                                fontSize: '2.25rem',
                                mb: 1.5,
                            }}
                        >
                            {fmt(finalAmount)}
                        </Typography>

                        {/* Breakdown */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block' }}>
                                    Base Fija
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {fmt(calculation.fixedBaseAmount)}
                                </Typography>
                            </Box>
                            <Typography variant="h6" sx={{ color: 'text.disabled', alignSelf: 'flex-end', pb: 0.25 }}>+</Typography>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block' }}>
                                    Excedente Variable
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {fmt(calculation.variableBaseAmount)}
                                </Typography>
                            </Box>
                            {penaltyInfo && (
                                <>
                                    <Typography variant="h6" sx={{ color: 'error.main', alignSelf: 'flex-end', pb: 0.25 }}>+</Typography>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, display: 'block' }}>
                                            Multa 3%
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                                            {fmt(penaltyInfo.penaltyAmount)}
                                        </Typography>
                                    </Box>
                                </>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* ── Bracket Progress Bar ── */}
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
                        </Typography>
                        <Typography variant="caption" sx={{ color: progressColor, fontWeight: 700, fontSize: '0.8125rem' }}>
                            {bracketProgress.value.toFixed(0)}%
                        </Typography>
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

            {/* ── Simple Checklist ── */}
            <Card
                sx={{
                    mb: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.6875rem', display: 'block', mb: 2 }}>
                        CIERRE MENSUAL — CHECKLIST
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checklist.formularioCerrado}
                                    onChange={() => handleChecklistChange('formularioCerrado')}
                                    sx={{
                                        color: 'text.disabled',
                                        '&.Mui-checked': { color: '#047857' },
                                    }}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ fontWeight: 500, color: checklist.formularioCerrado ? 'success.main' : 'text.primary' }}>
                                    Formulario cerrado en el sistema del Consejo de la Judicatura
                                </Typography>
                            }
                            sx={{ mx: 0 }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checklist.pagado}
                                    onChange={() => handleChecklistChange('pagado')}
                                    sx={{
                                        color: 'text.disabled',
                                        '&.Mui-checked': { color: '#047857' },
                                    }}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ fontWeight: 500, color: checklist.pagado ? 'success.main' : 'text.primary' }}>
                                    Pago realizado
                                </Typography>
                            }
                            sx={{ mx: 0 }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={checklist.comprobanteRegistrado}
                                    onChange={() => handleChecklistChange('comprobanteRegistrado')}
                                    sx={{
                                        color: 'text.disabled',
                                        '&.Mui-checked': { color: '#047857' },
                                    }}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ fontWeight: 500, color: checklist.comprobanteRegistrado ? 'success.main' : 'text.primary' }}>
                                    Comprobante de transferencia registrado
                                </Typography>
                            }
                            sx={{ mx: 0 }}
                        />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Status indicators */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Chip
                            icon={allChecked ? <CheckIcon /> : <ErrorIcon />}
                            label={allChecked ? 'Todos los pasos completados' : `${Object.values(checklist).filter(Boolean).length} de 3 completados`}
                            size="small"
                            sx={{
                                fontSize: '0.75rem',
                                bgcolor: allChecked ? 'rgba(4, 120, 87, 0.08)' : 'rgba(190, 18, 60, 0.08)',
                                color: allChecked ? '#047857' : '#be123c',
                                '& .MuiChip-icon': {
                                    color: allChecked ? '#047857' : '#be123c',
                                    fontSize: 16,
                                },
                            }}
                        />
                    </Box>

                    {/* Complete Button */}
                    <Tooltip
                        title={!canComplete ? 'Complete todos los pasos del checklist e ingrese un monto' : ''}
                    >
                        <span>
                            <Button
                                variant="contained"
                                disabled={!canComplete}
                                onClick={handleMarkComplete}
                                startIcon={<CheckIcon />}
                                fullWidth
                                sx={{
                                    py: 1.5,
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    bgcolor: '#047857',
                                    '&:hover': { bgcolor: '#065f46' },
                                    '&.Mui-disabled': {
                                        bgcolor: 'action.disabledBackground',
                                        color: 'text.disabled',
                                    },
                                }}
                            >
                                Cerrar Mes — Registrar Pago de {fmt(finalAmount)}
                            </Button>
                        </span>
                    </Tooltip>
                </CardContent>
            </Card>

            {/* ── Monthly History ── */}
            {completedMonths.length > 0 && (
                <Card
                    sx={{
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.6875rem', display: 'block', mb: 1.5 }}>
                            HISTORIAL DE CIERRES
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Mes</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Monto Pagado</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Fecha Cierre</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {completedMonths.map((m, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell sx={{ fontSize: '0.8125rem', textTransform: 'capitalize' }}>{m.month}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{fmt(m.amount)}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{m.date}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default ParticipacionEstado;
