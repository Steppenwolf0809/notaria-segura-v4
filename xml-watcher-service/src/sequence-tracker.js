import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';

/**
 * SequenceTracker - Detecta saltos en la numeración secuencial de facturas
 * Ejemplo: p00098 → p00100 falta p00099
 */
export class SequenceTracker {
    constructor({ config, logger, watchDir }) {
        this.config = config.sequenceTracking || {};
        this.logger = logger;
        this.watchDir = watchDir;
        this.prefixPattern = new RegExp(this.config.prefixPattern || '^([a-zA-Z]+)(\\d+)');
        this.stateFile = path.join(watchDir, this.config.stateFile || 'sequence-state.json');
        this.gapLogFile = path.join(watchDir, this.config.gapLogFile || 'sequence-gaps.log');
        this.alertPopup = this.config.alertPopup !== false;

        // Estado: { "p": 98, "f": 23 } - último número visto por prefijo
        this.state = {};
        this.loadState();
    }

    loadState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                this.state = fs.readJsonSync(this.stateFile);
                this.logger.info(`[SequenceTracker] Estado cargado: ${JSON.stringify(this.state)}`);
            }
        } catch (err) {
            this.logger.warn(`[SequenceTracker] No se pudo cargar estado: ${err.message}`);
            this.state = {};
        }
    }

    saveState() {
        try {
            fs.writeJsonSync(this.stateFile, this.state, { spaces: 2 });
        } catch (err) {
            this.logger.error(`[SequenceTracker] Error guardando estado: ${err.message}`);
        }
    }

    /**
     * Procesa un nombre de archivo y detecta si hay salto en la secuencia
     * @param {string} filename - Nombre del archivo (ej: "p00098.xml")
     * @returns {object|null} - Info del gap si se detectó, null si no
     */
    track(filename) {
        if (!this.config.enabled) return null;

        // Quitar extensión y parsear
        const baseName = path.basename(filename, path.extname(filename));
        const match = baseName.match(this.prefixPattern);

        if (!match) {
            this.logger.debug(`[SequenceTracker] Nombre no coincide con patrón: ${filename}`);
            return null;
        }

        const prefix = match[1].toLowerCase();
        const number = parseInt(match[2], 10);

        if (isNaN(number)) {
            this.logger.warn(`[SequenceTracker] Número inválido en: ${filename}`);
            return null;
        }

        const lastNumber = this.state[prefix];

        // Primera vez que vemos este prefijo
        if (lastNumber === undefined) {
            this.state[prefix] = number;
            this.saveState();
            this.logger.info(`[SequenceTracker] Primer número para prefijo '${prefix}': ${number}`);
            return null;
        }

        // Verificar si hay salto
        const expectedNext = lastNumber + 1;

        if (number > expectedNext) {
            // ¡HAY SALTO!
            const missingNumbers = [];
            for (let i = expectedNext; i < number; i++) {
                missingNumbers.push(i);
            }

            const gapInfo = {
                prefix,
                lastSeen: lastNumber,
                current: number,
                missing: missingNumbers,
                timestamp: new Date().toISOString()
            };

            this.handleGap(gapInfo);

            // Actualizar estado al número actual
            this.state[prefix] = number;
            this.saveState();

            return gapInfo;
        }

        // Número esperado o menor (posible re-procesamiento)
        if (number >= this.state[prefix]) {
            this.state[prefix] = number;
            this.saveState();
        }

        return null;
    }

    /**
     * Maneja un gap detectado: log + popup
     */
    handleGap(gapInfo) {
        const { prefix, lastSeen, current, missing, timestamp } = gapInfo;
        const missingStr = missing.map(n => `${prefix}${String(n).padStart(5, '0')}`).join(', ');

        const message = `⚠️ FACTURA(S) FALTANTE(S): ${missingStr}\n` +
            `Último visto: ${prefix}${String(lastSeen).padStart(5, '0')}\n` +
            `Actual: ${prefix}${String(current).padStart(5, '0')}\n` +
            `Fecha: ${new Date(timestamp).toLocaleString('es-EC')}`;

        // Log al archivo
        this.logGap(message, gapInfo);

        // Log a consola
        this.logger.warn(`[SequenceTracker] ${message.replace(/\n/g, ' | ')}`);

        // Popup de Windows
        if (this.alertPopup) {
            this.showPopup(missingStr);
        }
    }

    logGap(message, gapInfo) {
        try {
            const logEntry = `\n${'='.repeat(60)}\n${message}\n${'='.repeat(60)}\n`;
            fs.appendFileSync(this.gapLogFile, logEntry);
        } catch (err) {
            this.logger.error(`[SequenceTracker] Error escribiendo log: ${err.message}`);
        }
    }

    /**
     * Muestra un popup de Windows con la alerta
     */
    showPopup(missingNumbers) {
        const title = 'ALERTA: Factura(s) Faltante(s)';
        const body = `Se detectó un salto en la secuencia.\n\nNúmeros faltantes:\n${missingNumbers}\n\nPor favor, verifique y suba manualmente.`;

        // Usar PowerShell para mostrar MessageBox
        const psCommand = `
      Add-Type -AssemblyName PresentationFramework
      [System.Windows.MessageBox]::Show('${body.replace(/'/g, "''")}', '${title}', 'OK', 'Warning')
    `.replace(/\n/g, ' ');

        const command = `powershell -Command "${psCommand}"`;

        exec(command, (error) => {
            if (error) {
                this.logger.error(`[SequenceTracker] Error mostrando popup: ${error.message}`);
            }
        });
    }

    /**
     * Obtiene el resumen de gaps detectados
     */
    getGapsSummary() {
        try {
            if (fs.existsSync(this.gapLogFile)) {
                return fs.readFileSync(this.gapLogFile, 'utf8');
            }
            return 'No hay gaps registrados.';
        } catch (err) {
            return `Error leyendo log: ${err.message}`;
        }
    }
}
