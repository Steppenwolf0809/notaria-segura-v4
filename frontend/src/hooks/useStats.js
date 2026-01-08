import { useMemo } from 'react';
import useDocumentStore from '../store/document-store';

/**
 * Hook personalizado para estadísticas y métricas del dashboard
 * Proporciona métricas avanzadas y KPIs para el rol Matrizador
 */
const useStats = () => {
  const { documents, getDocumentsByStatus, stats: storedStats, totalDocuments } = useDocumentStore();

  /**
   * Métricas básicas calculadas en tiempo real o desde backend
   */
  const basicStats = useMemo(() => {
    // Si tenemos stats del backend (server-side pagination active)
    if (storedStats && Array.isArray(storedStats)) {
      const statsMap = storedStats.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {});

      return {
        total: totalDocuments || documents.length, // Prefer store total
        PENDIENTE: statsMap['PENDIENTE'] || 0,
        EN_PROCESO: statsMap['EN_PROCESO'] || 0,
        LISTO: statsMap['LISTO'] || 0,
        ENTREGADO: statsMap['ENTREGADO'] || 0
      };
    }

    // Fallback: cálculo local (solo correcto si todos los docs están cargados)
    const stats = {
      total: documents.length,
      PENDIENTE: documents.filter(d => d.status === 'PENDIENTE').length,
      EN_PROCESO: documents.filter(d => d.status === 'EN_PROCESO').length,
      LISTO: documents.filter(d => d.status === 'LISTO').length,
      ENTREGADO: documents.filter(d => d.status === 'ENTREGADO').length
    };

    return stats;
  }, [documents, storedStats, totalDocuments]);

  /**
   * Métricas avanzadas para el dashboard ejecutivo
   */
  const advancedMetrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Documentos por estado
    const inProgress = getDocumentsByStatus('EN_PROCESO');
    const ready = getDocumentsByStatus('LISTO');
    const delivered = getDocumentsByStatus('ENTREGADO');
    const pending = getDocumentsByStatus('PENDIENTE');

    // Documentos que requieren atención (más de 2 días en proceso)
    const needAttention = inProgress.filter(doc => {
      const docDate = new Date(doc.createdAt);
      const daysDiff = Math.floor((now - docDate) / (1000 * 60 * 60 * 24));
      return daysDiff > 2;
    });

    // Documentos de hoy
    const todayDocs = documents.filter(doc => {
      const docDate = new Date(doc.createdAt);
      return docDate >= today;
    });

    // Documentos de ayer
    const yesterdayDocs = documents.filter(doc => {
      const docDate = new Date(doc.createdAt);
      return docDate >= yesterday && docDate < today;
    });

    // Documentos de la semana
    const weekDocs = documents.filter(doc => {
      const docDate = new Date(doc.createdAt);
      return docDate >= weekAgo;
    });

    // Tiempo promedio de procesamiento (simulado por ahora)
    const avgProcessingTime = inProgress.length > 0 ? 2.5 : 0;

    // Productividad (porcentaje de documentos completados)
    const productivity = Math.round((delivered.length / Math.max(basicStats.total, 1)) * 100);

    // Eficiencia (documentos listos vs en proceso)
    const efficiency = inProgress.length > 0 ?
      Math.round((ready.length / (ready.length + inProgress.length)) * 100) :
      100;

    // Tendencias (comparación con períodos anteriores)
    const trends = {
      daily: todayDocs.length - yesterdayDocs.length,
      weekly: weekDocs.length,
      productivity: productivity > 75 ? 'high' : productivity > 50 ? 'medium' : 'low'
    };

    return {
      needAttention,
      todayDocs,
      yesterdayDocs,
      weekDocs,
      avgProcessingTime,
      productivity,
      efficiency,
      trends,
      // Documentos por prioridad
      urgent: needAttention,
      normal: inProgress.filter(doc => !needAttention.includes(doc)),
      completed: delivered
    };
  }, [documents, getDocumentsByStatus]);

  /**
   * KPIs específicos para widgets del dashboard
   */
  const kpiMetrics = useMemo(() => {
    const { productivity, efficiency, avgProcessingTime, needAttention } = advancedMetrics;

    return {
      // KPI Principal: Total de documentos activos
      totalActive: {
        value: basicStats.total,
        label: 'Total Documentos',
        trend: advancedMetrics.trends.daily,
        status: basicStats.total > 0 ? 'active' : 'empty'
      },

      // KPI: Documentos en proceso
      inProgress: {
        value: basicStats.EN_PROCESO,
        label: 'En Proceso',
        trend: basicStats.EN_PROCESO > 0 ? 'En progreso' : 'Sin pendientes',
        status: basicStats.EN_PROCESO > 0 ? 'working' : 'clear',
        urgent: needAttention.length
      },

      // KPI: Listos para entrega
      readyForDelivery: {
        value: basicStats.LISTO,
        label: 'Listos para Entrega',
        trend: basicStats.LISTO > 0 ? 'Para notificar' : 'Ninguno listo',
        status: basicStats.LISTO > 0 ? 'ready' : 'none',
        actionRequired: basicStats.LISTO > 0
      },

      // KPI: Tiempo promedio
      avgTime: {
        value: `${avgProcessingTime} días`,
        label: 'Tiempo Promedio',
        numericValue: avgProcessingTime,
        status: avgProcessingTime <= 2 ? 'excellent' : avgProcessingTime <= 3 ? 'good' : 'slow'
      },

      // KPIs adicionales
      productivity: {
        value: `${productivity}%`,
        numericValue: productivity,
        label: 'Productividad',
        status: productivity >= 80 ? 'excellent' : productivity >= 60 ? 'good' : 'needs_improvement'
      },

      efficiency: {
        value: `${efficiency}%`,
        numericValue: efficiency,
        label: 'Eficiencia',
        status: efficiency >= 80 ? 'excellent' : efficiency >= 60 ? 'good' : 'needs_improvement'
      }
    };
  }, [basicStats, advancedMetrics]);

  /**
   * Alertas y notificaciones importantes
   */
  const alerts = useMemo(() => {
    const alertList = [];

    // Alerta por documentos atrasados
    if (advancedMetrics.needAttention.length > 0) {
      alertList.push({
        type: 'warning',
        title: 'Documentos Requieren Atención',
        message: `${advancedMetrics.needAttention.length} documentos llevan más de 2 días en proceso`,
        action: 'review_documents',
        priority: 'high'
      });
    }

    // Alerta por documentos listos para notificar
    if (basicStats.LISTO > 0) {
      alertList.push({
        type: 'info',
        title: 'Documentos Listos',
        message: `${basicStats.LISTO} documentos están listos para notificar al cliente`,
        action: 'notify_clients',
        priority: 'medium'
      });
    }

    // Alerta por alta productividad
    if (kpiMetrics.productivity.numericValue >= 90) {
      alertList.push({
        type: 'success',
        title: 'Excelente Productividad',
        message: `Tienes un ${kpiMetrics.productivity.value} de productividad`,
        action: 'none',
        priority: 'low'
      });
    }

    return alertList;
  }, [advancedMetrics, basicStats, kpiMetrics]);

  /**
   * Datos para gráficos y visualizaciones
   */
  const chartData = useMemo(() => {
    return {
      // Datos para gráfico de barras de estados
      statusDistribution: [
        { label: 'Pendientes', value: basicStats.PENDIENTE, color: '#f59e0b' },
        { label: 'En Proceso', value: basicStats.EN_PROCESO, color: '#3b82f6' },
        { label: 'Listos', value: basicStats.LISTO, color: '#10b981' },
        { label: 'Entregados', value: basicStats.ENTREGADO, color: '#6b7280' }
      ],

      // Datos para gráfico de progreso
      progressData: {
        completed: basicStats.ENTREGADO,
        total: basicStats.total,
        percentage: kpiMetrics.productivity.numericValue
      },

      // Datos para timeline de actividad
      timelineData: {
        today: advancedMetrics.todayDocs.length,
        yesterday: advancedMetrics.yesterdayDocs.length,
        week: advancedMetrics.weekDocs.length
      }
    };
  }, [basicStats, kpiMetrics, advancedMetrics]);

  return {
    // Estadísticas básicas
    basicStats,

    // Métricas avanzadas
    advancedMetrics,

    // KPIs para dashboard
    kpiMetrics,

    // Alertas importantes
    alerts,

    // Datos para gráficos
    chartData,

    // Funciones de utilidad
    utils: {
      getStatusColor: (status) => {
        const colors = {
          PENDIENTE: '#f59e0b',
          EN_PROCESO: '#3b82f6',
          LISTO: '#10b981',
          ENTREGADO: '#6b7280'
        };
        return colors[status] || '#6b7280';
      },

      formatDaysAgo: (date) => {
        const now = new Date();
        const docDate = new Date(date);
        const daysDiff = Math.floor((now - docDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) return 'Hoy';
        if (daysDiff === 1) return 'Ayer';
        return `Hace ${daysDiff} días`;
      },

      getUrgencyLevel: (document) => {
        const daysDiff = Math.floor((new Date() - new Date(document.createdAt)) / (1000 * 60 * 60 * 24));

        if (daysDiff > 3) return 'urgent';
        if (daysDiff > 1) return 'medium';
        return 'normal';
      }
    }
  };
};

export default useStats;