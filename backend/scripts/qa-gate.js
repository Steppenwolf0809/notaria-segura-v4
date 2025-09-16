#!/usr/bin/env node

/**
 * QA Gate Script - Control de calidad para despliegue de concuerdos
 *
 * Verifica que los tests de QA cumplan con umbrales mínimos de calidad
 * antes de permitir el despliegue a producción.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const THRESHOLDS = {
  minSuccessRate: 0.85, // 85% de casos deben pasar
  minConcordanciaAccuracy: 0.90, // 90% de concordancias correctas
  maxAvgGenerationTime: 5000, // Máximo 5 segundos promedio
  minStructureDistribution: 0.60, // Al menos 60% de estructuras válidas
  maxErrors: 3 // Máximo 3 errores permitidos
};

class QAGate {
  constructor() {
    this.results = {
      success: false,
      score: 0,
      violations: [],
      recommendations: [],
      timestamp: new Date().toISOString()
    };
  }

  log(message, level = 'info') {
    const prefix = {
      info: 'ℹ️ ',
      warn: '⚠️ ',
      error: '❌ ',
      success: '✅ '
    }[level] || '📝 ';

    console.log(`${prefix}${message}`);
  }

  async run() {
    this.log('🚀 Iniciando QA Gate para sistema de concuerdos', 'info');

    try {
      // 1. Ejecutar tests de QA
      await this.runQATests();

      // 2. Verificar métricas de rendimiento
      await this.checkPerformanceMetrics();

      // 3. Validar configuración de producción
      await this.validateProductionConfig();

      // 4. Calcular score final
      this.calculateScore();

      // 5. Generar reporte
      this.generateReport();

      return this.results;

    } catch (error) {
      this.log(`Error en QA Gate: ${error.message}`, 'error');
      this.results.violations.push(`Error crítico: ${error.message}`);
      return this.results;
    }
  }

  async runQATests() {
    this.log('Ejecutando tests de QA...', 'info');

    try {
      const output = execSync('npm run qa:concuerdos', {
        encoding: 'utf8',
        cwd: path.join(process.cwd(), '..', '..')
      });

      // Parsear resultados del test
      const successMatch = output.match(/SUCCESS_RATE: (\d+\.?\d*)/);
      const concordanciaMatch = output.match(/CONCORDANCIA_ACCURACY: (\d+\.?\d*)/);
      const structureMatch = output.match(/STRUCTURE_DISTRIBUTION: (\d+\.?\d*)/);
      const errorsMatch = output.match(/ERRORS: (\d+)/);

      const successRate = successMatch ? parseFloat(successMatch[1]) : 0;
      const concordanciaAccuracy = concordanciaMatch ? parseFloat(concordanciaMatch[1]) : 0;
      const structureDistribution = structureMatch ? parseFloat(structureMatch[1]) : 0;
      const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;

      // Verificar umbrales
      if (successRate < THRESHOLDS.minSuccessRate) {
        this.results.violations.push(
          `Tasa de éxito insuficiente: ${successRate.toFixed(2)} < ${THRESHOLDS.minSuccessRate}`
        );
      }

      if (concordanciaAccuracy < THRESHOLDS.minConcordanciaAccuracy) {
        this.results.violations.push(
          `Precisión de concordancias insuficiente: ${concordanciaAccuracy.toFixed(2)} < ${THRESHOLDS.minConcordanciaAccuracy}`
        );
      }

      if (structureDistribution < THRESHOLDS.minStructureDistribution) {
        this.results.violations.push(
          `Distribución de estructuras insuficiente: ${structureDistribution.toFixed(2)} < ${THRESHOLDS.minStructureDistribution}`
        );
      }

      if (errors > THRESHOLDS.maxErrors) {
        this.results.violations.push(
          `Demasiados errores: ${errors} > ${THRESHOLDS.maxErrors}`
        );
      }

      this.log(`Tests completados - Éxito: ${(successRate * 100).toFixed(1)}%`, 'info');

    } catch (error) {
      this.results.violations.push(`Error ejecutando tests de QA: ${error.message}`);
    }
  }

  async checkPerformanceMetrics() {
    this.log('Verificando métricas de rendimiento...', 'info');

    try {
      // Leer métricas desde el endpoint (si está disponible)
      const response = await fetch('http://localhost:3001/api/concuerdos/metrics');
      if (response.ok) {
        const metrics = await response.json();

        const avgTime = metrics.data?.timings?.reduce((a, b) => a + b, 0) / metrics.data?.timings?.length || 0;

        if (avgTime > THRESHOLDS.maxAvgGenerationTime) {
          this.results.violations.push(
            `Tiempo promedio de generación demasiado alto: ${avgTime.toFixed(0)}ms > ${THRESHOLDS.maxAvgGenerationTime}ms`
          );
        }

        this.log(`Rendimiento OK - Tiempo promedio: ${avgTime.toFixed(0)}ms`, 'info');
      } else {
        this.log('No se pudieron obtener métricas de rendimiento', 'warn');
      }
    } catch (error) {
      this.log('Error verificando métricas de rendimiento', 'warn');
    }
  }

  async validateProductionConfig() {
    this.log('Validando configuración de producción...', 'info');

    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'GOOGLE_API_KEY',
      'GEMINI_ENABLED'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      this.results.violations.push(`Variables de entorno faltantes: ${missing.join(', ')}`);
    }

    // Verificar configuración de templates
    if (process.env.TEMPLATE_MODE !== 'family' && process.env.TEMPLATE_MODE !== 'structural') {
      this.results.violations.push('TEMPLATE_MODE debe ser "family" o "structural"');
    }

    if (missing.length === 0) {
      this.log('Configuración de producción validada', 'success');
    }
  }

  calculateScore() {
    const violations = this.results.violations.length;
    const maxScore = 100;

    // Penalización por violación
    const penaltyPerViolation = 20;
    const score = Math.max(0, maxScore - (violations * penaltyPerViolation));

    this.results.score = score;
    this.results.success = violations === 0 && score >= 70;

    // Generar recomendaciones
    if (violations > 0) {
      this.results.recommendations.push('Revisar y corregir las violaciones detectadas');
    }

    if (score < 80) {
      this.results.recommendations.push('Mejorar la calidad del código y tests');
    }

    if (!this.results.success) {
      this.results.recommendations.push('No se permite el despliegue hasta corregir las violaciones críticas');
    }
  }

  generateReport() {
    const report = {
      qa_gate: {
        ...this.results,
        thresholds: THRESHOLDS,
        environment: {
          node_env: process.env.NODE_ENV,
          template_mode: process.env.TEMPLATE_MODE,
          gemini_enabled: process.env.GEMINI_ENABLED === 'true'
        }
      }
    };

    // Guardar reporte
    const reportPath = path.join(process.cwd(), 'qa-gate-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`Reporte guardado en: ${reportPath}`, 'info');

    // Mostrar resultado final
    const status = this.results.success ? 'SUCCESS' : 'FAILURE';
    const color = this.results.success ? 'success' : 'error';

    this.log(`\n🎯 QA GATE RESULTADO: ${status}`, color);
    this.log(`📊 Score: ${this.results.score}/100`, color);

    if (this.results.violations.length > 0) {
      this.log('\n❌ Violaciones encontradas:', 'error');
      this.results.violations.forEach(v => this.log(`  • ${v}`, 'error'));
    }

    if (this.results.recommendations.length > 0) {
      this.log('\n💡 Recomendaciones:', 'info');
      this.results.recommendations.forEach(r => this.log(`  • ${r}`, 'info'));
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const gate = new QAGate();
  gate.run().then(results => {
    process.exit(results.success ? 0 : 1);
  }).catch(error => {
    console.error('Error fatal en QA Gate:', error);
    process.exit(1);
  });
}

export default QAGate;