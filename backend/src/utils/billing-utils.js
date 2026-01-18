/**
 * Billing Utilities
 * Utility functions for Koinor data normalization and transformation
 */

/**
 * Normalize invoice number from Koinor format to system format
 * @param {string} raw - Raw invoice number from Koinor (e.g., "001002-00123341")
 * @returns {string} - Normalized invoice number (e.g., "001-002-000123341")
 */
function normalizeInvoiceNumber(raw) {
    if (!raw || typeof raw !== 'string') {
        return null;
    }

    // Clean whitespace
    const cleaned = raw.trim();

    // Pattern: 001002-00123341 (6 digits + dash + 8 digits)
    const koinorPattern = /^(\d{3})(\d{3})-(\d{8})$/;
    const match = cleaned.match(koinorPattern);

    if (match) {
        // Convert to: 001-002-000123341
        const establecimiento = match[1]; // 001
        const puntoEmision = match[2];    // 002
        const secuencial = '0' + match[3]; // Add leading zero: 00123341 -> 000123341
        return `${establecimiento}-${puntoEmision}-${secuencial}`;
    }

    // If already in normalized format, return as-is
    const normalizedPattern = /^\d{3}-\d{3}-\d{9}$/;
    if (normalizedPattern.test(cleaned)) {
        return cleaned;
    }

    // Return original if no match (for error handling)
    console.warn(`[billing-utils] Could not normalize invoice number: ${raw}`);
    return cleaned;
}

/**
 * Convert invoice number from system format back to Koinor format
 * @param {string} normalized - Normalized invoice number (e.g., "001-002-000123341")
 * @returns {string} - Koinor format (e.g., "001002-00123341")
 */
function denormalizeInvoiceNumber(normalized) {
    if (!normalized || typeof normalized !== 'string') {
        return null;
    }

    const cleaned = normalized.trim();
    const pattern = /^(\d{3})-(\d{3})-0(\d{8})$/;
    const match = cleaned.match(pattern);

    if (match) {
        // Convert: 001-002-000123341 -> 001002-00123341
        return `${match[1]}${match[2]}-${match[3]}`;
    }

    return cleaned;
}

/**
 * Parse Excel serial date to JavaScript Date
 * Excel uses 1900-01-01 as day 1 (with a leap year bug for 1900)
 * @param {number} serial - Excel serial date number
 * @returns {Date|null} - JavaScript Date object or null if invalid
 */
function parseExcelDate(serial) {
    if (serial === null || serial === undefined || isNaN(serial)) {
        return null;
    }

    // If it's already a Date object
    if (serial instanceof Date) {
        return serial;
    }

    // If it's a string that looks like a date, try to parse it
    if (typeof serial === 'string') {
        const parsed = new Date(serial);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
        return null;
    }

    // Excel serial number conversion
    // Excel incorrectly treats 1900 as a leap year, so we need to adjust
    // Days since 1899-12-30 (Excel epoch)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + serial * millisecondsPerDay);

    // Adjust for Excel's leap year bug (Feb 29, 1900 doesn't exist)
    if (serial >= 60) {
        date.setDate(date.getDate() - 1);
    }

    return date;
}

/**
 * Parse money amount from string or number
 * @param {string|number} value - Amount value (e.g., "$1,234.56" or 1234.56)
 * @returns {number} - Parsed decimal number
 */
function parseMoneyAmount(value) {
    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        // Remove currency symbols, commas, and whitespace
        const cleaned = value.replace(/[$,\s]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
}

/**
 * Detect file type from filename
 * @param {string} filename - File name
 * @returns {'POR_COBRAR'|'CXC'|'UNKNOWN'} - File type
 */
function detectFileType(filename) {
    if (!filename || typeof filename !== 'string') {
        return 'UNKNOWN';
    }

    const upper = filename.toUpperCase();

    if (upper.includes('POR_COBRAR') || upper.includes('POR COBRAR')) {
        return 'POR_COBRAR';
    }

    if (upper.includes('CXC')) {
        return 'CXC';
    }

    return 'UNKNOWN';
}

/**
 * Validate and clean client tax ID (cédula/RUC)
 * @param {string|number} taxId - Client tax ID
 * @returns {string} - Cleaned tax ID
 */
function cleanTaxId(taxId) {
    if (!taxId) {
        return '';
    }

    // Convert to string and remove non-numeric characters
    return String(taxId).replace(/\D/g, '').trim();
}

/**
 * Calculate invoice status based on payments
 * @param {number} totalAmount - Total invoice amount
 * @param {number} totalPaid - Total amount paid
 * @param {Date|null} dueDate - Invoice due date
 * @returns {'PENDING'|'PARTIAL'|'PAID'|'OVERDUE'} - Invoice status
 */
function calculateInvoiceStatus(totalAmount, totalPaid, dueDate = null) {
    const balance = totalAmount - totalPaid;

    if (balance <= 0) {
        return 'PAID';
    }

    if (totalPaid > 0) {
        return 'PARTIAL';
    }

    if (dueDate && new Date() > new Date(dueDate)) {
        return 'OVERDUE';
    }

    return 'PENDING';
}

/**
 * Format date for display
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string (DD/MM/YYYY)
 */
function formatDateDisplay(date) {
    if (!date || !(date instanceof Date)) {
        return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Format money for display
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted amount (e.g., "$1,234.56")
 */
function formatMoneyDisplay(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

export {
    normalizeInvoiceNumber,
    denormalizeInvoiceNumber,
    parseExcelDate,
    parseMoneyAmount,
    detectFileType,
    cleanTaxId,
    calculateInvoiceStatus,
    formatDateDisplay,
    formatMoneyDisplay,
};
