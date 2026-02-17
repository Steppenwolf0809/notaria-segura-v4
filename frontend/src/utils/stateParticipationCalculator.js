import Decimal from 'decimal.js';
import {
    SBU_CURRENT,
    TAX_BRACKETS,
    ALERT_STATES,
    PENALTY_RATE,
    IVA_RATE,
    BRACKET_PROXIMITY_THRESHOLD,
} from '../config/state_participation_config';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Extrae la Base Imponible (subtotal sin IVA) de un monto total facturado.
 * La BD almacena totalAmount (valcob del XML Koinor) que INCLUYE IVA.
 * Redondeo a 2 decimales solo al final (Decimal.js).
 */
export function extractSubtotal(totalWithIVA) {
    const total = new Decimal(totalWithIVA || 0);
    const divisor = new Decimal(1).plus(new Decimal(IVA_RATE));
    return total.div(divisor).toFixed(2);
}

/**
 * Calcula la participacion al Estado para un ingreso bruto mensual (Base Imponible, sin IVA).
 */
export function calculateStateParticipation(monthlyGrossIncome) {
    const income = new Decimal(monthlyGrossIncome || 0);

    let matchedBracket = TAX_BRACKETS[0];
    for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
        if (income.gte(TAX_BRACKETS[i].lowerLimit)) {
            matchedBracket = TAX_BRACKETS[i];
            break;
        }
    }

    const { schema, lowerLimit, upperLimit, fixedSBU, variableRate } = matchedBracket;

    const fixedBaseAmount = new Decimal(fixedSBU).times(SBU_CURRENT);

    let variableBaseAmount = new Decimal(0);
    if (schema > 0) {
        const excess = income.minus(new Decimal(lowerLimit));
        variableBaseAmount = excess.times(new Decimal(variableRate));
    }

    const totalToPay = fixedBaseAmount.plus(variableBaseAmount);

    const nextBracketIndex = TAX_BRACKETS.findIndex((b) => b.schema === schema + 1);
    const nextBracketAt = nextBracketIndex >= 0 ? TAX_BRACKETS[nextBracketIndex].lowerLimit : null;

    return {
        bracketLevel: schema,
        fixedBaseAmount: fixedBaseAmount.toFixed(2),
        variableBaseAmount: variableBaseAmount.toFixed(2),
        totalToPay: totalToPay.toFixed(2),
        bracketInfo: {
            lowerLimit,
            upperLimit: upperLimit === Infinity ? null : upperLimit,
            nextBracketAt,
            variableRate,
            fixedSBU,
        },
    };
}

/**
 * Estado de alerta por dia del mes actual (1-31).
 */
export function getAlertState(dayOfMonth) {
    const day = dayOfMonth ?? new Date().getDate();

    if (day >= ALERT_STATES.OVERDUE.minDay) {
        return {
            status: 'overdue',
            message: 'EN MORA - Se aplica recargo del 3%. Interes acumulado en curso.',
            color: ALERT_STATES.OVERDUE.color,
            bgColor: 'rgba(153, 27, 27, 0.08)',
            isOverdue: true,
            isFlashing: false,
        };
    }

    if (day >= ALERT_STATES.DEADLINE.minDay && day <= ALERT_STATES.DEADLINE.maxDay) {
        return {
            status: 'deadline',
            message: 'ULTIMO DIA: Cierre obligatorio en Sistema Notarial.',
            color: ALERT_STATES.DEADLINE.color,
            bgColor: 'rgba(220, 38, 38, 0.08)',
            isOverdue: false,
            isFlashing: true,
        };
    }

    if (day >= ALERT_STATES.CRITICAL.minDay && day <= ALERT_STATES.CRITICAL.maxDay) {
        return {
            status: 'critical',
            message: 'URGENTE: 48h para depositar y cerrar formulario.',
            color: ALERT_STATES.CRITICAL.color,
            bgColor: 'rgba(234, 88, 12, 0.08)',
            isOverdue: false,
            isFlashing: true,
        };
    }

    return {
        status: 'normal',
        message: 'Calculo en proceso. Prepare cierre.',
        color: ALERT_STATES.NORMAL.color,
        bgColor: 'rgba(2, 132, 199, 0.06)',
        isOverdue: false,
        isFlashing: false,
    };
}

/**
 * Aplica multa del 3% por mora.
 */
export function applyPenalty(totalToPay) {
    const original = new Decimal(totalToPay || 0);
    const penalty = original.times(new Decimal(PENALTY_RATE));
    const total = original.plus(penalty);

    return {
        originalAmount: original.toFixed(2),
        penaltyAmount: penalty.toFixed(2),
        totalWithPenalty: total.toFixed(2),
    };
}

/**
 * Progreso hacia el siguiente tramo, dado un ingreso bruto mensual.
 */
export function calculateBracketProgress(monthlyGrossIncome, bracketInfo) {
    const income = Number(monthlyGrossIncome) || 0;

    if (!bracketInfo?.nextBracketAt) {
        return {
            percent: 100,
            remaining: 0,
            isTopBracket: true,
        };
    }

    const rangeStart = Number(bracketInfo.lowerLimit) || 0;
    const rangeEnd = Number(bracketInfo.nextBracketAt);

    const rawProgress = ((income - rangeStart) / (rangeEnd - rangeStart)) * 100;
    const percent = Math.max(0, Math.min(rawProgress, 100));
    const remaining = Math.max(0, rangeEnd - income);

    return {
        percent,
        remaining,
        isTopBracket: false,
    };
}

/**
 * Semaforo de proximidad al siguiente tramo.
 * Verde: lejos del techo del rango actual.
 * Rojo: falta menos de $BRACKET_PROXIMITY_THRESHOLD para saltar de tramo.
 */
export function getSemaphoreState(remaining, isTopBracket) {
    if (isTopBracket) {
        return { color: '#64748b', label: 'Tramo maximo', level: 'top' };
    }
    if (remaining < BRACKET_PROXIMITY_THRESHOLD) {
        return { color: '#dc2626', label: 'Proximo a cambiar de tramo', level: 'danger' };
    }
    return { color: '#047857', label: 'Margen saludable', level: 'safe' };
}

function formatMonthLabel(date) {
    return date.toLocaleDateString('es-EC', {
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Construye el resumen de participacion para un mes.
 * NO proyecta a futuro: calcula estrictamente sobre lo facturado al corte.
 * La entrada monthlySubtotal debe ser la Base Imponible (sin IVA).
 */
export function buildParticipationSummary(monthlySubtotal, referenceDate = new Date()) {
    const currentDate = new Date(referenceDate);

    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();
    const daysElapsed = Math.max(1, Math.min(currentDate.getDate(), daysInMonth));

    const grossToDate = new Decimal(monthlySubtotal || 0);

    const calculation = calculateStateParticipation(grossToDate.toNumber());
    const bracketProgress = calculateBracketProgress(
        grossToDate.toNumber(),
        calculation.bracketInfo
    );
    const semaphore = getSemaphoreState(bracketProgress.remaining, bracketProgress.isTopBracket);

    const nextPaymentMonthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
    );

    return {
        billingMonthLabel: formatMonthLabel(currentDate),
        paymentMonthLabel: formatMonthLabel(nextPaymentMonthDate),
        grossToDate: grossToDate.toFixed(2),
        daysElapsed,
        daysInMonth,
        estimatedPayment: calculation.totalToPay,
        bracketLevel: calculation.bracketLevel,
        bracketInfo: calculation.bracketInfo,
        bracketProgress,
        semaphore,
    };
}

export function toLocalISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getMonthRange(targetDate = new Date(), options = {}) {
    const { currentMonthUntilToday = false } = options;
    const baseDate = new Date(targetDate);

    const from = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

    const today = new Date();
    const isCurrentMonth =
        baseDate.getFullYear() === today.getFullYear() &&
        baseDate.getMonth() === today.getMonth();

    const to =
        currentMonthUntilToday && isCurrentMonth
            ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
            : monthEnd;

    return {
        from,
        to,
        fromISO: toLocalISODate(from),
        toISO: toLocalISODate(to),
        isCurrentMonth,
    };
}
