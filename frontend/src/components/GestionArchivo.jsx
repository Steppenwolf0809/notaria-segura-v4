import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import ListaArchivo from './archivo/ListaArchivo';
import archivoService from '../services/archivo-service';
import useAuth from '../hooks/use-auth';

/**
 * Componente de Gestión de Archivo
 * Vista principal para documentos propios del archivo
 * Solo usa vista de lista (similar a Recepción)
 */
const GestionArchivo = ({ dashboardData, loading, onDataUpdate }) => {
  // Estados para paginación y filtros en servidor
  const [page, setPage] = useState(0); // backend espera 1-indexed, frontend usa 0-indexed para UI
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalDocuments, setTotalDocuments] = useState(0);

  // Auth token
  const { token } = useAuth();

  // Local state for documents
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [error, setError] = useState(null);
  const [documentos, setDocumentos] = useState([]);

  // Filtros iniciales persistidos
  const [filtros, setFiltros] = useState(() => {
    try {
      const saved = sessionStorage.getItem('archivo_lista_filtros');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migramos estructura vieja a nueva si hace falta
        return {
          search: parsed.search ?? '',
          estado: parsed.estado ?? 'TODOS',
          tipo: parsed.tipo ?? 'TODOS'
        };
      }
    } catch (_) { }
    return { search: '', estado: 'TODOS', tipo: 'TODOS' };
  });

  const [orderBy, setOrderBy] = useState('updatedAt');
  const [order, setOrder] = useState('desc');

  /**
   * Cargar documentos propios
   */
  const cargarDocumentos = async (customParams = {}) => {
    if (!token) return;

    setLoadingDocuments(true);
    setError(null);

    // Fusionar estado actual con parámetros custom
    const rPage = customParams.page !== undefined ? customParams.page + 1 : page + 1; // backend 1-based
    const rLimit = customParams.rowsPerPage || rowsPerPage;
    const rFiltros = customParams.filtros || filtros;
    const rOrderBy = customParams.orderBy || orderBy;
    const rOrder = customParams.order || order;

    try {
      const response = await archivoService.getMisDocumentos(token, {
        page: rPage,
        limit: rLimit,
        search: rFiltros.search,
        estado: rFiltros.estado === 'TODOS' ? undefined : rFiltros.estado,
        tipo: rFiltros.tipo === 'TODOS' ? undefined : rFiltros.tipo,
        orderBy: rOrderBy,
        orderDirection: rOrder,
        fechaDesde: rFiltros.fechaDesde || undefined,
        fechaHasta: rFiltros.fechaHasta || undefined,
        // 🆕 Siempre ocultar entregados por defecto (el backend los muestra si filtramos por ENTREGADO)
        ocultarEntregados: true
      });

      if (response.success) {
        setDocumentos(response.data.documentos);
        if (response.data.pagination) {
          setTotalDocuments(response.data.pagination.totalDocuments);
        }
      } else {
        setError(response.message || 'Error cargando documentos');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setLoadingDocuments(false);
    }
  };

  /**
   * Cargar documentos al montar o cambiar dependencias
   * Usamos useEffect para simplificar la carga inicial, 
   * pero los cambios de página/filtro llamarán directamente a cargarDocumentos 
   * para evitar loops o race conditions complejos.
   */
  useEffect(() => {
    cargarDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Solo cargar inicial al tener token, el resto es controlado

  /**
   * Manejadores de cambios
   */
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    cargarDocumentos({ page: newPage });
  };

  const handleRowsPerPageChange = (event) => {
    const newRows = parseInt(event.target.value, 10);
    setRowsPerPage(newRows);
    setPage(0);
    cargarDocumentos({ rowsPerPage: newRows, page: 0 });
  };

  const handleFilterChange = (newFiltros) => {
    setFiltros(newFiltros);
    // Persistencia
    try {
      sessionStorage.setItem('archivo_lista_filtros', JSON.stringify(newFiltros));
    } catch (_) { }

    setPage(0);
    cargarDocumentos({ filtros: newFiltros, page: 0 });
  };

  const handleSortChange = (property, direction) => {
    setOrderBy(property);
    setOrder(direction);
    cargarDocumentos({ orderBy: property, order: direction });
  };

  const handleRefresh = () => {
    cargarDocumentos();
    if (onDataUpdate) onDataUpdate();
  };

  /**
   * Cambiar estado de un documento (Prop pasada a ListaArchivo)
   */
  const handleEstadoChange = async (documentoId, nuevoEstado, options = {}) => {
    try {
      const response = await archivoService.cambiarEstadoDocumento(token, documentoId, nuevoEstado, options);
      if (response.success) {
        // Recargar o actualizar localmente
        cargarDocumentos();
      }
      return response;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const clearError = () => setError(null);

  /**
   * Renderizar contenido principal
   */
  const renderContent = () => {
    if (loadingDocuments && documentos.length === 0) {
      // Solo mostrar loader full si no hay documentos previos (carga inicial)
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando documentos...</Typography>
        </Box>
      );
    }

    if (error && documentos.length === 0) {
      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => cargarDocumentos()}
            >
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      );
    }

    // Solo vista de lista con server-side pagination
    return (
      <ListaArchivo
        documentos={documentos}
        onEstadoChange={handleEstadoChange}
        onRefresh={handleRefresh}
        // Server side props
        serverSide={true}
        totalDocuments={totalDocuments}
        loading={loadingDocuments}
        // Props de estado
        pageProp={page}
        rowsPerPageProp={rowsPerPage}
        filtrosProp={filtros}
        orderByProp={orderBy}
        orderProp={order}
        // Handlers
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
      />
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      {/* Header simplificado */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          📄 Gestión de Documentos
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Vista unificada para gestionar, agrupar y entregar documentos.
        </Typography>
      </Box>

      {/* Error Global */}
      {error && (
        <Alert
          severity="error"
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Contenido principal */}
      {renderContent()}
    </Box>
  );
};

export default GestionArchivo;
