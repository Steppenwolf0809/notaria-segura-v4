// Servicio fino que reutiliza receptionService para consultas con paginación fija y filtros por pestaña
import receptionService from '../../../services/reception-service';
import documentService from '../../../services/document-service';
import archivoService from '../../../services/archivo-service';

export type DocStatus = 'EN_PROCESO' | 'LISTO' | 'ENTREGADO';

export interface ListParams {
  page: number; // 1-based
  limit?: number; // default 25
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  matrizador?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PagedResult<T> {
  documents: T[];
  total: number;
  totalPages: number;
}

export const PAGE_SIZE = 25;

export async function fetchTrabajo(params: ListParams): Promise<PagedResult<any>> {
  const base = {
    page: String(params.page),
    limit: String(params.limit ?? PAGE_SIZE),
    sortBy: params.sortBy ?? 'createdAt',
    sortOrder: params.sortOrder ?? 'desc'
  } as any;
  if (params.search) base.search = params.search;
  if (params.matrizador) base.matrizador = params.matrizador;
  if (params.fechaDesde) base.fechaDesde = params.fechaDesde;
  if (params.fechaHasta) base.fechaHasta = params.fechaHasta;

  const result = await receptionService.getTodosDocumentos(base);
  if (!result.success) throw new Error(result.error || 'Error cargando documentos');

  const docsAll = result.data.documents || [];
  const documents = docsAll.filter((d: any) => d.status === 'EN_PROCESO' || d.status === 'LISTO');

  // obtener totales por estado igual que Recepción
  const [enProcesoCountRes, listoCountRes] = await Promise.all([
    receptionService.getTodosDocumentos({ ...base, page: '1', limit: '1', estado: 'EN_PROCESO' }),
    receptionService.getTodosDocumentos({ ...base, page: '1', limit: '1', estado: 'LISTO' })
  ]);
  const totalEnProceso = enProcesoCountRes.success ? (enProcesoCountRes.data.pagination?.total || 0) : 0;
  const totalListo = listoCountRes.success ? (listoCountRes.data.pagination?.total || 0) : 0;
  const total = totalEnProceso + totalListo;

  return {
    documents,
    total,
    totalPages: Math.max(1, Math.ceil(total / (params.limit ?? PAGE_SIZE)))
  };
}

export async function fetchListo(params: ListParams): Promise<PagedResult<any>> {
  const base = {
    page: String(params.page),
    limit: String(params.limit ?? PAGE_SIZE),
    sortBy: params.sortBy ?? 'createdAt',
    sortOrder: params.sortOrder ?? 'desc',
    estado: 'LISTO'
  } as any;
  if (params.search) base.search = params.search;
  if (params.matrizador) base.matrizador = params.matrizador;
  if (params.fechaDesde) base.fechaDesde = params.fechaDesde;
  if (params.fechaHasta) base.fechaHasta = params.fechaHasta;

  const result = await receptionService.getTodosDocumentos(base);
  if (!result.success) throw new Error(result.error || 'Error cargando documentos');

  const pag = result.data.pagination || {};
  return {
    documents: result.data.documents || [],
    total: Number(pag.total || 0),
    totalPages: Number(pag.totalPages || Math.ceil((Number(pag.total || 0)) / (params.limit ?? PAGE_SIZE))) || 1
  };
}

export async function fetchEntregado(params: ListParams): Promise<PagedResult<any>> {
  const base = {
    page: String(params.page),
    limit: String(params.limit ?? PAGE_SIZE),
    sortBy: params.sortBy ?? 'createdAt',
    sortOrder: params.sortOrder ?? 'desc',
    estado: 'ENTREGADO'
  } as any;
  if (params.search) base.search = params.search;
  if (params.matrizador) base.matrizador = params.matrizador;
  if (params.fechaDesde) base.fechaDesde = params.fechaDesde;
  if (params.fechaHasta) base.fechaHasta = params.fechaHasta;

  const result = await receptionService.getTodosDocumentos(base);
  if (result.success) {
    const pag = result.data.pagination || {};
    return {
      documents: result.data.documents || [],
      total: Number(pag.total || 0),
      totalPages: Number(pag.totalPages || Math.ceil((Number(pag.total || 0)) / (params.limit ?? PAGE_SIZE))) || 1
    };
  }

  // fallback sin search y filtro local (igual a Recepción)
  const { search, ...rest } = base;
  delete (rest as any).search;
  const fbRes = await receptionService.getTodosDocumentos(rest);
  if (fbRes && fbRes.success) {
    const allDocs = fbRes.data.documents || [];
    const term = (params.search || '').toString().toLowerCase();
    const matches = (value: any) => (value || '').toString().toLowerCase().includes(term);
    const filtered = term
      ? allDocs.filter((d: any) => matches(d.clientName) || matches(d.protocolNumber) || matches(d.clientId) || matches(d.actoPrincipalDescripcion) || matches(d.detalle_documento))
      : allDocs;
    return { documents: filtered, total: filtered.length, totalPages: 1 };
  }
  throw new Error(fbRes?.error || 'Error cargando entregados');
}

// =========================
// Endpoints por rol
// =========================

// Helper para leer token del storage (para archivo-service.getMisDocumentos)
function getToken(): string | null {
  const authData = localStorage.getItem('notaria-auth-storage');
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      return parsed.state?.token || null;
    } catch {}
  }
  const token = localStorage.getItem('token');
  return token;
}

// MATRIZADOR: usar /documents/my-documents (paginado y con estados)
export async function fetchTrabajoMatrizador(params: ListParams): Promise<PagedResult<any>> {
  const res = await documentService.getMyDocumentsPaged({
    states: 'EN_PROCESO,LISTO',
    q: params.search || '',
    page: params.page,
    limit: params.limit ?? PAGE_SIZE
  });
  if (!res.success) throw new Error(res.error || 'Error cargando documentos');
  const docs = res.data?.documents || [];
  const pag = res.data?.pagination || {};
  return {
    documents: docs,
    total: Number(pag.total || 0),
    totalPages: Number(pag.totalPages || Math.ceil((Number(pag.total || 0)) / (params.limit ?? PAGE_SIZE))) || 1
  };
}

export async function fetchListoMatrizador(params: ListParams): Promise<PagedResult<any>> {
  const res = await documentService.getMyDocumentsPaged({
    states: 'LISTO',
    q: params.search || '',
    page: params.page,
    limit: params.limit ?? PAGE_SIZE
  });
  if (!res.success) throw new Error(res.error || 'Error cargando documentos');
  const docs = res.data?.documents || [];
  const pag = res.data?.pagination || {};
  return {
    documents: docs,
    total: Number(pag.total || 0),
    totalPages: Number(pag.totalPages || Math.ceil((Number(pag.total || 0)) / (params.limit ?? PAGE_SIZE))) || 1
  };
}

export async function fetchEntregadoMatrizador(params: ListParams): Promise<PagedResult<any>> {
  const res = await documentService.getMyDocumentsPaged({
    states: 'ENTREGADO',
    q: params.search || '',
    page: params.page,
    limit: params.limit ?? PAGE_SIZE
  });
  if (!res.success) throw new Error(res.error || 'Error cargando documentos');
  const docs = res.data?.documents || [];
  const pag = res.data?.pagination || {};
  return {
    documents: docs,
    total: Number(pag.total || 0),
    totalPages: Number(pag.totalPages || Math.ceil((Number(pag.total || 0)) / (params.limit ?? PAGE_SIZE))) || 1
  };
}

// ARCHIVO: usar /archivo/mis-documentos (token explícito)
export async function fetchTrabajoArchivo(params: ListParams): Promise<PagedResult<any>> {
  const token = getToken();
  const baseParams: any = {
    page: String(params.page),
    limit: String(params.limit ?? PAGE_SIZE)
  };
  if (params.search) baseParams.search = params.search;

  // Cargar página general y filtrar estados (EN_PROCESO, LISTO)
  const res = await archivoService.getMisDocumentos(token, baseParams);
  if (res?.success !== true) throw new Error(res?.message || 'Error cargando documentos');
  const all = res.data?.documents || res.data?.items || res.data || [];
  const documents = (all as any[]).filter(d => d.status === 'EN_PROCESO' || d.status === 'LISTO');

  // Totales por estado
  const [enProcesoRes, listoRes] = await Promise.all([
    archivoService.getMisDocumentos(token, { ...baseParams, page: '1', limit: '1', estado: 'EN_PROCESO' }),
    archivoService.getMisDocumentos(token, { ...baseParams, page: '1', limit: '1', estado: 'LISTO' })
  ]);
  const totalEnProceso = enProcesoRes?.success ? (enProcesoRes.data?.pagination?.total || enProcesoRes.data?.total || 0) : 0;
  const totalListo = listoRes?.success ? (listoRes.data?.pagination?.total || listoRes.data?.total || 0) : 0;
  const total = totalEnProceso + totalListo;

  return {
    documents,
    total,
    totalPages: Math.max(1, Math.ceil(total / (params.limit ?? PAGE_SIZE)))
  };
}

export async function fetchListoArchivo(params: ListParams): Promise<PagedResult<any>> {
  const token = getToken();
  const baseParams: any = {
    page: String(params.page),
    limit: String(params.limit ?? PAGE_SIZE),
    estado: 'LISTO'
  };
  if (params.search) baseParams.search = params.search;
  const res = await archivoService.getMisDocumentos(token, baseParams);
  if (res?.success !== true) throw new Error(res?.message || 'Error cargando documentos');
  const docs = res.data?.documents || res.data?.items || res.data || [];
  const pag = res.data?.pagination || {};
  const total = Number(pag.total || res.data?.total || docs.length || 0);
  return { documents: docs, total, totalPages: Number(pag.totalPages || Math.ceil(total / (params.limit ?? PAGE_SIZE))) || 1 };
}

export async function fetchEntregadoArchivo(params: ListParams): Promise<PagedResult<any>> {
  const token = getToken();
  const baseParams: any = {
    page: String(params.page),
    limit: String(params.limit ?? PAGE_SIZE),
    estado: 'ENTREGADO'
  };
  if (params.search) baseParams.search = params.search;
  const res = await archivoService.getMisDocumentos(token, baseParams);
  if (res?.success !== true) throw new Error(res?.message || 'Error cargando documentos');
  const docs = res.data?.documents || res.data?.items || res.data || [];
  const pag = res.data?.pagination || {};
  const total = Number(pag.total || res.data?.total || docs.length || 0);
  return { documents: docs, total, totalPages: Number(pag.totalPages || Math.ceil(total / (params.limit ?? PAGE_SIZE))) || 1 };
}


