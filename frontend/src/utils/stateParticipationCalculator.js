/**
 * Motor de Cálculo — Participación al Estado
 * Resolución 005-2023 del Consejo de la Judicatura
 *
 * Usa Decimal.js para precisión financiera (evita errores de punto flotante).
 * NUNCA usar aritmética nativa de JS para montos legales.
 */
import Decimal from 'decimal.js';
import {
    SBU_CURRENT,
    TAX_BRACKETS,
    ALERT_STATES,
    PENALTY_RATE,
} from '../config/state_participation_config';

// Configurar Decimal.js para máxima precisión financiera
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calcula la participación al Estado para un ingreso bruto mensual.
 *
 * @param {number|string} monthlyGrossIncome — Ingreso Bruto sin IVA del mes
 * @returns {{
 *   bracketLevel: number,
 *   fixedBaseAmount: string,
 *   variableBaseAmount: string,
 *   totalToPay: string,
 *   bracketInfo: { lowerLimit: number, upperLimit: number, nextBracketAt: number|null, variableRate: number }
 * }}
 */
export function calculateStateParticipation(monthlyGrossIncome) {
    const income = new Decimal(monthlyGrossIncome || 0);

    // Determinar el tramo que aplica
    let matchedBracket = TAX_BRACKETS[0]; // default: schema 0
    for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
        if (income.gte(TAX_BRACKETS[i].lowerLimit)) {
            matchedBracket = TAX_BRACKETS[i];
            break;
        }
    }

    const { schema, lowerLimit, upperLimit, fixedSBU, variableRate } = matchedBracket;

    // Base Fija = fixedSBU × SBU_CURRENT
    const fixedBaseAmount = new Decimal(fixedSBU).times(SBU_CURRENT);

    // Excedente Variable = (income - lowerLimit) × variableRate
    // Para schema 0 el variableRate es 0%, así que excedente = 0
    let variableBaseAmount = new Decimal(0);
    if (schema > 0) {
        const excess = income.minus(new Decimal(lowerLimit));
        variableBaseAmount = excess.times(new Decimal(variableRate));
    }

    // Total a Pagar
    const totalToPay = fixedBaseAmount.plus(variableBaseAmount);

    // Info del siguiente tramo para la barra de progreso
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
 * Determina el estado de alerta según el día del mes actual.
 *
 * @param {number} [dayOfMonth] — Día del mes (1-31). Si no se pasa, usa Date actual.
 * @returns {{ status: string, message: string, color: string, bgColor: string, isOverdue: boolean, isFlashing: boolean }}
 */
export function getAlertState(dayOfMonth) {
    const day = dayOfMonth ?? new Date().getDate();

    if (day >= ALERT_STATES.OVERDUE.minDay) {
        return {
            status: 'overdue',
            message: 'EN MORA — Se aplica recargo del 3%. Interés acumulado en curso.',
            color: ALERT_STATES.OVERDUE.color,
            bgColor: 'rgba(153, 27, 27, 0.08)',
            isOverdue: true,
            isFlashing: false,
        };
    }

    if (day >= ALERT_STATES.DEADLINE.minDay && day <= ALERT_STATES.DEADLINE.maxDay) {
        return {
            status: 'deadline',
            message: 'ÚLTIMO DÍA: Cierre obligatorio en Sistema Notarial.',
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

    // Normal (Day 1-7)
    return {
        status: 'normal',
        message: 'Cálculo en proceso. Prepare cierre.',
        color: ALERT_STATES.NORMAL.color,
        bgColor: 'rgba(2, 132, 199, 0.06)',
        isOverdue: false,
        isFlashing: false,
    };
}

/**
 * Aplica la multa del 3% por mora.
 *
 * @param {number|string} totalToPay — Monto original a pagar
 * @returns {{ originalAmount: string, penaltyAmount: string, totalWithPenalty: string }}
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
