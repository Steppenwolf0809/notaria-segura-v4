import express from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRoles } from '../middleware/auth-middleware.js';
import AlertasService from '../services/alertas-service.js';
import { withRequestTenantContext } from '../utils/tenant-context.js';

const router = express.Router();

/**
 * RUTAS DE ALERTAS - Sistema de Alertas por Rol
 * Gestiona alertas inteligentes según tiempos críticos por rol
 */

/**
 * @route GET /api/alertas/recepcion
 * @desc Obtener alertas de documentos LISTO sin entregar para RECEPCIÓN
 * @access Private (RECEPCION, ADMIN)
 */
router.get('/recepcion', 
  authenticateToken, 
  requireRoles(['RECEPCION', 'ADMIN']),
  async (req, res) => {
    try {
      const alertas = await withRequestTenantContext(prisma, req, async (tx) => {
        return AlertasService.getAlertasRecepcion(tx);
      });
      res.json(alertas);
    } catch (error) {
      console.error('Error en endpoint alertas recepción:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        data: {
          alertas: [],
          stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0, documentosListo: 0 }
        }
      });
    }
  }
);

/**
 * @route GET /api/alertas/matrizador
 * @desc Obtener alertas de documentos asignados sin procesar para MATRIZADOR
 * @access Private (MATRIZADOR, ADMIN)
 */
router.get('/matrizador', 
  authenticateToken, 
  requireRoles(['MATRIZADOR', 'ADMIN']),
  async (req, res) => {
    try {
      const matrizadorId = req.user.role === 'ADMIN' ? req.query.matrizadorId : req.user.id;
      
      if (!matrizadorId) {
        return res.status(400).json({
          success: false,
          error: 'ID de matrizador requerido',
          data: {
            alertas: [],
            stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0, documentosEnProceso: 0 }
          }
        });
      }

      const alertas = await withRequestTenantContext(prisma, req, async (tx) => {
        return AlertasService.getAlertasMatrizador(parseInt(matrizadorId), tx);
      });
      res.json(alertas);
    } catch (error) {
      console.error('Error en endpoint alertas matrizador:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        data: {
          alertas: [],
          stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0, documentosEnProceso: 0 }
        }
      });
    }
  }
);

/**
 * @route GET /api/alertas/archivo
 * @desc Obtener alertas de documentos asignados por tiempo para ARCHIVO
 * @access Private (ARCHIVO, ADMIN)
 */
router.get('/archivo', 
  authenticateToken, 
  requireRoles(['ARCHIVO', 'ADMIN']),
  async (req, res) => {
    try {
      const archivoId = req.user.role === 'ADMIN' ? req.query.archivoId : req.user.id;
      
      if (!archivoId) {
        return res.status(400).json({
          success: false,
          error: 'ID de archivo requerido',
          data: {
            alertas: [],
            stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0 }
          }
        });
      }

      const alertas = await withRequestTenantContext(prisma, req, async (tx) => {
        return AlertasService.getAlertasArchivo(parseInt(archivoId), tx);
      });
      res.json(alertas);
    } catch (error) {
      console.error('Error en endpoint alertas archivo:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        data: {
          alertas: [],
          stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0 }
        }
      });
    }
  }
);

/**
 * @route GET /api/alertas/admin
 * @desc Obtener vista global consolidada de alertas para ADMIN
 * @access Private (ADMIN only)
 */
router.get('/admin', 
  authenticateToken, 
  requireRoles(['ADMIN']),
  async (req, res) => {
    try {
      const alertas = await withRequestTenantContext(prisma, req, async (tx) => {
        return AlertasService.getAlertasAdmin(tx);
      });
      res.json(alertas);
    } catch (error) {
      console.error('Error en endpoint alertas admin:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        data: {
          alertas: [],
          stats: { 
            total: 0, 
            criticas: 0, 
            urgentes: 0, 
            atencion: 0,
            estadisticasGlobales: { total: 0, pendientes: 0, enProceso: 0, listos: 0, entregados: 0 }
          }
        }
      });
    }
  }
);

/**
 * @route GET /api/alertas/resumen
 * @desc Obtener resumen de alertas para el rol actual (para badges/contadores)
 * @access Private (Todos los roles)
 */
router.get('/resumen', 
  authenticateToken,
  async (req, res) => {
    try {
      const supportedRoles = new Set(['RECEPCION', 'MATRIZADOR', 'ARCHIVO', 'ADMIN']);
      if (!supportedRoles.has(req.user.role)) {
        return res.json({
          success: true,
          data: {
            stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0 },
            ultimaActualizacion: new Date()
          }
        });
      }

      const alertas = await withRequestTenantContext(prisma, req, async (tx) => {
        switch (req.user.role) {
          case 'RECEPCION':
            return AlertasService.getAlertasRecepcion(tx);
          case 'MATRIZADOR':
            return AlertasService.getAlertasMatrizador(req.user.id, tx);
          case 'ARCHIVO':
            return AlertasService.getAlertasArchivo(req.user.id, tx);
          case 'ADMIN':
            return AlertasService.getAlertasAdmin(tx);
          default:
            return {
              success: true,
              data: {
                stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0 },
                ultimaActualizacion: new Date()
              }
            };
        }
      });

      // Devolver solo stats para rendimiento
      res.json({
        success: alertas.success,
        data: {
          stats: alertas.data.stats,
          ultimaActualizacion: alertas.data.ultimaActualizacion
        }
      });

    } catch (error) {
      console.error('Error en endpoint resumen alertas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        data: {
          stats: { total: 0, criticas: 0, urgentes: 0, atencion: 0 }
        }
      });
    }
  }
);

/**
 * @route GET /api/alertas/calculate-level
 * @desc Calcular nivel de alerta para días específicos y rol (utilidad para frontend)
 * @access Private (Todos los roles)
 */
router.get('/calculate-level', 
  authenticateToken,
  async (req, res) => {
    try {
      const { dias, rol } = req.query;
      
      if (!dias || !rol) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros dias y rol requeridos'
        });
      }

      const nivel = AlertasService.calculateAlertLevel(parseInt(dias), rol.toUpperCase());
      const mensaje = AlertasService.generarMensajeAlerta(rol.toUpperCase(), nivel, parseInt(dias));

      res.json({
        success: true,
        data: {
          nivel,
          mensaje,
          dias: parseInt(dias),
          rol: rol.toUpperCase()
        }
      });

    } catch (error) {
      console.error('Error calculando nivel de alerta:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

export default router;
